import type { ChestConfig, Column } from "../types.ts";
import { getColumnInnerHeight } from "./carcass.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SlidePosition {
  rowId: string;
  rowIndex: number;
  distanceFromBottom: number;
}

export interface JigZone {
  type: "spacer" | "gap";
  startY: number; // distance from bottom of inner panel (inches)
  height: number; // zone height (inches)
}

export interface JigPanelSegment {
  segmentIndex: number;
  startY: number; // Y-offset from bottom (inches)
  height: number; // segment height (inches)
  sideAZones: JigZone[]; // clipped zones for Z- face, startY relative to segment
  sideBZones: JigZone[]; // clipped zones for Z+ face, startY relative to segment
}

export interface JigPanelLayout {
  panelLabel: string;
  panelIndex: number;
  panelThickness: number; // inches
  panelHeight: number; // inches
  sideAZones: JigZone[]; // full zones for Z- face
  sideBZones: JigZone[]; // full zones for Z+ face
  segments: JigPanelSegment[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Physical height of the drawer slide profile (45mm in inches). */
const SLIDE_PROFILE_HEIGHT = 45 / 25.4;

/** Max print bed dimension in inches (240mm). */
const MAX_SEGMENT_HEIGHT = 240 / 25.4;

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Compute slide mounting positions for a column, measured from the bottom
 * of the inner panel. Extracted from SlideLayoutView.tsx.
 */
export function computeSlidePositions(
  column: Column,
  config: ChestConfig,
): SlidePosition[] {
  const { rows } = column;
  if (rows.length === 0) return [];

  const reversed = [...rows].reverse();
  const railThickness = config.horizontalRails.enabled
    ? config.horizontalRails.thickness.actual
    : 0;

  const positions: SlidePosition[] = [];
  let cumulative = 0;

  for (const [i, row] of reversed.entries()) {
    const originalIndex = rows.length - 1 - i;
    positions.push({
      rowId: row.id,
      rowIndex: originalIndex,
      distanceFromBottom: cumulative,
    });
    cumulative += row.openingHeight;
    if (i < reversed.length - 1) {
      cumulative += railThickness;
    }
  }

  return positions;
}

/**
 * Walk bottom-to-top creating spacer zones (non-slide regions) and gap zones
 * (where slides mount). The gap height equals the slide profile height.
 *
 * @param panelHeight - If provided, zones fill to this height (for panels
 *   taller than the column, e.g. dividers in a mixed-height chest).
 */
export function computeJigZones(
  column: Column,
  config: ChestConfig,
  panelHeight?: number,
): JigZone[] {
  const colHeight = getColumnInnerHeight(column, config);
  const effectiveHeight = panelHeight ?? colHeight;
  const positions = computeSlidePositions(column, config);

  // Sort by distanceFromBottom ascending
  const sorted = [...positions].sort(
    (a, b) => a.distanceFromBottom - b.distanceFromBottom,
  );

  const zones: JigZone[] = [];
  let cursor = 0;

  for (const pos of sorted) {
    const slideBottom = pos.distanceFromBottom;
    const slideHeight = Math.min(
      SLIDE_PROFILE_HEIGHT,
      effectiveHeight - slideBottom,
    );

    // Spacer zone from cursor to slide bottom
    if (slideBottom > cursor) {
      zones.push({
        type: "spacer",
        startY: cursor,
        height: slideBottom - cursor,
      });
    }

    // Gap zone for the slide
    if (slideHeight > 0) {
      zones.push({
        type: "gap",
        startY: slideBottom,
        height: slideHeight,
      });
    }

    cursor = slideBottom + slideHeight;
  }

  // Final spacer zone from last slide top to panel top
  if (cursor < effectiveHeight) {
    zones.push({
      type: "spacer",
      startY: cursor,
      height: effectiveHeight - cursor,
    });
  }

  return zones;
}

/** Clip a zone array to a segment boundary, making startY relative to segment. */
function clipZones(
  zones: JigZone[],
  segStartY: number,
  segEndY: number,
): JigZone[] {
  const clipped: JigZone[] = [];
  for (const zone of zones) {
    const zoneEnd = zone.startY + zone.height;
    if (zoneEnd <= segStartY || zone.startY >= segEndY) continue;
    const clippedStart = Math.max(zone.startY, segStartY);
    const clippedEnd = Math.min(zoneEnd, segEndY);
    clipped.push({
      type: zone.type,
      startY: clippedStart - segStartY,
      height: clippedEnd - clippedStart,
    });
  }
  return clipped;
}

/**
 * Minimum margin (inches) to keep between a segment cut and the nearest
 * spacer edge. Prevents fragile slivers at segment boundaries.
 */
const CUT_MARGIN = 2 / 25.4;

interface Range {
  start: number;
  end: number;
}

/**
 * Find Y ranges (inches) where a segment cut is safe — the cut falls
 * within gap zones on all sides that have teeth, keeping CUT_MARGIN away
 * from spacer edges to avoid fragile slivers.
 */
function findSafeCutRanges(
  sideAZones: JigZone[],
  sideBZones: JigZone[],
  panelHeight: number,
): Range[] {
  function gapRanges(zones: JigZone[]): Range[] {
    if (zones.length === 0) {
      // No zones = continuous wall with no teeth; all positions safe.
      return [{ start: 0, end: panelHeight }];
    }
    return zones
      .filter((z) => z.type === "gap")
      .map((z) => ({ start: z.startY, end: z.startY + z.height }));
  }

  const aGaps = gapRanges(sideAZones);
  const bGaps = gapRanges(sideBZones);

  // Intersect the two sorted range lists
  const intersected: Range[] = [];
  let ai = 0;
  let bi = 0;
  while (ai < aGaps.length && bi < bGaps.length) {
    const a = aGaps[ai];
    const b = bGaps[bi];
    if (!a || !b) break;
    const lo = Math.max(a.start, b.start);
    const hi = Math.min(a.end, b.end);
    if (hi > lo) intersected.push({ start: lo, end: hi });
    if (a.end < b.end) ai++;
    else bi++;
  }

  // Shrink each range by CUT_MARGIN on each side so the full joint
  // region fits within the gap.
  return intersected
    .map((r) => ({ start: r.start + CUT_MARGIN, end: r.end - CUT_MARGIN }))
    .filter((r) => r.end > r.start);
}

/**
 * Split two-sided zones into segments that fit within the max print bed
 * size (240mm). Segment boundaries are placed in gap zones whenever
 * possible so the shiplap joint doesn't weaken spacer attachment.
 * Each segment's zones have startY relative to the segment.
 */
function computeJigPanelSegments(
  panelHeight: number,
  sideAZones: JigZone[],
  sideBZones: JigZone[],
): JigPanelSegment[] {
  if (panelHeight <= 0) return [];

  // Single segment — no cuts needed.
  if (panelHeight <= MAX_SEGMENT_HEIGHT) {
    return [
      {
        segmentIndex: 0,
        startY: 0,
        height: panelHeight,
        sideAZones: clipZones(sideAZones, 0, panelHeight),
        sideBZones: clipZones(sideBZones, 0, panelHeight),
      },
    ];
  }

  const safeRanges = findSafeCutRanges(sideAZones, sideBZones, panelHeight);

  // Greedily select cuts from bottom to top.
  const cuts: number[] = [];
  let cursor = 0;

  for (;;) {
    const remaining = panelHeight - cursor;
    if (remaining <= MAX_SEGMENT_HEIGHT) break; // last segment fits

    const neededCuts = Math.ceil(remaining / MAX_SEGMENT_HEIGHT) - 1;
    const idealSegHeight = remaining / (neededCuts + 1);
    const idealCut = cursor + idealSegHeight;
    const maxCut = cursor + MAX_SEGMENT_HEIGHT;
    // Minimum cut position so the rest still fits in neededCuts segments.
    const minCut = panelHeight - neededCuts * MAX_SEGMENT_HEIGHT;

    // Find the safe range whose center is closest to the ideal cut.
    let bestCut: number | null = null;
    let bestDist = Infinity;

    for (const range of safeRanges) {
      const lo = Math.max(range.start, minCut);
      const hi = Math.min(range.end, maxCut);
      if (hi <= lo) continue;

      const center = (lo + hi) / 2;
      const dist = Math.abs(center - idealCut);
      if (dist < bestDist) {
        bestDist = dist;
        bestCut = center;
      }
    }

    if (bestCut !== null) {
      cuts.push(bestCut);
      cursor = bestCut;
    } else {
      // No safe position available — fall back to ideal even split.
      cuts.push(idealCut);
      cursor = idealCut;
    }
  }

  // Build segments from boundaries.
  const boundaries = [0, ...cuts, panelHeight];
  const segments: JigPanelSegment[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const startY = boundaries[i] ?? 0;
    const endY = boundaries[i + 1] ?? 0;
    segments.push({
      segmentIndex: i,
      startY,
      height: endY - startY,
      sideAZones: clipZones(sideAZones, startY, endY),
      sideBZones: clipZones(sideBZones, startY, endY),
    });
  }

  return segments;
}

/**
 * Compute jig panel layouts for every panel in the chest.
 *
 * Panels:
 *   - Side panels (one-sided): zones on one face, other face continuous wall
 *   - Dividers (two-sided): different zones per face so both sets of slides
 *     can be mounted before removing the jig
 */
export function computeAllJigPanelLayouts(
  config: ChestConfig,
): JigPanelLayout[] {
  const { columns, woodAssignments } = config;
  const N = columns.length;
  if (N === 0) return [];

  const carcassInnerHeight = Math.max(
    ...columns.map((col) => getColumnInnerHeight(col, config)),
  );

  const panels: JigPanelLayout[] = [];

  const firstCol = columns[0];
  if (!firstCol) return panels;

  // Left side panel — slides on sideA (inside face)
  const leftSideA = computeJigZones(firstCol, config, carcassInnerHeight);
  panels.push({
    panelLabel: N > 1 ? "Left Side" : "Side Panel",
    panelIndex: 0,
    panelThickness: woodAssignments.carcassSides.actual,
    panelHeight: carcassInnerHeight,
    sideAZones: leftSideA,
    sideBZones: [],
    segments: computeJigPanelSegments(carcassInnerHeight, leftSideA, []),
  });

  // Dividers — slides on both faces
  for (let i = 0; i < N - 1; i++) {
    const colLeft = columns[i];
    const colRight = columns[i + 1];
    if (!colLeft || !colRight) continue;
    const sideA = computeJigZones(colLeft, config, carcassInnerHeight);
    const sideB = computeJigZones(colRight, config, carcassInnerHeight);
    panels.push({
      panelLabel: `Divider ${String(i + 1)}\u2013${String(i + 2)}`,
      panelIndex: i + 1,
      panelThickness: woodAssignments.carcassDividers.actual,
      panelHeight: carcassInnerHeight,
      sideAZones: sideA,
      sideBZones: sideB,
      segments: computeJigPanelSegments(carcassInnerHeight, sideA, sideB),
    });
  }

  // Right side panel (only if multi-column; single-column reuses the same jig)
  if (N > 1) {
    const lastCol = columns[N - 1];
    if (lastCol) {
      const rightSideA = computeJigZones(lastCol, config, carcassInnerHeight);
      panels.push({
        panelLabel: "Right Side",
        panelIndex: N,
        panelThickness: woodAssignments.carcassSides.actual,
        panelHeight: carcassInnerHeight,
        sideAZones: rightSideA,
        sideBZones: [],
        segments: computeJigPanelSegments(carcassInnerHeight, rightSideA, []),
      });
    }
  }

  return panels;
}

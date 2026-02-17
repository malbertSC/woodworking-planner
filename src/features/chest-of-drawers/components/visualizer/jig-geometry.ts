import { BoxGeometry, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { JigPanelSegment, JigZone } from "../../calculations/jig.ts";

// ─── Constants (all in mm — STL standard) ────────────────────────────────────

const CLIP_WALL_MM = 5;
const CLIP_TOLERANCE_MM = 0.4;
const CLIP_LIP_DEPTH_MM = 10;
/** Small lip past panel face in gap zones for slide alignment. */
const GAP_LIP_MM = 1;

const INCHES_TO_MM = 25.4;

// ─── Spine Z-width helpers ──────────────────────────────────────────────────

interface SpineZone {
  startY: number; // mm, relative to segment
  height: number; // mm
  zWidth: number; // mm
  zCenter: number; // mm
}

/**
 * Merge sideA and sideB zone lists to compute the spine Z-width at each
 * Y interval. In gap regions the spine narrows to the panel slot width so
 * it doesn't block the slides from opening.
 */
function computeSpineZones(
  sideAZones: JigZone[],
  sideBZones: JigZone[],
  segHeightMm: number,
  gapMm: number,
  clipTotalZ: number,
): SpineZone[] {
  // Collect Y breakpoints (mm) from both side zone lists
  const bps = new Set<number>();
  bps.add(0);
  bps.add(segHeightMm);
  for (const z of sideAZones) {
    bps.add(z.startY * INCHES_TO_MM);
    bps.add((z.startY + z.height) * INCHES_TO_MM);
  }
  for (const z of sideBZones) {
    bps.add(z.startY * INCHES_TO_MM);
    bps.add((z.startY + z.height) * INCHES_TO_MM);
  }

  const sorted = [...bps].sort((a, b) => a - b);
  const zones: SpineZone[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const startY = sorted[i] ?? 0;
    const endY = sorted[i + 1] ?? 0;
    const height = endY - startY;
    if (height <= 0) continue;

    const midInches = (startY + endY) / 2 / INCHES_TO_MM;

    const sideAIsGap = sideAZones.some(
      (z) =>
        z.type === "gap" &&
        midInches >= z.startY &&
        midInches < z.startY + z.height,
    );
    const sideBIsGap = sideBZones.some(
      (z) =>
        z.type === "gap" &&
        midInches >= z.startY &&
        midInches < z.startY + z.height,
    );

    const zMin = sideAIsGap ? -gapMm / 2 - GAP_LIP_MM : -clipTotalZ / 2;
    const zMax = sideBIsGap ? gapMm / 2 + GAP_LIP_MM : clipTotalZ / 2;

    zones.push({
      startY,
      height,
      zWidth: zMax - zMin,
      zCenter: (zMin + zMax) / 2,
    });
  }

  return zones;
}

/**
 * Build a Three.js BufferGeometry for one jig segment.
 *
 * Coordinate system (looking at the panel front edge):
 *   X = depth (into the panel / away from front edge)
 *   Y = height (along panel edge)
 *   Z = across panel thickness
 *
 * Design: a comb-like clip on the panel's front edge.
 *   - sideA (Z-) inner wall: present only at sideA spacer zones.
 *     If sideA has no zones, the inner wall is continuous (side panel outside).
 *   - sideB (Z+) outer wall: present only at sideB spacer zones.
 *     If sideB has no zones, the outer wall is continuous (side panel outside).
 *   - Bridge at the front edge: continuous along Y, but narrows to panel-slot
 *     width in gap zones so slides have clearance to open.
 *   - Segments meet with a flat butt joint (the panel clip provides alignment).
 */
export function buildJigSegmentGeometry(
  segment: JigPanelSegment,
  panelThicknessMm: number,
): BufferGeometry {
  const segHeightMm = segment.height * INCHES_TO_MM;
  const gapMm = panelThicknessMm + CLIP_TOLERANCE_MM;
  const clipTotalZ = CLIP_WALL_MM + gapMm + CLIP_WALL_MM;

  const geometries: BoxGeometry[] = [];

  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ): BoxGeometry {
    const g = new BoxGeometry(w, h, d);
    g.translate(x, y, z);
    return g;
  }

  const innerWallZ = -clipTotalZ / 2 + CLIP_WALL_MM / 2;
  const outerWallZ = clipTotalZ / 2 - CLIP_WALL_MM / 2;
  const lipX = CLIP_LIP_DEPTH_MM / 2;

  const sideAHasZones = segment.sideAZones.length > 0;
  const sideBHasZones = segment.sideBZones.length > 0;

  // ── 1. Inner wall (Z- / sideA) ──
  // Comb-like if sideA has zones (gaps for slides); continuous otherwise.
  if (sideAHasZones) {
    for (const zone of segment.sideAZones) {
      if (zone.type !== "spacer") continue;
      const yMm = zone.startY * INCHES_TO_MM;
      const hMm = zone.height * INCHES_TO_MM;
      geometries.push(
        box(
          CLIP_LIP_DEPTH_MM,
          hMm,
          CLIP_WALL_MM,
          lipX,
          yMm + hMm / 2,
          innerWallZ,
        ),
      );
    }
  } else {
    geometries.push(
      box(
        CLIP_LIP_DEPTH_MM,
        segHeightMm,
        CLIP_WALL_MM,
        lipX,
        segHeightMm / 2,
        innerWallZ,
      ),
    );
  }

  // ── 2. Outer wall (Z+ / sideB) ──
  // Comb-like if sideB has zones; continuous otherwise.
  if (sideBHasZones) {
    for (const zone of segment.sideBZones) {
      if (zone.type !== "spacer") continue;
      const yMm = zone.startY * INCHES_TO_MM;
      const hMm = zone.height * INCHES_TO_MM;
      geometries.push(
        box(
          CLIP_LIP_DEPTH_MM,
          hMm,
          CLIP_WALL_MM,
          lipX,
          yMm + hMm / 2,
          outerWallZ,
        ),
      );
    }
  } else {
    geometries.push(
      box(
        CLIP_LIP_DEPTH_MM,
        segHeightMm,
        CLIP_WALL_MM,
        lipX,
        segHeightMm / 2,
        outerWallZ,
      ),
    );
  }

  // ── 3. Edge bridge (spine) ──
  // Narrows to panel-slot width in gap zones so slides can open.
  const spineZones = computeSpineZones(
    segment.sideAZones,
    segment.sideBZones,
    segHeightMm,
    gapMm,
    clipTotalZ,
  );

  for (const sz of spineZones) {
    geometries.push(
      box(
        CLIP_WALL_MM,
        sz.height,
        sz.zWidth,
        -CLIP_WALL_MM / 2,
        sz.startY + sz.height / 2,
        sz.zCenter,
      ),
    );
  }

  // ── 4. Bottom cap (first segment only) ──
  // A plate that registers against the bottom edge of the panel.
  if (segment.segmentIndex === 0) {
    const capWidth = CLIP_WALL_MM + CLIP_LIP_DEPTH_MM;
    const capCenterX = (-CLIP_WALL_MM + CLIP_LIP_DEPTH_MM) / 2;
    geometries.push(
      box(capWidth, CLIP_WALL_MM, clipTotalZ, capCenterX, -CLIP_WALL_MM / 2, 0),
    );
  }

  const merged = mergeGeometries(geometries);

  for (const g of geometries) g.dispose();

  return merged;
}

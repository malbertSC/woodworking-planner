import { BoxGeometry, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { JigPanelSegment } from "../../calculations/jig.ts";

// ─── Constants (all in mm — STL standard) ────────────────────────────────────

const CLIP_WALL_MM = 5;
const CLIP_TOLERANCE_MM = 0.4;
const CLIP_LIP_DEPTH_MM = 10;

/** Height of the shiplap tongue that extends into the adjacent segment. */
const JOINT_HEIGHT_MM = 10;
/** Clearance between the two halves of the shiplap joint. */
const JOINT_CLEARANCE_MM = 0.3;

const INCHES_TO_MM = 25.4;

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
 *   - Bridge at the front edge: always continuous, carries the shiplap joint.
 */
export function buildJigSegmentGeometry(
  segment: JigPanelSegment,
  panelThicknessMm: number,
  totalSegments: number,
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

  // ── 3. Edge bridge ──
  // Always continuous — structural spine and shiplap joint carrier.
  const hasJointAbove =
    totalSegments > 1 && segment.segmentIndex < totalSegments - 1;
  const hasJointBelow = totalSegments > 1 && segment.segmentIndex > 0;

  if (!hasJointAbove && !hasJointBelow) {
    geometries.push(
      box(
        CLIP_WALL_MM,
        segHeightMm,
        clipTotalZ,
        -CLIP_WALL_MM / 2,
        segHeightMm / 2,
        0,
      ),
    );
  } else {
    // Shiplap: split bridge into front/back halves along X.
    // Front half extends upward; back half extends downward.
    const halfX = (CLIP_WALL_MM - JOINT_CLEARANCE_MM) / 2;

    // Front half (X- side of bridge)
    const frontCenterX = -CLIP_WALL_MM + halfX / 2;
    const frontBottom = hasJointBelow ? JOINT_HEIGHT_MM : 0;
    const frontTop = segHeightMm + (hasJointAbove ? JOINT_HEIGHT_MM : 0);
    const frontH = frontTop - frontBottom;
    geometries.push(
      box(halfX, frontH, clipTotalZ, frontCenterX, frontBottom + frontH / 2, 0),
    );

    // Back half (X+ side of bridge, closer to lip)
    const backCenterX = -halfX / 2;
    const backBottom = hasJointBelow ? -JOINT_HEIGHT_MM : 0;
    const backTop = segHeightMm - (hasJointAbove ? JOINT_HEIGHT_MM : 0);
    const backH = backTop - backBottom;
    geometries.push(
      box(halfX, backH, clipTotalZ, backCenterX, backBottom + backH / 2, 0),
    );
  }

  const merged = mergeGeometries(geometries);

  for (const g of geometries) g.dispose();

  return merged;
}

import type { DrawerBoxConstruction, Unit } from "../types.ts";

// Gridfinity grid is 42mm x 42mm per unit
const GRID_UNIT_MM = 42;

// Bin height formula: height_mm = units * 7 + 4
// Derived from: 4u = 32mm, 6u = 46mm
const BIN_HEIGHT_UNIT_MM = 7;
const BIN_HEIGHT_BASE_MM = 4;
const MAX_BIN_UNITS = 20;

const MM_PER_INCH = 25.4;

export function toMm(value: number, unit: Unit): number {
  return unit === "inches" ? value * MM_PER_INCH : value * 10;
}

export function gridfinityGridUnits(dimensionMm: number): number {
  return Math.floor(dimensionMm / GRID_UNIT_MM);
}

export function gridfinityBinHeightMm(units: number): number {
  return units * BIN_HEIGHT_UNIT_MM + BIN_HEIGHT_BASE_MM;
}

export function gridfinityMaxBinUnits(interiorHeightMm: number): number {
  let maxUnits = 0;
  for (let u = 1; u <= MAX_BIN_UNITS; u++) {
    if (gridfinityBinHeightMm(u) <= interiorHeightMm) {
      maxUnits = u;
    } else {
      break;
    }
  }
  return maxUnits;
}

// --- Reverse calculations: gridfinity units → opening dimensions ---

/** Round up to nearest 1/8" — use for cut dimensions with hard minimums (e.g. drawer sides). */
export function roundUpToNearestEighth(inches: number): number {
  return Math.ceil(inches * 8) / 8;
}

/** Round to nearest 1/8" — use for cut dimensions without hard minimums (e.g. faces). */
export function roundToNearestEighth(inches: number): number {
  return Math.round(inches * 8) / 8;
}

/** Convert grid width units to minimum required usable interior width in inches. */
export function minUsableWidthInches(gridUnits: number): number {
  return (gridUnits * GRID_UNIT_MM) / MM_PER_INCH;
}

/** Convert bin height units to minimum required usable interior height in inches. */
export function minUsableHeightInches(binUnits: number): number {
  return gridfinityBinHeightMm(binUnits) / MM_PER_INCH;
}

/**
 * Calculate the opening width needed to fit `gridUnits` gridfinity grid units.
 *
 * Strategy: the front/back piece length is the cut dimension — round THAT to
 * the nearest 1/8", then derive the box and opening widths by adding back
 * non-cut offsets (side thickness, slide clearance).
 *
 * For all construction methods, the front/back fits between the sides:
 *   frontBackLength >= minUsableWidth
 *   boxOuterWidth = frontBackLength + 2 * sideThickness
 *   openingWidth = boxOuterWidth + 2 * clearancePerSide
 *
 * @param gridUnits - Number of 42mm gridfinity grid units to fit
 * @param drawerSideThickness - Drawer side wood thickness (inches)
 * @param clearancePerSide - Slide clearance per side (inches)
 * @returns Opening width in inches
 */
export function openingWidthForGridUnits(
  gridUnits: number,
  drawerSideThickness: number,
  clearancePerSide: number,
): number {
  const minUsable = minUsableWidthInches(gridUnits);
  const frontBackLength = roundUpToNearestEighth(minUsable);
  const boxOuterWidth = frontBackLength + 2 * drawerSideThickness;
  return boxOuterWidth + 2 * clearancePerSide;
}

/**
 * Calculate the opening height needed to fit `binUnits` gridfinity bins.
 *
 * Strategy: compute the minimum required side height (the actual cut dimension)
 * and round THAT to the nearest 1/8". Then derive the opening height by adding
 * back non-cut offsets (vertical clearance, applied bottom thickness).
 *
 * This ensures the side height — which you actually cut on the table saw — always
 * lands on a clean 1/8" fraction, even when wood thicknesses aren't 1/8"-aligned
 * (e.g. 1/4" plywood at 0.205"). The opening height may not be a clean fraction,
 * but that's derived from the drawer dimensions, not cut directly.
 *
 * @param binUnits - Gridfinity bin height units (e.g. 4u = 32mm)
 * @param construction - Drawer box construction method
 * @param verticalClearance - Drawer vertical clearance (inches)
 * @param bottomThickness - Drawer bottom wood thickness (inches)
 * @param dadoGrooveOffset - Dado groove offset from bottom of side (inches, only used for dado)
 * @returns Opening height in inches
 */
export function openingHeightForBinUnits(
  binUnits: number,
  construction: DrawerBoxConstruction,
  verticalClearance: number,
  bottomThickness: number,
  dadoGrooveOffset: number,
): number {
  const minUsable = minUsableHeightInches(binUnits);

  // Round the side height (the cut) to nearest 1/8", then add back non-cut offsets.
  // Side height formulas per construction:
  //   dado:               sideHeight >= minUsable + dadoGrooveOffset + bottomThickness
  //   butt-through-sides: sideHeight >= minUsable + bottomThickness
  //   butt-through-bottom: sideHeight >= minUsable (side IS the usable height)
  // Opening height formulas per construction:
  //   dado / butt-through-sides: openingHeight = sideHeight + verticalClearance
  //   butt-through-bottom:       openingHeight = sideHeight + bottomThickness + verticalClearance
  switch (construction) {
    case "dado": {
      const sideHeight = roundUpToNearestEighth(
        minUsable + dadoGrooveOffset + bottomThickness,
      );
      return sideHeight + verticalClearance;
    }
    case "butt-through-sides": {
      const sideHeight = roundUpToNearestEighth(minUsable + bottomThickness);
      return sideHeight + verticalClearance;
    }
    case "butt-through-bottom": {
      const sideHeight = roundUpToNearestEighth(minUsable);
      return sideHeight + bottomThickness + verticalClearance;
    }
  }
}

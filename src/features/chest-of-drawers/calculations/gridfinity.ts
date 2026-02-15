import type { DrawerBoxConstruction, Unit } from "../types.ts";

// Gridfinity grid is 42mm x 42mm per unit
const GRID_UNIT_MM = 42;

// Bin height formula: height_mm = units * 7 + 4
// Derived from: 4u = 32mm, 6u = 46mm
const BIN_HEIGHT_UNIT_MM = 7;
const BIN_HEIGHT_BASE_MM = 4;
const MAX_BIN_UNITS = 12;

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

/** Round up to nearest 1/8" to keep cut dimensions on clean fractions. */
export function roundUpToNearestEighth(inches: number): number {
  return Math.ceil(inches * 8) / 8;
}

/**
 * Calculate the opening width needed to fit `gridUnits` gridfinity grid units.
 * Works backwards: gridUnits → min interior mm → add clearances → round up to 1/8".
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
  const minInteriorMm = gridUnits * GRID_UNIT_MM;
  const minInteriorInches = minInteriorMm / MM_PER_INCH;
  // usableInteriorWidth = boxOuterWidth - 2 * sideThickness
  // boxOuterWidth = openingWidth - 2 * clearancePerSide
  // → openingWidth = interiorWidth + 2 * sideThickness + 2 * clearancePerSide
  // Round the final result so cut dimensions land on clean 1/8" fractions,
  // even when wood thicknesses aren't 1/8"-aligned (e.g. 15/32" plywood).
  return roundUpToNearestEighth(
    minInteriorInches + 2 * drawerSideThickness + 2 * clearancePerSide,
  );
}

/**
 * Calculate the opening height needed to fit `binUnits` gridfinity bins.
 * Works backwards: binUnits → bin height mm → add construction offsets → round up to 1/8".
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
  const minInteriorMm = gridfinityBinHeightMm(binUnits);
  const minInteriorInches = minInteriorMm / MM_PER_INCH;

  // Reverse of the construction-specific usableInteriorHeight formulas:
  // dado: usableInteriorHeight = (openingHeight - verticalClearance) - dadoGrooveOffset - bottomThickness
  // butt-through-sides: usableInteriorHeight = (openingHeight - verticalClearance) - bottomThickness
  // butt-through-bottom: usableInteriorHeight = openingHeight - verticalClearance - bottomThickness
  // Round the final result so cut dimensions land on clean 1/8" fractions,
  // even when wood thicknesses aren't 1/8"-aligned (e.g. 15/32" plywood).
  switch (construction) {
    case "dado":
      return roundUpToNearestEighth(
        minInteriorInches +
          dadoGrooveOffset +
          bottomThickness +
          verticalClearance,
      );
    case "butt-through-sides":
    case "butt-through-bottom":
      return roundUpToNearestEighth(
        minInteriorInches + bottomThickness + verticalClearance,
      );
  }
}

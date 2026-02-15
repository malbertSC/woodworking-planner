import type {
  CarcassDimensions,
  ChestConfig,
  Column,
  ConstraintViolation,
  CutPiece,
  Dimensions,
} from "../types.ts";
import { RAIL_THRESHOLDS } from "../constants.ts";

export function getColumnInnerHeight(
  column: Column,
  config: ChestConfig,
): number {
  const totalRowHeight = column.rows.reduce(
    (sum, row) => sum + row.openingHeight,
    0,
  );

  if (!config.horizontalRails.enabled || column.rows.length <= 1) {
    return totalRowHeight;
  }

  const railCount = column.rows.length - 1;
  const railThickness = config.horizontalRails.thickness.actual;
  return totalRowHeight + railCount * railThickness;
}

export function calculateCarcassDimensions(
  config: ChestConfig,
): CarcassDimensions {
  const { woodAssignments, columns, slideSpec, drawerBackClearance } = config;

  const sideThickness = woodAssignments.carcassSides.actual;
  const topBottomThickness = woodAssignments.carcassTopBottom.actual;
  const dividerThickness = woodAssignments.carcassDividers.actual;
  const backThickness = woodAssignments.carcassBack.actual;

  const totalOpeningWidths = columns.reduce(
    (sum, col) => sum + col.openingWidth,
    0,
  );
  const dividerCount = columns.length - 1;

  const innerWidth = totalOpeningWidths + dividerCount * dividerThickness;
  const outerWidth = sideThickness + innerWidth + sideThickness;

  const carcassInnerHeight = Math.max(
    ...columns.map((col) => getColumnInnerHeight(col, config)),
  );
  const outerHeight =
    topBottomThickness + carcassInnerHeight + topBottomThickness;

  const innerDepth = slideSpec.length + drawerBackClearance;
  const outerDepth = innerDepth + backThickness;

  const constraintViolations = checkConstraintViolations(
    { width: outerWidth, height: outerHeight, depth: outerDepth },
    config.constraints,
  );

  return {
    outerWidth,
    outerHeight,
    outerDepth,
    innerWidth,
    innerDepth,
    constraintViolations,
  };
}

export function checkConstraintViolations(
  outer: Dimensions,
  constraints: Dimensions | undefined,
): ConstraintViolation[] {
  if (constraints === undefined) return [];

  const violations: ConstraintViolation[] = [];
  const checks: (keyof Dimensions)[] = ["width", "height", "depth"];

  for (const dim of checks) {
    if (outer[dim] > constraints[dim]) {
      violations.push({
        dimension: dim,
        actual: outer[dim],
        max: constraints[dim],
      });
    }
  }

  return violations;
}

export function shouldRecommendHorizontalRails(config: ChestConfig): boolean {
  const { outerWidth, outerHeight } = calculateCarcassDimensions(config);

  if (outerWidth > RAIL_THRESHOLDS.width) return true;
  if (outerHeight > RAIL_THRESHOLDS.height) return true;

  return config.columns.some(
    (col) => col.rows.length > RAIL_THRESHOLDS.maxRowsBeforeRecommend,
  );
}

export function getCarcassPieces(
  config: ChestConfig,
  carcass: CarcassDimensions,
): CutPiece[] {
  const { woodAssignments, columns, horizontalRails } = config;
  const pieces: CutPiece[] = [];
  const verticalPanelHeight =
    carcass.outerHeight - woodAssignments.carcassTopBottom.actual * 2;

  pieces.push({
    id: "carcass-top",
    label: "Carcass Top",
    width: carcass.innerWidth,
    height: carcass.innerDepth,
    thickness: woodAssignments.carcassTopBottom,
    quantity: 1,
  });

  pieces.push({
    id: "carcass-bottom",
    label: "Carcass Bottom",
    width: carcass.innerWidth,
    height: carcass.innerDepth,
    thickness: woodAssignments.carcassTopBottom,
    quantity: 1,
  });

  pieces.push({
    id: "carcass-sides",
    label: "Carcass Side",
    width: carcass.innerDepth,
    height: verticalPanelHeight,
    thickness: woodAssignments.carcassSides,
    quantity: 2,
  });

  const dividerCount = columns.length - 1;
  if (dividerCount > 0) {
    pieces.push({
      id: "carcass-dividers",
      label: "Vertical Divider",
      width: carcass.innerDepth,
      height: verticalPanelHeight,
      thickness: woodAssignments.carcassDividers,
      quantity: dividerCount,
    });
  }

  pieces.push({
    id: "carcass-back",
    label: "Back Panel",
    width: carcass.outerWidth,
    height: carcass.outerHeight,
    thickness: woodAssignments.carcassBack,
    quantity: 1,
  });

  if (horizontalRails.enabled) {
    for (const [i, col] of columns.entries()) {
      const colRailCount = Math.max(0, col.rows.length - 1);
      if (colRailCount > 0) {
        pieces.push({
          id: `horizontal-rails-col-${String(i)}`,
          label:
            columns.length > 1
              ? `Horizontal Rail (Col ${String(i + 1)})`
              : "Horizontal Rail",
          width: col.openingWidth,
          height: horizontalRails.width,
          thickness: horizontalRails.thickness,
          quantity: colRailCount,
        });
      }
    }
  }

  return pieces;
}

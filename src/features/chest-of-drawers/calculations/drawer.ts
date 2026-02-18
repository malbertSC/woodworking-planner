import type {
  ChestConfig,
  Column,
  CutPiece,
  DrawerBoxConstruction,
  DrawerBoxDimensions,
  DrawerRow,
  DrawerWarning,
  WoodThickness,
} from "../types.ts";
import { roundUpToNearestEighth } from "./gridfinity.ts";

function getDrawerWood(
  row: DrawerRow,
  config: ChestConfig,
): {
  sides: WoodThickness;
  frontBack: WoodThickness;
  bottom: WoodThickness;
  face: WoodThickness;
} {
  const base = config.woodAssignments;
  const override = config.advancedWoodMode ? row.woodOverride : undefined;
  return {
    sides: override?.sides ?? base.drawerSides,
    frontBack: override?.frontBack ?? base.drawerFrontBack,
    bottom: override?.bottom ?? base.drawerBottom,
    face: override?.face ?? base.drawerFace,
  };
}

interface ConstructionResult {
  sideHeight: number;
  boxOuterHeight: number;
  bottomWidth: number;
  bottomDepth: number;
  usableInteriorHeight: number;
  usableInteriorDepth: number;
}

interface BoxParams {
  openingHeight: number;
  verticalClearance: number;
  boxOuterWidth: number;
  boxOuterDepth: number;
  sideThickness: number;
  frontBackThickness: number;
  bottomThickness: number;
  dadoGrooveDepth: number;
  dadoGrooveOffset: number;
}

function calculateDadoResult(p: BoxParams): ConstructionResult {
  const sideHeight = p.openingHeight - p.verticalClearance;
  const frontBackLength = p.boxOuterWidth - 2 * p.sideThickness;
  return {
    sideHeight,
    boxOuterHeight: sideHeight,
    bottomWidth: frontBackLength + 2 * p.dadoGrooveDepth,
    bottomDepth:
      p.boxOuterDepth - 2 * p.frontBackThickness + 2 * p.dadoGrooveDepth,
    usableInteriorHeight: sideHeight - p.dadoGrooveOffset - p.bottomThickness,
    usableInteriorDepth: p.boxOuterDepth - 2 * p.frontBackThickness,
  };
}

function calculateButtThroughSidesResult(p: BoxParams): ConstructionResult {
  const sideHeight = p.openingHeight - p.verticalClearance;
  return {
    sideHeight,
    boxOuterHeight: sideHeight,
    bottomWidth: p.boxOuterWidth - 2 * p.sideThickness,
    bottomDepth: p.boxOuterDepth - 2 * p.frontBackThickness,
    usableInteriorHeight: sideHeight - p.bottomThickness,
    usableInteriorDepth: p.boxOuterDepth - 2 * p.frontBackThickness,
  };
}

function calculateButtThroughBottomResult(p: BoxParams): ConstructionResult {
  const sideHeight = p.openingHeight - p.verticalClearance - p.bottomThickness;
  return {
    sideHeight,
    boxOuterHeight: sideHeight + p.bottomThickness,
    bottomWidth: p.boxOuterWidth,
    bottomDepth: p.boxOuterDepth,
    usableInteriorHeight: sideHeight,
    usableInteriorDepth: p.boxOuterDepth - 2 * p.frontBackThickness,
  };
}

function getConstructionStrategy(
  construction: DrawerBoxConstruction,
): (p: BoxParams) => ConstructionResult {
  switch (construction) {
    case "dado":
      return calculateDadoResult;
    case "butt-through-sides":
      return calculateButtThroughSidesResult;
    case "butt-through-bottom":
      return calculateButtThroughBottomResult;
  }
}

function collectWarnings(
  dims: DrawerBoxDimensions,
  config: ChestConfig,
  openingHeight: number,
): DrawerWarning[] {
  const warnings: DrawerWarning[] = [];

  if (openingHeight < config.slideSpec.minMountingHeight) {
    warnings.push({
      type: "slide-height",
      message: `Opening height ${String(openingHeight)}" is less than minimum slide mounting height ${String(config.slideSpec.minMountingHeight)}"`,
    });
  }

  const allDims = [
    dims.boxOuterWidth,
    dims.boxOuterHeight,
    dims.boxOuterDepth,
    dims.bottomWidth,
    dims.bottomDepth,
    dims.sideHeight,
    dims.frontBackHeight,
    dims.usableInteriorWidth,
    dims.usableInteriorHeight,
    dims.usableInteriorDepth,
  ];
  if (allDims.some((d) => d <= 0)) {
    warnings.push({
      type: "negative-dimension",
      message: "One or more calculated dimensions are zero or negative",
    });
  }

  return warnings;
}

function findRowIndex(column: Column, row: DrawerRow): number {
  return column.rows.findIndex((r) => r.id === row.id);
}

function findColumnIndex(config: ChestConfig, column: Column): number {
  return config.columns.findIndex((c) => c.id === column.id);
}

export function calculateDrawerBox(
  row: DrawerRow,
  column: Column,
  config: ChestConfig,
): DrawerBoxDimensions {
  const wood = getDrawerWood(row, config);
  const boxOuterWidth =
    column.openingWidth - 2 * config.slideSpec.clearancePerSide;
  const boxOuterDepth = config.slideSpec.length;
  const frontBackLength = boxOuterWidth - 2 * wood.sides.actual;

  const params: BoxParams = {
    openingHeight: row.openingHeight,
    verticalClearance: config.drawerVerticalClearance,
    boxOuterWidth,
    boxOuterDepth,
    sideThickness: wood.sides.actual,
    frontBackThickness: wood.frontBack.actual,
    bottomThickness: wood.bottom.actual,
    dadoGrooveDepth: config.dadoGrooveDepth,
    dadoGrooveOffset: config.dadoGrooveOffset,
  };

  const strategy = getConstructionStrategy(row.construction);
  const result = strategy(params);

  const face = calculateFaceDimensions(
    row,
    column,
    findRowIndex(column, row),
    findColumnIndex(config, column),
    config,
  );

  const dims: DrawerBoxDimensions = {
    rowId: row.id,
    columnId: column.id,
    boxOuterWidth,
    boxOuterHeight: result.boxOuterHeight,
    boxOuterDepth,
    usableInteriorWidth: boxOuterWidth - 2 * wood.sides.actual,
    usableInteriorHeight: result.usableInteriorHeight,
    usableInteriorDepth: result.usableInteriorDepth,
    sideLength: boxOuterDepth,
    sideHeight: result.sideHeight,
    frontBackLength,
    frontBackHeight: result.sideHeight,
    bottomWidth: roundUpToNearestEighth(result.bottomWidth),
    bottomDepth: roundUpToNearestEighth(result.bottomDepth),
    faceWidth: roundUpToNearestEighth(face.width),
    faceHeight: roundUpToNearestEighth(face.height),
    warnings: [],
  };

  dims.warnings = collectWarnings(dims, config, row.openingHeight);
  return dims;
}

export function calculateFaceDimensions(
  row: DrawerRow,
  column: Column,
  rowIndex: number,
  columnIndex: number,
  config: ChestConfig,
): { width: number; height: number } {
  if (config.drawerStyle === "inset") {
    return {
      width: column.openingWidth - 2 * config.insetRevealGap,
      height: row.openingHeight - 2 * config.insetRevealGap,
    };
  }

  return {
    width: calculateOverlayFaceWidth(column, columnIndex, config),
    height: calculateOverlayFaceHeight(row, rowIndex, column, config),
  };
}

function calculateOverlayFaceWidth(
  column: Column,
  _columnIndex: number,
  config: ChestConfig,
): number {
  const dividerThickness = config.woodAssignments.carcassDividers.actual;
  const reveal = config.insetRevealGap;

  if (config.columns.length === 1) {
    const sideThickness = config.woodAssignments.carcassSides.actual;
    return column.openingWidth + 2 * sideThickness - reveal;
  }

  return column.openingWidth + dividerThickness - reveal;
}

function calculateOverlayFaceHeight(
  row: DrawerRow,
  _rowIndex: number,
  column: Column,
  config: ChestConfig,
): number {
  const reveal = config.insetRevealGap;
  const railHeight = config.horizontalRails.enabled
    ? config.horizontalRails.thickness.actual
    : 0;

  if (column.rows.length === 1) {
    return row.openingHeight - reveal;
  }

  return row.openingHeight + railHeight - reveal;
}

export function getDrawerPieces(
  box: DrawerBoxDimensions,
  row: DrawerRow,
  config: ChestConfig,
): CutPiece[] {
  const wood = getDrawerWood(row, config);

  return [
    {
      id: `${box.columnId}-${box.rowId}-side`,
      label: `Drawer ${box.columnId}-${box.rowId} Side`,
      width: box.sideLength,
      height: box.sideHeight,
      thickness: wood.sides,
      quantity: 2,
    },
    {
      id: `${box.columnId}-${box.rowId}-front`,
      label: `Drawer ${box.columnId}-${box.rowId} Front`,
      width: box.frontBackLength,
      height: box.frontBackHeight,
      thickness: wood.frontBack,
      quantity: 1,
    },
    {
      id: `${box.columnId}-${box.rowId}-back`,
      label: `Drawer ${box.columnId}-${box.rowId} Back`,
      width: box.frontBackLength,
      height: box.frontBackHeight,
      thickness: wood.frontBack,
      quantity: 1,
    },
    {
      id: `${box.columnId}-${box.rowId}-bottom`,
      label: `Drawer ${box.columnId}-${box.rowId} Bottom`,
      width: box.bottomWidth,
      height: box.bottomDepth,
      thickness: wood.bottom,
      quantity: 1,
    },
    {
      id: `${box.columnId}-${box.rowId}-face`,
      label: `Drawer ${box.columnId}-${box.rowId} Face`,
      width: box.faceWidth,
      height: box.faceHeight,
      thickness: wood.face,
      quantity: 1,
    },
  ];
}

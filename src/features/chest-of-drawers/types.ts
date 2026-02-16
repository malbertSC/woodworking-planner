export type Unit = "inches" | "cm";

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export type DrawerStyle = "overlay" | "inset";

export type DrawerHeightMode = "gridfinity" | "direct";

export type DrawerBoxConstruction =
  | "dado"
  | "butt-through-sides"
  | "butt-through-bottom";

export interface WoodThickness {
  id: string;
  nominal: string;
  actual: number;
  material: string;
}

export interface SlideSpec {
  length: number;
  clearancePerSide: number;
  minMountingHeight: number;
}

export interface HorizontalRailConfig {
  enabled: boolean;
  thickness: WoodThickness;
  width: number;
}

export interface WoodAssignments {
  carcassTopBottom: WoodThickness;
  carcassSides: WoodThickness;
  carcassDividers: WoodThickness;
  carcassBack: WoodThickness;
  horizontalRails: WoodThickness;
  drawerSides: WoodThickness;
  drawerFrontBack: WoodThickness;
  drawerBottom: WoodThickness;
  drawerFace: WoodThickness;
}

export interface DrawerWoodOverride {
  sides?: WoodThickness | undefined;
  frontBack?: WoodThickness | undefined;
  bottom?: WoodThickness | undefined;
  face?: WoodThickness | undefined;
}

export interface DrawerRow {
  id: string;
  openingHeight: number;
  binHeightUnits: number;
  heightMode?: DrawerHeightMode | undefined;
  construction: DrawerBoxConstruction;
  woodOverride?: DrawerWoodOverride | undefined;
}

export interface Column {
  id: string;
  openingWidth: number;
  gridWidthUnits: number;
  rows: DrawerRow[];
}

export interface ChestConfig {
  name: string;
  unit: Unit;
  constraints?: Dimensions | undefined;
  columns: Column[];
  drawerStyle: DrawerStyle;
  defaultConstruction: DrawerBoxConstruction;
  defaultRowHeight: number;
  defaultGridWidthUnits: number;
  defaultBinHeightUnits: number;
  woodAssignments: WoodAssignments;
  advancedWoodMode: boolean;
  slideSpec: SlideSpec;
  horizontalRails: HorizontalRailConfig;
  kerfWidth: number;
  dadoGrooveDepth: number;
  dadoGrooveOffset: number;
  overlayOverlap: number;
  insetRevealGap: number;
  drawerVerticalClearance: number;
  drawerBackClearance: number;
}

export interface CarcassDimensions {
  outerWidth: number;
  outerHeight: number;
  outerDepth: number;
  innerWidth: number;
  innerDepth: number;
  constraintViolations: ConstraintViolation[];
}

export interface ConstraintViolation {
  dimension: "width" | "height" | "depth";
  actual: number;
  max: number;
}

export interface DrawerBoxDimensions {
  rowId: string;
  columnId: string;
  boxOuterWidth: number;
  boxOuterHeight: number;
  boxOuterDepth: number;
  usableInteriorWidth: number;
  usableInteriorHeight: number;
  usableInteriorDepth: number;
  sideLength: number;
  sideHeight: number;
  frontBackLength: number;
  frontBackHeight: number;
  bottomWidth: number;
  bottomDepth: number;
  faceWidth: number;
  faceHeight: number;
  warnings: DrawerWarning[];
}

export interface DrawerWarning {
  type: "slide-height" | "slide-length" | "negative-dimension";
  message: string;
}

export interface CutPiece {
  id: string;
  label: string;
  width: number;
  height: number;
  thickness: WoodThickness;
  quantity: number;
}

export interface StockSheet {
  id: string;
  label: string;
  width: number;
  height: number;
  thickness: WoodThickness;
}

export interface PlacedPiece {
  piece: CutPiece;
  x: number;
  y: number;
  rotated: boolean;
}

export interface SheetLayout {
  sheet: StockSheet;
  placements: PlacedPiece[];
  wastePercentage: number;
  usedArea: number;
  totalArea: number;
}

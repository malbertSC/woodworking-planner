import type { WoodThickness } from "./types.ts";

export const WOOD_THICKNESSES: WoodThickness[] = [
  {
    id: "ply-1/4",
    nominal: '1/4" plywood',
    actual: 0.25,
    material: "plywood",
  },
  {
    id: "ply-1/2",
    nominal: '1/2" plywood',
    actual: 0.46875,
    material: "plywood",
  },
  {
    id: "ply-3/4",
    nominal: '3/4" plywood',
    actual: 0.71875,
    material: "plywood",
  },
  {
    id: "bb-1/4",
    nominal: '1/4" Baltic birch',
    actual: 0.236,
    material: "plywood",
  },
  {
    id: "bb-1/2",
    nominal: '1/2" Baltic birch',
    actual: 0.472,
    material: "plywood",
  },
  {
    id: "bb-3/4",
    nominal: '3/4" Baltic birch',
    actual: 0.709,
    material: "plywood",
  },
  {
    id: "hw-1/4",
    nominal: '1/4" hardwood',
    actual: 0.25,
    material: "hardwood",
  },
  {
    id: "hw-1/2",
    nominal: '1/2" hardwood',
    actual: 0.5,
    material: "hardwood",
  },
  {
    id: "hw-3/4",
    nominal: '3/4" hardwood (4/4 S2S)',
    actual: 0.75,
    material: "hardwood",
  },
  {
    id: "hw-1",
    nominal: '1" hardwood (5/4 S2S)',
    actual: 1.0625,
    material: "hardwood",
  },
  {
    id: "mdf-1/4",
    nominal: '1/4" MDF',
    actual: 0.25,
    material: "mdf",
  },
  {
    id: "mdf-1/2",
    nominal: '1/2" MDF',
    actual: 0.5,
    material: "mdf",
  },
  {
    id: "mdf-3/4",
    nominal: '3/4" MDF',
    actual: 0.75,
    material: "mdf",
  },
];

export const STANDARD_SLIDE_LENGTHS = [
  10, 12, 14, 16, 18, 20, 22, 24, 26, 28,
] as const;

export const DEFAULTS = {
  slideClearancePerSide: 0.5,
  slideMinMountingHeight: 1.75,
  dadoGrooveDepth: 0.25,
  dadoGrooveOffset: 0.375,
  overlayOverlap: 0.375,
  insetRevealGap: 0.125,
  drawerVerticalClearance: 0.25,
  drawerBackClearance: 0.5,
  kerfWidth: 0.125,
  horizontalRailWidth: 3,
} as const;

export const RAIL_THRESHOLDS = {
  width: 36,
  height: 48,
  maxRowsBeforeRecommend: 5,
} as const;

export const STOCK_SHEETS = [
  { label: "4' x 8'", width: 48, height: 96 },
  { label: "4' x 4'", width: 48, height: 48 },
  { label: "2' x 4'", width: 24, height: 48 },
  { label: "2' x 2'", width: 24, height: 24 },
] as const;

export const INCHES_TO_CM = 2.54;

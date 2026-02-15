import { describe, it, expect } from "vitest";
import type {
  ChestConfig,
  Column,
  WoodThickness,
  HorizontalRailConfig,
} from "../../types.ts";
import {
  aggregateCutPieces,
  groupPiecesByThickness,
  getUniqueThicknesses,
} from "../cutlist.ts";

const ply34: WoodThickness = {
  id: "ply-3/4",
  nominal: '3/4" plywood',
  actual: 0.71875,
  material: "plywood",
};

const ply14: WoodThickness = {
  id: "ply-1/4",
  nominal: '1/4" plywood',
  actual: 0.25,
  material: "plywood",
};

const ply12: WoodThickness = {
  id: "ply-1/2",
  nominal: '1/2" plywood',
  actual: 0.46875,
  material: "plywood",
};

const hw34: WoodThickness = {
  id: "hw-3/4",
  nominal: '3/4" hardwood (4/4 S2S)',
  actual: 0.75,
  material: "hardwood",
};

const railsDisabled: HorizontalRailConfig = {
  enabled: false,
  thickness: hw34,
  width: 3,
};

function makeColumn(openingWidth: number, rowHeights: number[]): Column {
  return {
    id: `col-${String(openingWidth)}`,
    openingWidth,
    gridWidthUnits: 7,
    rows: rowHeights.map((h, i) => ({
      id: `row-${String(i)}`,
      openingHeight: h,
      binHeightUnits: 4,
      construction: "dado" as const,
    })),
  };
}

function makeConfig(overrides: Partial<ChestConfig> = {}): ChestConfig {
  return {
    name: "Test Chest",
    unit: "inches",
    columns: [makeColumn(14, [6, 6, 6])],
    drawerStyle: "overlay",
    defaultConstruction: "dado",
    defaultRowHeight: 6,
    defaultGridWidthUnits: 7,
    defaultBinHeightUnits: 4,
    woodAssignments: {
      carcassTopBottom: ply34,
      carcassSides: ply34,
      carcassDividers: ply34,
      carcassBack: ply14,
      horizontalRails: hw34,
      drawerSides: ply12,
      drawerFrontBack: ply12,
      drawerBottom: ply14,
      drawerFace: ply34,
    },
    advancedWoodMode: false,
    slideSpec: {
      length: 18,
      clearancePerSide: 0.5,
      minMountingHeight: 1.75,
    },
    horizontalRails: railsDisabled,
    kerfWidth: 0.125,
    dadoGrooveDepth: 0.25,
    dadoGrooveOffset: 0.375,
    overlayOverlap: 0.375,
    insetRevealGap: 0.0625,
    drawerVerticalClearance: 0.75,
    drawerBackClearance: 0.5,
    ...overrides,
  };
}

describe("aggregateCutPieces", () => {
  it("collects pieces from both carcass and drawers", () => {
    const config = makeConfig();
    const pieces = aggregateCutPieces(config);

    const labels = pieces.map((p) => p.label);
    expect(labels.some((l) => l.startsWith("Carcass"))).toBe(true);
    expect(
      labels.some((l) => l.startsWith("Drawer") || l.startsWith("Back")),
    ).toBe(true);
  });

  it("merges identical pieces with summed quantities", () => {
    const config = makeConfig({
      columns: [makeColumn(14, [6, 6, 6])],
    });
    const pieces = aggregateCutPieces(config);

    const sides = pieces.filter(
      (p) => p.label.includes("Side") && p.label.includes("Drawer"),
    );
    expect(sides.length).toBe(1);
    expect(sides[0]!.quantity).toBe(6);
  });

  it("does not merge pieces with different dimensions", () => {
    const config = makeConfig({
      columns: [makeColumn(14, [6, 8])],
    });
    const pieces = aggregateCutPieces(config);

    const drawerSides = pieces.filter(
      (p) => p.label.includes("Side") && p.label.includes("Drawer"),
    );
    expect(drawerSides.length).toBe(2);
  });

  it("includes correct total quantity for carcass sides", () => {
    const config = makeConfig();
    const pieces = aggregateCutPieces(config);

    const carcassSides = pieces.find((p) => p.label === "Carcass Side");
    expect(carcassSides?.quantity).toBe(2);
  });
});

describe("groupPiecesByThickness", () => {
  it("groups pieces by thickness id", () => {
    const config = makeConfig();
    const pieces = aggregateCutPieces(config);
    const groups = groupPiecesByThickness(pieces);

    expect(groups.has("ply-3/4")).toBe(true);
    expect(groups.has("ply-1/4")).toBe(true);
    expect(groups.has("ply-1/2")).toBe(true);
  });

  it("each group contains only pieces of that thickness", () => {
    const config = makeConfig();
    const pieces = aggregateCutPieces(config);
    const groups = groupPiecesByThickness(pieces);

    for (const [thicknessId, groupPieces] of groups) {
      for (const piece of groupPieces) {
        expect(piece.thickness.id).toBe(thicknessId);
      }
    }
  });
});

describe("getUniqueThicknesses", () => {
  it("returns unique thicknesses from pieces", () => {
    const config = makeConfig();
    const pieces = aggregateCutPieces(config);
    const thicknesses = getUniqueThicknesses(pieces);

    const ids = thicknesses.map((t) => t.id);
    expect(ids).toContain("ply-3/4");
    expect(ids).toContain("ply-1/4");
    expect(ids).toContain("ply-1/2");
    expect(new Set(ids).size).toBe(ids.length);
  });
});

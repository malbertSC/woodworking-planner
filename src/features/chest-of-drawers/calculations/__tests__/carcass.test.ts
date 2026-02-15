import { describe, it, expect } from "vitest";
import type {
  ChestConfig,
  Column,
  WoodThickness,
  HorizontalRailConfig,
} from "../../types.ts";
import {
  calculateCarcassDimensions,
  checkConstraintViolations,
  shouldRecommendHorizontalRails,
  getCarcassPieces,
} from "../carcass.ts";

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

const railsEnabled: HorizontalRailConfig = {
  enabled: true,
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

describe("calculateCarcassDimensions", () => {
  it("calculates single column dimensions correctly", () => {
    const config = makeConfig();
    const result = calculateCarcassDimensions(config);

    expect(result.outerWidth).toBeCloseTo(14 + 0.71875 * 2);
    expect(result.outerHeight).toBeCloseTo(18 + 0.71875 * 2);
    expect(result.innerDepth).toBeCloseTo(18 + 0.5);
    expect(result.outerDepth).toBeCloseTo(18 + 0.5 + 0.25);
    expect(result.innerWidth).toBeCloseTo(14);
    expect(result.constraintViolations).toHaveLength(0);
  });

  it("calculates multi-column dimensions with dividers", () => {
    const config = makeConfig({
      columns: [makeColumn(12, [6, 6]), makeColumn(14, [6, 6])],
    });
    const result = calculateCarcassDimensions(config);

    const expectedInnerWidth = 12 + 14 + 0.71875;
    const expectedOuterWidth = expectedInnerWidth + 0.71875 * 2;

    expect(result.innerWidth).toBeCloseTo(expectedInnerWidth);
    expect(result.outerWidth).toBeCloseTo(expectedOuterWidth);
    expect(result.outerHeight).toBeCloseTo(12 + 0.71875 * 2);
  });

  it("uses tallest column to determine carcass inner height", () => {
    const config = makeConfig({
      columns: [makeColumn(12, [6, 6]), makeColumn(14, [8, 8, 8])],
    });
    const result = calculateCarcassDimensions(config);

    expect(result.outerHeight).toBeCloseTo(24 + 0.71875 * 2);
  });

  it("includes horizontal rails in height when enabled", () => {
    const config = makeConfig({
      columns: [makeColumn(14, [6, 6, 6])],
      horizontalRails: railsEnabled,
    });
    const result = calculateCarcassDimensions(config);

    const expectedInnerHeight = 18 + 2 * 0.75;
    expect(result.outerHeight).toBeCloseTo(expectedInnerHeight + 0.71875 * 2);
  });

  it("does not add rails for single-row columns", () => {
    const config = makeConfig({
      columns: [makeColumn(14, [6])],
      horizontalRails: railsEnabled,
    });
    const result = calculateCarcassDimensions(config);

    expect(result.outerHeight).toBeCloseTo(6 + 0.71875 * 2);
  });

  it("detects constraint violations", () => {
    const config = makeConfig({
      constraints: { width: 10, height: 10, depth: 10 },
    });
    const result = calculateCarcassDimensions(config);

    expect(result.constraintViolations).toHaveLength(3);
    expect(result.constraintViolations[0]?.dimension).toBe("width");
    expect(result.constraintViolations[1]?.dimension).toBe("height");
    expect(result.constraintViolations[2]?.dimension).toBe("depth");
  });

  it("returns no violations when within constraints", () => {
    const config = makeConfig({
      constraints: { width: 100, height: 100, depth: 100 },
    });
    const result = calculateCarcassDimensions(config);

    expect(result.constraintViolations).toHaveLength(0);
  });
});

describe("checkConstraintViolations", () => {
  it("returns empty array when no constraints", () => {
    const result = checkConstraintViolations(
      { width: 50, height: 50, depth: 50 },
      undefined,
    );
    expect(result).toHaveLength(0);
  });

  it("detects width violation only", () => {
    const result = checkConstraintViolations(
      { width: 50, height: 30, depth: 20 },
      { width: 40, height: 40, depth: 40 },
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.dimension).toBe("width");
    expect(result[0]?.actual).toBe(50);
    expect(result[0]?.max).toBe(40);
  });

  it("returns no violations at exact boundary", () => {
    const result = checkConstraintViolations(
      { width: 40, height: 40, depth: 40 },
      { width: 40, height: 40, depth: 40 },
    );
    expect(result).toHaveLength(0);
  });
});

describe("shouldRecommendHorizontalRails", () => {
  it("recommends rails when width exceeds 36 inches", () => {
    const config = makeConfig({
      columns: [makeColumn(36, [6, 6])],
    });
    expect(shouldRecommendHorizontalRails(config)).toBe(true);
  });

  it("recommends rails when height exceeds 48 inches", () => {
    const config = makeConfig({
      columns: [makeColumn(14, [10, 10, 10, 10, 10])],
    });
    expect(shouldRecommendHorizontalRails(config)).toBe(true);
  });

  it("recommends rails when column has more than 5 rows", () => {
    const config = makeConfig({
      columns: [makeColumn(10, [3, 3, 3, 3, 3, 3])],
    });
    expect(shouldRecommendHorizontalRails(config)).toBe(true);
  });

  it("does not recommend rails for small chest", () => {
    const config = makeConfig({
      columns: [makeColumn(14, [6, 6, 6])],
    });
    expect(shouldRecommendHorizontalRails(config)).toBe(false);
  });
});

describe("getCarcassPieces", () => {
  it("generates correct pieces for single column", () => {
    const config = makeConfig();
    const carcass = calculateCarcassDimensions(config);
    const pieces = getCarcassPieces(config, carcass);

    const labels = pieces.map((p) => p.label);
    expect(labels).toContain("Carcass Top");
    expect(labels).toContain("Carcass Bottom");
    expect(labels).toContain("Carcass Side");
    expect(labels).toContain("Back Panel");
    expect(labels).not.toContain("Vertical Divider");

    const sides = pieces.find((p) => p.label === "Carcass Side");
    expect(sides?.quantity).toBe(2);
  });

  it("generates dividers for multi-column config", () => {
    const config = makeConfig({
      columns: [
        makeColumn(12, [6, 6]),
        makeColumn(14, [6, 6]),
        makeColumn(12, [6, 6]),
      ],
    });
    const carcass = calculateCarcassDimensions(config);
    const pieces = getCarcassPieces(config, carcass);

    const dividers = pieces.find((p) => p.label === "Vertical Divider");
    expect(dividers?.quantity).toBe(2);
  });

  it("generates horizontal rails when enabled", () => {
    const config = makeConfig({
      columns: [makeColumn(14, [6, 6, 6])],
      horizontalRails: railsEnabled,
    });
    const carcass = calculateCarcassDimensions(config);
    const pieces = getCarcassPieces(config, carcass);

    const rails = pieces.find((p) => p.label === "Horizontal Rail");
    expect(rails).toBeDefined();
    expect(rails?.quantity).toBe(2);
    expect(rails?.width).toBe(14);
    expect(rails?.height).toBe(3);
  });

  it("generates per-column rails for multi-column configs", () => {
    const config = makeConfig({
      columns: [makeColumn(12, [6, 6, 6]), makeColumn(14, [6, 6])],
      horizontalRails: railsEnabled,
    });
    const carcass = calculateCarcassDimensions(config);
    const pieces = getCarcassPieces(config, carcass);

    const rails = pieces.filter((p) => p.label.includes("Horizontal Rail"));
    expect(rails).toHaveLength(2);

    const col1Rails = rails.find((p) => p.label.includes("Col 1"));
    expect(col1Rails?.quantity).toBe(2);
    expect(col1Rails?.width).toBe(12);

    const col2Rails = rails.find((p) => p.label.includes("Col 2"));
    expect(col2Rails?.quantity).toBe(1);
    expect(col2Rails?.width).toBe(14);
  });

  it("does not generate rails when disabled", () => {
    const config = makeConfig({
      horizontalRails: railsDisabled,
    });
    const carcass = calculateCarcassDimensions(config);
    const pieces = getCarcassPieces(config, carcass);

    const rails = pieces.filter((p) => p.label.includes("Rail"));
    expect(rails).toHaveLength(0);
  });

  it("top and bottom width matches inner width", () => {
    const config = makeConfig();
    const carcass = calculateCarcassDimensions(config);
    const pieces = getCarcassPieces(config, carcass);

    const top = pieces.find((p) => p.label === "Carcass Top");
    expect(top?.width).toBeCloseTo(carcass.innerWidth);
    expect(top?.height).toBeCloseTo(carcass.innerDepth);
  });

  it("side height equals inner height", () => {
    const config = makeConfig();
    const carcass = calculateCarcassDimensions(config);
    const pieces = getCarcassPieces(config, carcass);

    const side = pieces.find((p) => p.label === "Carcass Side");
    const innerHeight = carcass.outerHeight - ply34.actual * 2;
    expect(side?.height).toBeCloseTo(innerHeight);
  });

  it("back panel matches outer dimensions", () => {
    const config = makeConfig();
    const carcass = calculateCarcassDimensions(config);
    const pieces = getCarcassPieces(config, carcass);

    const back = pieces.find((p) => p.label === "Back Panel");
    expect(back?.width).toBeCloseTo(carcass.outerWidth);
    expect(back?.height).toBeCloseTo(carcass.outerHeight);
  });
});

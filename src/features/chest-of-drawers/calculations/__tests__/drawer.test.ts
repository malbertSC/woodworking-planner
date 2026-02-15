import { describe, it, expect } from "vitest";
import {
  calculateDrawerBox,
  calculateFaceDimensions,
  getDrawerPieces,
} from "../drawer.ts";
import type {
  ChestConfig,
  Column,
  DrawerRow,
  WoodThickness,
} from "../../types.ts";

const PLY_3_4: WoodThickness = {
  id: "ply-3/4",
  nominal: '3/4" plywood',
  actual: 0.71875,
  material: "plywood",
};

const PLY_1_2: WoodThickness = {
  id: "ply-1/2",
  nominal: '1/2" plywood',
  actual: 0.46875,
  material: "plywood",
};

const PLY_1_4: WoodThickness = {
  id: "ply-1/4",
  nominal: '1/4" plywood',
  actual: 0.25,
  material: "plywood",
};

function makeRow(overrides: Partial<DrawerRow> = {}): DrawerRow {
  return {
    id: "row-1",
    openingHeight: 6,
    binHeightUnits: 4,
    construction: "dado",
    ...overrides,
  };
}

function makeColumn(
  overrides: Partial<Column> = {},
  rows?: DrawerRow[],
): Column {
  return {
    id: "col-1",
    openingWidth: 14,
    gridWidthUnits: 7,
    rows: rows ?? [makeRow()],
    ...overrides,
  };
}

function makeConfig(
  overrides: Partial<ChestConfig> = {},
  columns?: Column[],
): ChestConfig {
  const cols = columns ?? [makeColumn()];
  return {
    name: "Test Chest",
    unit: "inches",
    columns: cols,
    drawerStyle: "overlay",
    defaultConstruction: "dado",
    defaultRowHeight: 6,
    defaultGridWidthUnits: 7,
    defaultBinHeightUnits: 4,
    woodAssignments: {
      carcassTopBottom: PLY_3_4,
      carcassSides: PLY_3_4,
      carcassDividers: PLY_3_4,
      carcassBack: PLY_1_4,
      horizontalRails: PLY_3_4,
      drawerSides: PLY_1_2,
      drawerFrontBack: PLY_1_2,
      drawerBottom: PLY_1_4,
      drawerFace: PLY_3_4,
    },
    advancedWoodMode: false,
    slideSpec: {
      length: 18,
      clearancePerSide: 0.5,
      minMountingHeight: 1.75,
    },
    horizontalRails: {
      enabled: false,
      thickness: PLY_3_4,
      width: 3,
    },
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

describe("calculateDrawerBox", () => {
  describe("dado construction", () => {
    it("calculates correct box outer dimensions", () => {
      const row = makeRow({ construction: "dado" });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.boxOuterWidth).toBe(14 - 2 * 0.5);
      expect(box.boxOuterHeight).toBe(6 - 0.75);
      expect(box.boxOuterDepth).toBe(18);
    });

    it("calculates correct side and front/back dimensions", () => {
      const row = makeRow({ construction: "dado" });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.sideHeight).toBe(6 - 0.75);
      expect(box.sideLength).toBe(18);
      expect(box.frontBackHeight).toBe(6 - 0.75);
      expect(box.frontBackLength).toBe(13 - 2 * PLY_1_2.actual);
    });

    it("calculates correct bottom dimensions with dado grooves", () => {
      const row = makeRow({ construction: "dado" });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      const expectedFrontBackLength = 13 - 2 * PLY_1_2.actual;
      expect(box.bottomWidth).toBe(expectedFrontBackLength + 2 * 0.25);
      expect(box.bottomDepth).toBe(18 - 2 * PLY_1_2.actual + 2 * 0.25);
    });

    it("calculates correct usable interior", () => {
      const row = makeRow({ construction: "dado" });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.usableInteriorWidth).toBe(13 - 2 * PLY_1_2.actual);
      expect(box.usableInteriorHeight).toBe(5.25 - 0.375 - PLY_1_4.actual);
    });
  });

  describe("butt-through-sides construction", () => {
    it("calculates correct box dimensions", () => {
      const row = makeRow({ construction: "butt-through-sides" });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.boxOuterWidth).toBe(13);
      expect(box.boxOuterHeight).toBe(5.25);
      expect(box.boxOuterDepth).toBe(18);
    });

    it("bottom sits between sides, full depth", () => {
      const row = makeRow({ construction: "butt-through-sides" });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.bottomWidth).toBe(13 - 2 * PLY_1_2.actual);
      expect(box.bottomDepth).toBe(18);
    });

    it("usable interior height reduced by bottom panel", () => {
      const row = makeRow({ construction: "butt-through-sides" });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.usableInteriorHeight).toBe(5.25 - PLY_1_4.actual);
    });
  });

  describe("butt-through-bottom construction", () => {
    it("side height is reduced by bottom panel thickness", () => {
      const row = makeRow({ construction: "butt-through-bottom" });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.sideHeight).toBe(5.25 - PLY_1_4.actual);
      expect(box.boxOuterHeight).toBe(5.25);
    });

    it("bottom extends full width and depth", () => {
      const row = makeRow({ construction: "butt-through-bottom" });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.bottomWidth).toBe(13);
      expect(box.bottomDepth).toBe(18);
    });

    it("usable interior height equals full side height", () => {
      const row = makeRow({ construction: "butt-through-bottom" });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.usableInteriorHeight).toBe(box.sideHeight);
    });
  });

  describe("warnings", () => {
    it("warns when opening height < slide min mounting height", () => {
      const row = makeRow({ openingHeight: 1.5 });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.warnings).toContainEqual(
        expect.objectContaining({ type: "slide-height" }),
      );
    });

    it("no slide-height warning when opening is sufficient", () => {
      const row = makeRow({ openingHeight: 6 });
      const column = makeColumn({}, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(
        box.warnings.filter((w) => w.type === "slide-height"),
      ).toHaveLength(0);
    });

    it("warns on negative dimensions", () => {
      const row = makeRow({
        openingHeight: 0.5,
        construction: "butt-through-bottom",
      });
      const column = makeColumn({ openingWidth: 1 }, [row]);
      const config = makeConfig({}, [column]);

      const box = calculateDrawerBox(row, column, config);

      expect(box.warnings).toContainEqual(
        expect.objectContaining({ type: "negative-dimension" }),
      );
    });
  });
});

describe("calculateFaceDimensions", () => {
  describe("inset style", () => {
    it("reduces opening by reveal gap on each side", () => {
      const row = makeRow();
      const column = makeColumn({}, [row]);
      const config = makeConfig({ drawerStyle: "inset" }, [column]);

      const face = calculateFaceDimensions(row, column, 0, 0, config);

      expect(face.width).toBeCloseTo(14 - 2 * 0.0625);
      expect(face.height).toBeCloseTo(6 - 2 * 0.0625);
    });
  });

  describe("overlay style - single column", () => {
    it("face covers opening minus reveal", () => {
      const row = makeRow();
      const column = makeColumn({}, [row]);
      const config = makeConfig({ drawerStyle: "overlay" }, [column]);

      const face = calculateFaceDimensions(row, column, 0, 0, config);

      expect(face.width).toBeCloseTo(14 - 0.0625);
    });
  });

  describe("overlay style - multi-column", () => {
    it("all columns get opening + divider - reveal (uniform sizing)", () => {
      const row1 = makeRow({ id: "r1" });
      const row2 = makeRow({ id: "r2" });
      const row3 = makeRow({ id: "r3" });
      const col1 = makeColumn({ id: "c1" }, [row1]);
      const col2 = makeColumn({ id: "c2" }, [row2]);
      const col3 = makeColumn({ id: "c3" }, [row3]);
      const config = makeConfig({ drawerStyle: "overlay" }, [col1, col2, col3]);

      const faceLeft = calculateFaceDimensions(row1, col1, 0, 0, config);
      const faceMiddle = calculateFaceDimensions(row2, col2, 0, 1, config);
      const faceRight = calculateFaceDimensions(row3, col3, 0, 2, config);

      const expected = 14 + PLY_3_4.actual - 0.0625;
      expect(faceLeft.width).toBeCloseTo(expected);
      expect(faceMiddle.width).toBeCloseTo(expected);
      expect(faceRight.width).toBeCloseTo(expected);
    });
  });

  describe("overlay style - row height", () => {
    it("single row is opening minus reveal", () => {
      const row = makeRow();
      const column = makeColumn({}, [row]);
      const config = makeConfig({ drawerStyle: "overlay" }, [column]);

      const face = calculateFaceDimensions(row, column, 0, 0, config);

      expect(face.height).toBeCloseTo(6 - 0.0625);
    });

    it("all rows get opening + rail - reveal (uniform sizing)", () => {
      const topRow = makeRow({ id: "r1" });
      const bottomRow = makeRow({ id: "r2" });
      const column = makeColumn({}, [topRow, bottomRow]);
      const config = makeConfig(
        {
          drawerStyle: "overlay",
          horizontalRails: { enabled: true, thickness: PLY_3_4, width: 3 },
        },
        [column],
      );

      const faceTop = calculateFaceDimensions(topRow, column, 0, 0, config);
      const faceBottom = calculateFaceDimensions(
        bottomRow,
        column,
        1,
        0,
        config,
      );

      const expected = 6 + PLY_3_4.actual - 0.0625;
      expect(faceTop.height).toBeCloseTo(expected);
      expect(faceBottom.height).toBeCloseTo(expected);
    });
  });
});

describe("getDrawerPieces", () => {
  it("returns 6 cut piece entries (sides, front, back, bottom, face)", () => {
    const row = makeRow();
    const column = makeColumn({}, [row]);
    const config = makeConfig({}, [column]);
    const box = calculateDrawerBox(row, column, config);

    const pieces = getDrawerPieces(box, row, config);

    expect(pieces).toHaveLength(5);
  });

  it("sides have quantity 2", () => {
    const row = makeRow();
    const column = makeColumn({}, [row]);
    const config = makeConfig({}, [column]);
    const box = calculateDrawerBox(row, column, config);

    const pieces = getDrawerPieces(box, row, config);
    const sides = pieces.find((p) => p.id.endsWith("-side"));

    expect(sides?.quantity).toBe(2);
  });

  it("front and back share same dimensions", () => {
    const row = makeRow();
    const column = makeColumn({}, [row]);
    const config = makeConfig({}, [column]);
    const box = calculateDrawerBox(row, column, config);

    const pieces = getDrawerPieces(box, row, config);
    const front = pieces.find((p) => p.id.endsWith("-front"));
    const back = pieces.find((p) => p.id.endsWith("-back"));

    expect(front?.width).toBe(back?.width);
    expect(front?.height).toBe(back?.height);
  });

  it("uses wood overrides in advanced mode", () => {
    const HW_3_4: WoodThickness = {
      id: "hw-3/4",
      nominal: '3/4" hardwood',
      actual: 0.75,
      material: "hardwood",
    };
    const row = makeRow({
      woodOverride: { sides: HW_3_4 },
    });
    const column = makeColumn({}, [row]);
    const config = makeConfig({ advancedWoodMode: true }, [column]);
    const box = calculateDrawerBox(row, column, config);

    const pieces = getDrawerPieces(box, row, config);
    const sides = pieces.find((p) => p.id.endsWith("-side"));

    expect(sides?.thickness).toEqual(HW_3_4);
  });

  it("ignores wood overrides when not in advanced mode", () => {
    const HW_3_4: WoodThickness = {
      id: "hw-3/4",
      nominal: '3/4" hardwood',
      actual: 0.75,
      material: "hardwood",
    };
    const row = makeRow({
      woodOverride: { sides: HW_3_4 },
    });
    const column = makeColumn({}, [row]);
    const config = makeConfig({ advancedWoodMode: false }, [column]);
    const box = calculateDrawerBox(row, column, config);

    const pieces = getDrawerPieces(box, row, config);
    const sides = pieces.find((p) => p.id.endsWith("-side"));

    expect(sides?.thickness).toEqual(PLY_1_2);
  });
});

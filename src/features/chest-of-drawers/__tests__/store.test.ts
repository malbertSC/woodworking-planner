import { createDefaultConfig, useChestStore } from "../store.ts";
import { WOOD_THICKNESSES, DEFAULTS } from "../constants.ts";
import type { WoodThickness } from "../types.ts";
import {
  selectCarcassDimensions,
  selectAllDrawerBoxes,
  selectAllCutPieces,
  selectRecommendRails,
  selectRecommendedSlideLength,
} from "../selectors.ts";
import {
  openingWidthForGridUnits,
  openingHeightForBinUnits,
} from "../calculations/gridfinity.ts";

function findThickness(id: string): WoodThickness {
  const found = WOOD_THICKNESSES.find((t) => t.id === id);
  if (!found) throw new Error(`Thickness ${id} not found`);
  return found;
}

function col(index: number) {
  const c = useChestStore.getState().config.columns[index];
  if (!c) throw new Error(`Column ${String(index)} not found`);
  return c;
}

function row(colIndex: number, rowIndex: number) {
  const r = col(colIndex).rows[rowIndex];
  if (!r)
    throw new Error(`Row ${String(colIndex)}-${String(rowIndex)} not found`);
  return r;
}

// Expected defaults: 7 grid width units, 4 bin height units, dado construction
const DEFAULT_OPENING_WIDTH = openingWidthForGridUnits(
  7,
  findThickness("ply-1/2").actual,
  DEFAULTS.slideClearancePerSide,
);

const DEFAULT_OPENING_HEIGHT = openingHeightForBinUnits(
  4,
  "dado",
  DEFAULTS.drawerVerticalClearance,
  findThickness("ply-1/4").actual,
  DEFAULTS.dadoGrooveOffset,
);

beforeEach(() => {
  useChestStore.setState({
    config: createDefaultConfig(),
    savedConfigs: {},
  });
});

describe("createDefaultConfig", () => {
  it("returns a config with all required fields", () => {
    const config = createDefaultConfig();
    expect(config.name).toBe("Untitled Chest");
    expect(config.unit).toBe("inches");
    expect(config.columns).toHaveLength(1);
    expect(col(0).rows).toHaveLength(3);
    expect(config.drawerStyle).toBe("overlay");
    expect(config.defaultConstruction).toBe("dado");
    expect(config.advancedWoodMode).toBe(false);
    expect(config.horizontalRails.enabled).toBe(false);
  });

  it("uses gridfinity-derived default dimensions", () => {
    const config = createDefaultConfig();
    expect(config.defaultGridWidthUnits).toBe(7);
    expect(config.defaultBinHeightUnits).toBe(4);
    expect(col(0).gridWidthUnits).toBe(7);
    expect(col(0).openingWidth).toBeCloseTo(DEFAULT_OPENING_WIDTH);
    expect(row(0, 0).binHeightUnits).toBe(4);
    expect(row(0, 0).openingHeight).toBeCloseTo(DEFAULT_OPENING_HEIGHT);
    expect(config.defaultRowHeight).toBeCloseTo(DEFAULT_OPENING_HEIGHT);
    expect(config.slideSpec.length).toBe(18);
    expect(config.kerfWidth).toBe(DEFAULTS.kerfWidth);
  });

  it("assigns correct wood thicknesses", () => {
    const config = createDefaultConfig();
    expect(config.woodAssignments.carcassTopBottom.id).toBe("ply-3/4");
    expect(config.woodAssignments.carcassBack.id).toBe("ply-1/4");
    expect(config.woodAssignments.drawerSides.id).toBe("ply-1/2");
    expect(config.woodAssignments.drawerBottom.id).toBe("ply-1/4");
  });

  it("generates unique IDs for columns and rows", () => {
    const rowIds = col(0).rows.map((r) => r.id);
    expect(new Set(rowIds).size).toBe(rowIds.length);
  });
});

describe("store actions", () => {
  describe("setUnit", () => {
    it("converts values when switching to cm", () => {
      useChestStore.getState().setUnit("cm");
      const config = useChestStore.getState().config;
      expect(config.unit).toBe("cm");
      expect(col(0).openingWidth).toBeCloseTo(DEFAULT_OPENING_WIDTH * 2.54, 4);
      expect(row(0, 0).openingHeight).toBeCloseTo(
        DEFAULT_OPENING_HEIGHT * 2.54,
        4,
      );
    });

    it("does not change values when setting same unit", () => {
      useChestStore.getState().setUnit("inches");
      expect(col(0).openingWidth).toBeCloseTo(DEFAULT_OPENING_WIDTH);
    });
  });

  describe("setConstraints", () => {
    it("sets constraints on the config", () => {
      useChestStore
        .getState()
        .setConstraints({ width: 30, height: 40, depth: 20 });
      expect(useChestStore.getState().config.constraints).toEqual({
        width: 30,
        height: 40,
        depth: 20,
      });
    });

    it("clears constraints when set to undefined", () => {
      useChestStore
        .getState()
        .setConstraints({ width: 30, height: 40, depth: 20 });
      useChestStore.getState().setConstraints(undefined);
      expect(useChestStore.getState().config.constraints).toBeUndefined();
    });
  });

  describe("setDrawerStyle", () => {
    it("updates drawer style", () => {
      useChestStore.getState().setDrawerStyle("inset");
      expect(useChestStore.getState().config.drawerStyle).toBe("inset");
    });
  });

  describe("setDefaultConstruction", () => {
    it("updates default construction method and recomputes heights", () => {
      useChestStore.getState().setDefaultConstruction("butt-through-sides");
      const config = useChestStore.getState().config;
      expect(config.defaultConstruction).toBe("butt-through-sides");
      // All rows should have recomputed opening heights
      const expectedHeight = openingHeightForBinUnits(
        4,
        "butt-through-sides",
        DEFAULTS.drawerVerticalClearance,
        findThickness("ply-1/4").actual,
        DEFAULTS.dadoGrooveOffset,
      );
      expect(row(0, 0).openingHeight).toBeCloseTo(expectedHeight);
    });
  });

  describe("setColumnCount", () => {
    it("adds columns when increasing count", () => {
      useChestStore.getState().setColumnCount(3);
      const cols = useChestStore.getState().config.columns;
      expect(cols).toHaveLength(3);
      expect(col(1).gridWidthUnits).toBe(7);
      expect(col(1).openingWidth).toBeCloseTo(DEFAULT_OPENING_WIDTH);
      expect(col(2).openingWidth).toBeCloseTo(DEFAULT_OPENING_WIDTH);
    });

    it("removes columns when decreasing count", () => {
      useChestStore.getState().setColumnCount(3);
      useChestStore.getState().setColumnCount(1);
      expect(useChestStore.getState().config.columns).toHaveLength(1);
    });

    it("does nothing for count < 1", () => {
      useChestStore.getState().setColumnCount(0);
      expect(useChestStore.getState().config.columns).toHaveLength(1);
    });

    it("generates unique IDs for new columns", () => {
      useChestStore.getState().setColumnCount(4);
      const ids = useChestStore.getState().config.columns.map((c) => c.id);
      expect(new Set(ids).size).toBe(4);
    });
  });

  describe("setColumnGridWidth", () => {
    it("updates grid width and recomputes opening width", () => {
      const colId = col(0).id;
      useChestStore.getState().setColumnGridWidth(colId, 10);
      expect(col(0).gridWidthUnits).toBe(10);
      const expectedWidth = openingWidthForGridUnits(
        10,
        findThickness("ply-1/2").actual,
        DEFAULTS.slideClearancePerSide,
      );
      expect(col(0).openingWidth).toBeCloseTo(expectedWidth);
    });
  });

  describe("setAllColumnGridWidths", () => {
    it("sets all columns to the same grid width", () => {
      useChestStore.getState().setColumnCount(3);
      useChestStore.getState().setAllColumnGridWidths(5);
      for (const c of useChestStore.getState().config.columns) {
        expect(c.gridWidthUnits).toBe(5);
      }
      expect(useChestStore.getState().config.defaultGridWidthUnits).toBe(5);
    });
  });

  describe("setRowCount", () => {
    it("adds rows to a column", () => {
      const colId = col(0).id;
      useChestStore.getState().setRowCount(colId, 5);
      expect(col(0).rows).toHaveLength(5);
    });

    it("removes rows from a column", () => {
      const colId = col(0).id;
      useChestStore.getState().setRowCount(colId, 1);
      expect(col(0).rows).toHaveLength(1);
    });

    it("new rows use default construction and bin height", () => {
      useChestStore.getState().setDefaultConstruction("butt-through-bottom");
      const colId = col(0).id;
      useChestStore.getState().setRowCount(colId, 4);
      const newRow = row(0, 3);
      expect(newRow.construction).toBe("butt-through-bottom");
      expect(newRow.binHeightUnits).toBe(4);
    });
  });

  describe("setRowBinHeight", () => {
    it("updates bin height and recomputes opening height", () => {
      const c = col(0);
      const rowId = row(0, 0).id;
      useChestStore.getState().setRowBinHeight(c.id, rowId, 8);
      expect(row(0, 0).binHeightUnits).toBe(8);
      const expectedHeight = openingHeightForBinUnits(
        8,
        "dado",
        DEFAULTS.drawerVerticalClearance,
        findThickness("ply-1/4").actual,
        DEFAULTS.dadoGrooveOffset,
      );
      expect(row(0, 0).openingHeight).toBeCloseTo(expectedHeight);
    });
  });

  describe("setAllRowBinHeights", () => {
    it("sets all rows in all columns to the same bin height", () => {
      useChestStore.getState().setColumnCount(2);
      useChestStore.getState().setAllRowBinHeights(6);
      for (const c of useChestStore.getState().config.columns) {
        for (const r of c.rows) {
          expect(r.binHeightUnits).toBe(6);
        }
      }
    });

    it("also updates defaultBinHeightUnits", () => {
      useChestStore.getState().setAllRowBinHeights(6);
      expect(useChestStore.getState().config.defaultBinHeightUnits).toBe(6);
    });
  });

  describe("setRowConstruction", () => {
    it("updates construction method and recomputes opening height", () => {
      const c = col(0);
      const rowId = row(0, 1).id;
      useChestStore
        .getState()
        .setRowConstruction(c.id, rowId, "butt-through-sides");
      expect(row(0, 1).construction).toBe("butt-through-sides");
      // Opening height should be recomputed for the new construction method
      const expectedHeight = openingHeightForBinUnits(
        4,
        "butt-through-sides",
        DEFAULTS.drawerVerticalClearance,
        findThickness("ply-1/4").actual,
        DEFAULTS.dadoGrooveOffset,
      );
      expect(row(0, 1).openingHeight).toBeCloseTo(expectedHeight);
    });
  });

  describe("wood assignments", () => {
    it("setWoodAssignment updates a specific assignment", () => {
      const hw = findThickness("hw-3/4");
      useChestStore.getState().setWoodAssignment("carcassTopBottom", hw);
      expect(
        useChestStore.getState().config.woodAssignments.carcassTopBottom.id,
      ).toBe("hw-3/4");
    });

    it("setWoodAssignment recomputes opening dimensions when drawer wood changes", () => {
      const widthBefore = col(0).openingWidth;
      const hw = findThickness("hw-3/4");
      useChestStore.getState().setWoodAssignment("drawerSides", hw);
      // Opening width should change because side thickness changed
      expect(col(0).openingWidth).not.toBeCloseTo(widthBefore);
    });

    it("setDrawerWoodOverride sets per-drawer override", () => {
      useChestStore.getState().setAdvancedWoodMode(true);
      const c = col(0);
      const rowId = row(0, 0).id;
      const hw = findThickness("hw-1/2");
      useChestStore
        .getState()
        .setDrawerWoodOverride(c.id, rowId, { sides: hw });
      expect(row(0, 0).woodOverride?.sides?.id).toBe("hw-1/2");
    });
  });

  describe("slide config", () => {
    it("setSlideLength updates slide length", () => {
      useChestStore.getState().setSlideLength(22);
      expect(useChestStore.getState().config.slideSpec.length).toBe(22);
    });

    it("setSlideClearance updates clearance and recomputes widths", () => {
      const widthBefore = col(0).openingWidth;
      useChestStore.getState().setSlideClearance(0.75);
      expect(useChestStore.getState().config.slideSpec.clearancePerSide).toBe(
        0.75,
      );
      // Opening width should change because clearance changed
      expect(col(0).openingWidth).not.toBeCloseTo(widthBefore);
    });
  });

  describe("horizontal rails", () => {
    it("setHorizontalRailsEnabled toggles rails", () => {
      useChestStore.getState().setHorizontalRailsEnabled(true);
      expect(useChestStore.getState().config.horizontalRails.enabled).toBe(
        true,
      );
    });

    it("setHorizontalRailThickness updates rail thickness", () => {
      const hw = findThickness("hw-3/4");
      useChestStore.getState().setHorizontalRailThickness(hw);
      expect(useChestStore.getState().config.horizontalRails.thickness.id).toBe(
        "hw-3/4",
      );
    });
  });
});

describe("save/load", () => {
  it("saves and loads a config by name", () => {
    useChestStore.getState().setColumnCount(2);
    useChestStore.getState().saveConfig("My Chest");

    useChestStore.getState().resetToDefaults();
    expect(useChestStore.getState().config.columns).toHaveLength(1);

    useChestStore.getState().loadConfig("My Chest");
    expect(useChestStore.getState().config.columns).toHaveLength(2);
    expect(useChestStore.getState().config.name).toBe("My Chest");
  });

  it("loading a non-existent config does nothing", () => {
    const before = useChestStore.getState().config;
    useChestStore.getState().loadConfig("nonexistent");
    expect(useChestStore.getState().config).toBe(before);
  });

  it("deleteConfig removes the saved config", () => {
    useChestStore.getState().saveConfig("To Delete");
    expect(useChestStore.getState().savedConfigs["To Delete"]).toBeDefined();
    useChestStore.getState().deleteConfig("To Delete");
    expect(useChestStore.getState().savedConfigs["To Delete"]).toBeUndefined();
  });
});

describe("export/import", () => {
  it("export produces valid JSON", () => {
    const json = useChestStore.getState().exportConfig();
    expect(() => JSON.parse(json) as unknown).not.toThrow();
  });

  it("import/export round-trips correctly", () => {
    useChestStore.getState().setColumnCount(2);
    useChestStore.getState().setAllRowBinHeights(8);
    const json = useChestStore.getState().exportConfig();

    useChestStore.getState().resetToDefaults();
    useChestStore.getState().importConfig(json);

    expect(useChestStore.getState().config.columns).toHaveLength(2);
    expect(row(0, 0).binHeightUnits).toBe(8);
  });

  it("import rejects invalid JSON", () => {
    expect(() => {
      useChestStore.getState().importConfig("not json");
    }).toThrow();
  });
});

describe("resetToDefaults", () => {
  it("restores the config to defaults", () => {
    useChestStore.getState().setColumnCount(4);
    useChestStore.getState().setAllRowBinHeights(10);
    useChestStore.getState().setDrawerStyle("inset");

    useChestStore.getState().resetToDefaults();

    const config = useChestStore.getState().config;
    expect(config.columns).toHaveLength(1);
    expect(config.drawerStyle).toBe("overlay");
    expect(config.defaultBinHeightUnits).toBe(4);
    expect(config.defaultRowHeight).toBeCloseTo(DEFAULT_OPENING_HEIGHT);
  });

  it("does not clear savedConfigs", () => {
    useChestStore.getState().saveConfig("Saved");
    useChestStore.getState().resetToDefaults();
    expect(useChestStore.getState().savedConfigs.Saved).toBeDefined();
  });
});

describe("selectors", () => {
  it("selectCarcassDimensions returns valid dimensions", () => {
    const dims = selectCarcassDimensions(useChestStore.getState().config);
    expect(dims.outerWidth).toBeGreaterThan(0);
    expect(dims.outerHeight).toBeGreaterThan(0);
    expect(dims.outerDepth).toBeGreaterThan(0);
  });

  it("selectAllDrawerBoxes returns one box per drawer", () => {
    useChestStore.getState().setColumnCount(2);
    const boxes = selectAllDrawerBoxes(useChestStore.getState().config);
    expect(boxes).toHaveLength(6);
  });

  it("selectAllCutPieces returns carcass and drawer pieces", () => {
    const pieces = selectAllCutPieces(useChestStore.getState().config);
    expect(pieces.length).toBeGreaterThan(0);
    const labels = pieces.map((p) => p.label);
    expect(labels.some((l) => l.startsWith("Carcass"))).toBe(true);
    expect(labels.some((l) => l.startsWith("Drawer"))).toBe(true);
  });

  it("selectRecommendRails returns false for small default config", () => {
    expect(selectRecommendRails(useChestStore.getState().config)).toBe(false);
  });

  it("selectRecommendedSlideLength returns a positive number", () => {
    expect(
      selectRecommendedSlideLength(useChestStore.getState().config),
    ).toBeGreaterThan(0);
  });
});

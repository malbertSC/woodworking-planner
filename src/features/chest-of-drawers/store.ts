import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULTS, WOOD_THICKNESSES } from "./constants.ts";
import type {
  ChestConfig,
  Column,
  Dimensions,
  DrawerBoxConstruction,
  DrawerRow,
  DrawerStyle,
  DrawerWoodOverride,
  Unit,
  WoodAssignments,
  WoodThickness,
} from "./types.ts";
import { convert } from "./calculations/units.ts";
import {
  openingWidthForGridUnits,
  openingHeightForBinUnits,
  gridfinityGridUnits,
  gridfinityMaxBinUnits,
  toMm,
} from "./calculations/gridfinity.ts";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- WOOD_THICKNESSES is a compile-time constant with known entries
const FALLBACK_THICKNESS = WOOD_THICKNESSES[0]!;

function findThickness(id: string): WoodThickness {
  return WOOD_THICKNESSES.find((t) => t.id === id) ?? FALLBACK_THICKNESS;
}

const DEFAULT_GRID_WIDTH_UNITS = 7;
const DEFAULT_BIN_HEIGHT_UNITS = 4;

/** Compute opening width from grid units using current config parameters. */
function computeOpeningWidth(gridUnits: number, config: ChestConfig): number {
  return openingWidthForGridUnits(
    gridUnits,
    config.woodAssignments.drawerSides.actual,
    config.slideSpec.clearancePerSide,
  );
}

/** Compute opening height from bin units using current config parameters. */
function computeOpeningHeight(
  binUnits: number,
  construction: DrawerBoxConstruction,
  config: ChestConfig,
): number {
  return openingHeightForBinUnits(
    binUnits,
    construction,
    config.drawerVerticalClearance,
    config.woodAssignments.drawerBottom.actual,
    config.dadoGrooveOffset,
  );
}

/** Recompute all opening dimensions from stored gridfinity units. */
function recomputeFromGridfinity(config: ChestConfig): ChestConfig {
  return {
    ...config,
    defaultRowHeight: computeOpeningHeight(
      config.defaultBinHeightUnits,
      config.defaultConstruction,
      config,
    ),
    columns: config.columns.map((col) => ({
      ...col,
      openingWidth: computeOpeningWidth(col.gridWidthUnits, config),
      rows: col.rows.map((row) =>
        row.heightMode === "direct"
          ? row
          : {
              ...row,
              openingHeight: computeOpeningHeight(
                row.binHeightUnits,
                row.construction,
                config,
              ),
            },
      ),
    })),
  };
}

function makeRow(
  construction: DrawerBoxConstruction,
  binHeightUnits: number,
  config: ChestConfig,
): DrawerRow {
  return {
    id: crypto.randomUUID(),
    openingHeight: computeOpeningHeight(binHeightUnits, construction, config),
    binHeightUnits,
    construction,
  };
}

function makeColumn(
  gridWidthUnits: number,
  rowCount: number,
  construction: DrawerBoxConstruction,
  binHeightUnits: number,
  config: ChestConfig,
): Column {
  return {
    id: crypto.randomUUID(),
    openingWidth: computeOpeningWidth(gridWidthUnits, config),
    gridWidthUnits,
    rows: Array.from({ length: rowCount }, () =>
      makeRow(construction, binHeightUnits, config),
    ),
  };
}

export function createDefaultConfig(): ChestConfig {
  const baseConfig: ChestConfig = {
    name: "Untitled Chest",
    unit: "inches",
    columns: [], // placeholder, filled below
    drawerStyle: "overlay",
    defaultConstruction: "dado",
    defaultRowHeight: 0, // placeholder, computed below
    defaultGridWidthUnits: DEFAULT_GRID_WIDTH_UNITS,
    defaultBinHeightUnits: DEFAULT_BIN_HEIGHT_UNITS,
    woodAssignments: {
      carcassTopBottom: findThickness("ply-3/4"),
      carcassSides: findThickness("ply-3/4"),
      carcassDividers: findThickness("ply-3/4"),
      carcassBack: findThickness("ply-1/4"),
      horizontalRails: findThickness("ply-3/4"),
      drawerSides: findThickness("ply-1/2"),
      drawerFrontBack: findThickness("ply-1/2"),
      drawerBottom: findThickness("ply-1/4"),
      drawerFace: findThickness("ply-3/4"),
    },
    advancedWoodMode: false,
    slideSpec: {
      length: 18,
      clearancePerSide: DEFAULTS.slideClearancePerSide,
      minMountingHeight: DEFAULTS.slideMinMountingHeight,
    },
    horizontalRails: {
      enabled: false,
      thickness: findThickness("ply-3/4"),
      width: DEFAULTS.horizontalRailWidth,
    },
    kerfWidth: DEFAULTS.kerfWidth,
    dadoGrooveDepth: DEFAULTS.dadoGrooveDepth,
    dadoGrooveOffset: DEFAULTS.dadoGrooveOffset,
    overlayOverlap: DEFAULTS.overlayOverlap,
    insetRevealGap: DEFAULTS.insetRevealGap,
    drawerVerticalClearance: DEFAULTS.drawerVerticalClearance,
    drawerBackClearance: DEFAULTS.drawerBackClearance,
  };

  // Compute default row height and column from gridfinity units
  baseConfig.defaultRowHeight = computeOpeningHeight(
    DEFAULT_BIN_HEIGHT_UNITS,
    baseConfig.defaultConstruction,
    baseConfig,
  );
  baseConfig.columns = [
    makeColumn(
      DEFAULT_GRID_WIDTH_UNITS,
      3,
      baseConfig.defaultConstruction,
      DEFAULT_BIN_HEIGHT_UNITS,
      baseConfig,
    ),
  ];

  return baseConfig;
}

function convertConfigValues(config: ChestConfig, to: Unit): ChestConfig {
  const from = config.unit;
  if (from === to) return config;
  const c = (v: number) => convert(v, from, to);

  return {
    ...config,
    unit: to,
    constraints: config.constraints
      ? {
          width: c(config.constraints.width),
          height: c(config.constraints.height),
          depth: c(config.constraints.depth),
        }
      : undefined,
    columns: config.columns.map((col) => ({
      ...col,
      openingWidth: c(col.openingWidth),
      rows: col.rows.map((row) => ({
        ...row,
        openingHeight: c(row.openingHeight),
      })),
    })),
    defaultRowHeight: c(config.defaultRowHeight),
    slideSpec: {
      ...config.slideSpec,
      length: c(config.slideSpec.length),
      clearancePerSide: c(config.slideSpec.clearancePerSide),
      minMountingHeight: c(config.slideSpec.minMountingHeight),
    },
    horizontalRails: {
      ...config.horizontalRails,
      width: c(config.horizontalRails.width),
    },
    kerfWidth: c(config.kerfWidth),
    dadoGrooveDepth: c(config.dadoGrooveDepth),
    dadoGrooveOffset: c(config.dadoGrooveOffset),
    overlayOverlap: c(config.overlayOverlap),
    insetRevealGap: c(config.insetRevealGap),
    drawerVerticalClearance: c(config.drawerVerticalClearance),
    drawerBackClearance: c(config.drawerBackClearance),
  };
}

/**
 * Migrate v0 persisted state (no gridfinity fields) to v1 (gridfinity-first).
 * Reverse-computes gridfinity units from existing opening dimensions.
 *
 * V0 shape: Column had no gridWidthUnits, DrawerRow had no binHeightUnits,
 * ChestConfig had no defaultGridWidthUnits or defaultBinHeightUnits.
 */
interface V0Column {
  id: string;
  openingWidth: number;
  rows: V0DrawerRow[];
}
interface V0DrawerRow {
  id: string;
  openingHeight: number;
  construction: "dado" | "butt-through-sides" | "butt-through-bottom";
}
interface V0Config {
  unit: Unit;
  slideSpec: { clearancePerSide: number };
  woodAssignments: {
    drawerSides: { actual: number };
    drawerBottom: { actual: number };
  };
  drawerVerticalClearance: number;
  dadoGrooveOffset: number;
  columns: V0Column[];
}

function migrateV0ToV1(
  persisted: Record<string, unknown>,
): Record<string, unknown> {
  const config = persisted.config as V0Config | undefined;
  if (!config) return persisted;

  const unit = config.unit;
  const clearance = config.slideSpec.clearancePerSide;
  const sideThickness = config.woodAssignments.drawerSides.actual;
  const bottomThickness = config.woodAssignments.drawerBottom.actual;
  const vertClearance = config.drawerVerticalClearance;
  const dadoOffset = config.dadoGrooveOffset;

  const migratedColumns = config.columns.map((col) => {
    const interiorWidth = col.openingWidth - 2 * clearance - 2 * sideThickness;
    const widthMm = toMm(interiorWidth, unit);
    const gridWidthUnits = Math.max(1, gridfinityGridUnits(widthMm));

    const migratedRows = col.rows.map((row) => {
      const construction = row.construction;
      let usableHeight = row.openingHeight - vertClearance - bottomThickness;
      if (construction === "dado") {
        usableHeight -= dadoOffset;
      }
      const heightMm = toMm(Math.max(0, usableHeight), unit);
      const binHeightUnits = Math.max(1, gridfinityMaxBinUnits(heightMm));

      return { ...row, binHeightUnits };
    });

    return { ...col, gridWidthUnits, rows: migratedRows };
  });

  return {
    ...persisted,
    config: {
      ...(config as unknown as Record<string, unknown>),
      columns: migratedColumns,
      defaultGridWidthUnits: DEFAULT_GRID_WIDTH_UNITS,
      defaultBinHeightUnits: DEFAULT_BIN_HEIGHT_UNITS,
    },
  };
}

interface ChestStore {
  config: ChestConfig;
  savedConfigs: Record<string, ChestConfig>;

  setUnit: (unit: Unit) => void;
  setConstraints: (constraints: Dimensions | undefined) => void;
  setDrawerStyle: (style: DrawerStyle) => void;
  setDefaultConstruction: (method: DrawerBoxConstruction) => void;
  setKerfWidth: (kerf: number) => void;
  setAdvancedWoodMode: (advanced: boolean) => void;

  setColumnCount: (count: number) => void;
  setColumnGridWidth: (columnId: string, gridUnits: number) => void;
  setAllColumnGridWidths: (gridUnits: number) => void;
  setRowCount: (columnId: string, count: number) => void;
  setRowBinHeight: (columnId: string, rowId: string, binUnits: number) => void;
  setAllRowBinHeights: (binUnits: number) => void;
  setRowDirectHeight: (columnId: string, rowId: string, height: number) => void;
  resetRowToGridfinity: (columnId: string, rowId: string) => void;
  setRowConstruction: (
    columnId: string,
    rowId: string,
    method: DrawerBoxConstruction,
  ) => void;

  setWoodAssignment: (
    key: keyof WoodAssignments,
    thickness: WoodThickness,
  ) => void;
  setDrawerWoodOverride: (
    columnId: string,
    rowId: string,
    override: DrawerWoodOverride,
  ) => void;

  setSlideLength: (length: number) => void;
  setSlideClearance: (clearance: number) => void;

  setHorizontalRailsEnabled: (enabled: boolean) => void;
  setHorizontalRailThickness: (thickness: WoodThickness) => void;
  setHorizontalRailWidth: (width: number) => void;

  saveConfig: (name: string) => void;
  loadConfig: (name: string) => void;
  deleteConfig: (name: string) => void;
  exportConfig: () => string;
  importConfig: (json: string) => void;

  resetToDefaults: () => void;
}

function updateColumn(
  columns: Column[],
  columnId: string,
  updater: (col: Column) => Column,
): Column[] {
  return columns.map((col) => (col.id === columnId ? updater(col) : col));
}

function updateRow(
  rows: DrawerRow[],
  rowId: string,
  updater: (row: DrawerRow) => DrawerRow,
): DrawerRow[] {
  return rows.map((row) => (row.id === rowId ? updater(row) : row));
}

type SetState = (
  fn: (state: { config: ChestConfig }) => { config: ChestConfig },
) => void;

function setConfigField<K extends keyof ChestConfig>(
  set: SetState,
  key: K,
  value: ChestConfig[K],
) {
  set((state) => ({ config: { ...state.config, [key]: value } }));
}

export const useChestStore = create<ChestStore>()(
  persist(
    (set, get) => ({
      config: createDefaultConfig(),
      savedConfigs: {},

      setUnit: (unit) => {
        set((state) => ({
          config: convertConfigValues(state.config, unit),
        }));
      },

      setConstraints: (constraints) => {
        setConfigField(set, "constraints", constraints);
      },
      setDrawerStyle: (style) => {
        setConfigField(set, "drawerStyle", style);
      },
      setDefaultConstruction: (method) => {
        set((state) => {
          const updated: ChestConfig = {
            ...state.config,
            defaultConstruction: method,
            columns: state.config.columns.map((col) => ({
              ...col,
              rows: col.rows.map((row) => ({
                ...row,
                construction: method,
              })),
            })),
          };
          return { config: recomputeFromGridfinity(updated) };
        });
      },
      setKerfWidth: (kerf) => {
        setConfigField(set, "kerfWidth", kerf);
      },
      setAdvancedWoodMode: (advanced) => {
        setConfigField(set, "advancedWoodMode", advanced);
      },

      setColumnCount: (count) => {
        set((state) => {
          const { config } = state;
          const current = config.columns;
          if (count === current.length || count < 1) return state;

          if (count < current.length) {
            return { config: { ...config, columns: current.slice(0, count) } };
          }

          const lastCol = current[current.length - 1];
          if (!lastCol) return state;
          const newColumns = Array.from(
            { length: count - current.length },
            () =>
              makeColumn(
                lastCol.gridWidthUnits,
                lastCol.rows.length,
                config.defaultConstruction,
                config.defaultBinHeightUnits,
                config,
              ),
          );
          return {
            config: { ...config, columns: [...current, ...newColumns] },
          };
        });
      },

      setColumnGridWidth: (columnId, gridUnits) => {
        set((state) => {
          const { config } = state;
          const openingWidth = computeOpeningWidth(gridUnits, config);
          return {
            config: {
              ...config,
              columns: updateColumn(config.columns, columnId, (col) => ({
                ...col,
                gridWidthUnits: gridUnits,
                openingWidth,
              })),
            },
          };
        });
      },

      setAllColumnGridWidths: (gridUnits) => {
        set((state) => {
          const { config } = state;
          const openingWidth = computeOpeningWidth(gridUnits, config);
          return {
            config: {
              ...config,
              defaultGridWidthUnits: gridUnits,
              columns: config.columns.map((col) => ({
                ...col,
                gridWidthUnits: gridUnits,
                openingWidth,
              })),
            },
          };
        });
      },

      setRowCount: (columnId, count) => {
        set((state) => {
          const { config } = state;
          return {
            config: {
              ...config,
              columns: updateColumn(config.columns, columnId, (col) => {
                if (count === col.rows.length || count < 1) return col;
                if (count < col.rows.length) {
                  return { ...col, rows: col.rows.slice(0, count) };
                }
                const newRows = Array.from(
                  { length: count - col.rows.length },
                  () =>
                    makeRow(
                      config.defaultConstruction,
                      config.defaultBinHeightUnits,
                      config,
                    ),
                );
                return { ...col, rows: [...col.rows, ...newRows] };
              }),
            },
          };
        });
      },

      setRowBinHeight: (columnId, rowId, binUnits) => {
        set((state) => {
          const { config } = state;
          return {
            config: {
              ...config,
              columns: updateColumn(config.columns, columnId, (col) => ({
                ...col,
                rows: updateRow(col.rows, rowId, (row) => ({
                  ...row,
                  heightMode: undefined,
                  binHeightUnits: binUnits,
                  openingHeight: computeOpeningHeight(
                    binUnits,
                    row.construction,
                    config,
                  ),
                })),
              })),
            },
          };
        });
      },

      setAllRowBinHeights: (binUnits) => {
        set((state) => {
          const { config } = state;
          return {
            config: {
              ...config,
              defaultBinHeightUnits: binUnits,
              defaultRowHeight: computeOpeningHeight(
                binUnits,
                config.defaultConstruction,
                config,
              ),
              columns: config.columns.map((col) => ({
                ...col,
                rows: col.rows.map((row) => ({
                  ...row,
                  heightMode: undefined,
                  binHeightUnits: binUnits,
                  openingHeight: computeOpeningHeight(
                    binUnits,
                    row.construction,
                    config,
                  ),
                })),
              })),
            },
          };
        });
      },

      setRowDirectHeight: (columnId, rowId, height) => {
        set((state) => {
          const { config } = state;
          return {
            config: {
              ...config,
              columns: updateColumn(config.columns, columnId, (col) => ({
                ...col,
                rows: updateRow(col.rows, rowId, (row) => ({
                  ...row,
                  heightMode: "direct" as const,
                  openingHeight: height,
                })),
              })),
            },
          };
        });
      },

      resetRowToGridfinity: (columnId, rowId) => {
        set((state) => {
          const { config } = state;
          return {
            config: {
              ...config,
              columns: updateColumn(config.columns, columnId, (col) => ({
                ...col,
                rows: updateRow(col.rows, rowId, (row) => ({
                  ...row,
                  heightMode: undefined,
                  openingHeight: computeOpeningHeight(
                    row.binHeightUnits,
                    row.construction,
                    config,
                  ),
                })),
              })),
            },
          };
        });
      },

      setRowConstruction: (columnId, rowId, method) => {
        set((state) => {
          const { config } = state;
          return {
            config: {
              ...config,
              columns: updateColumn(config.columns, columnId, (col) => ({
                ...col,
                rows: updateRow(col.rows, rowId, (row) => ({
                  ...row,
                  construction: method,
                  openingHeight: computeOpeningHeight(
                    row.binHeightUnits,
                    method,
                    config,
                  ),
                })),
              })),
            },
          };
        });
      },

      setWoodAssignment: (key, thickness) => {
        set((state) => {
          const updated: ChestConfig = {
            ...state.config,
            woodAssignments: {
              ...state.config.woodAssignments,
              [key]: thickness,
            },
          };
          // Recompute if drawer side or bottom thickness changed
          if (key === "drawerSides" || key === "drawerBottom") {
            return { config: recomputeFromGridfinity(updated) };
          }
          return { config: updated };
        });
      },

      setDrawerWoodOverride: (columnId, rowId, override) => {
        set((state) => ({
          config: {
            ...state.config,
            columns: updateColumn(state.config.columns, columnId, (col) => ({
              ...col,
              rows: updateRow(col.rows, rowId, (row) => ({
                ...row,
                woodOverride: override,
              })),
            })),
          },
        }));
      },

      setSlideLength: (length) => {
        set((state) => ({
          config: {
            ...state.config,
            slideSpec: { ...state.config.slideSpec, length },
          },
        }));
      },

      setSlideClearance: (clearance) => {
        set((state) => {
          const updated: ChestConfig = {
            ...state.config,
            slideSpec: {
              ...state.config.slideSpec,
              clearancePerSide: clearance,
            },
          };
          // Clearance affects opening width calculation
          return { config: recomputeFromGridfinity(updated) };
        });
      },

      setHorizontalRailsEnabled: (enabled) => {
        set((state) => ({
          config: {
            ...state.config,
            horizontalRails: { ...state.config.horizontalRails, enabled },
          },
        }));
      },

      setHorizontalRailThickness: (thickness) => {
        set((state) => ({
          config: {
            ...state.config,
            horizontalRails: { ...state.config.horizontalRails, thickness },
          },
        }));
      },

      setHorizontalRailWidth: (width) => {
        set((state) => ({
          config: {
            ...state.config,
            horizontalRails: { ...state.config.horizontalRails, width },
          },
        }));
      },

      saveConfig: (name) => {
        set((state) => ({
          config: { ...state.config, name },
          savedConfigs: {
            ...state.savedConfigs,
            [name]: { ...state.config, name },
          },
        }));
      },

      loadConfig: (name) => {
        const saved = get().savedConfigs[name];
        if (saved) {
          set({ config: saved });
        }
      },

      deleteConfig: (name) => {
        set((state) => ({
          savedConfigs: Object.fromEntries(
            Object.entries(state.savedConfigs).filter(([key]) => key !== name),
          ),
        }));
      },

      exportConfig: () => {
        return JSON.stringify(get().config);
      },

      importConfig: (json) => {
        const parsed = JSON.parse(json) as ChestConfig;
        set({ config: parsed });
      },

      resetToDefaults: () => {
        set({ config: createDefaultConfig() });
      },
    }),
    {
      name: "chest-of-drawers-store",
      version: 2,
      migrate: (persisted, version) => {
        let data = persisted as Record<string, unknown>;
        if (version === 0) {
          data = migrateV0ToV1(data);
        }
        // v1→v2: added per-row heightMode (optional field, no data migration needed)
        return data;
      },
    },
  ),
);

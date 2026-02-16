import { useState } from "react";
import { useChestStore } from "../../store.ts";
import type { ChestConfig, DrawerBoxConstruction } from "../../types.ts";
import { getColumnInnerHeight } from "../../calculations/carcass.ts";
import { formatDimension } from "../../calculations/units.ts";
import { toMm, gridfinityMaxBinUnits } from "../../calculations/gridfinity.ts";
import NumberInput from "../ui/NumberInput.tsx";
import WarningIcon from "../ui/WarningIcon.tsx";

/** Estimate the max gridfinity bin units that fit a given opening height. */
function approxBinUnits(
  openingHeight: number,
  construction: DrawerBoxConstruction,
  config: ChestConfig,
): number {
  const vertClearance = config.drawerVerticalClearance;
  const bottomThickness = config.woodAssignments.drawerBottom.actual;
  const dadoOffset = config.dadoGrooveOffset;

  let usable = openingHeight - vertClearance - bottomThickness;
  if (construction === "dado") usable -= dadoOffset;
  if (usable <= 0) return 0;

  const usableMm = toMm(usable, config.unit);
  return gridfinityMaxBinUnits(usableMm);
}

export default function DrawerHeightConfig() {
  const config = useChestStore((s) => s.config);
  const columns = config.columns;
  const unit = config.unit;
  const setRowBinHeight = useChestStore((s) => s.setRowBinHeight);
  const setAllRowBinHeights = useChestStore((s) => s.setAllRowBinHeights);
  const setRowDirectHeight = useChestStore((s) => s.setRowDirectHeight);
  const resetRowToGridfinity = useChestStore((s) => s.resetRowToGridfinity);

  const [bulkBinUnits, setBulkBinUnits] = useState(
    config.defaultBinHeightUnits,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <NumberInput
          label="Set all to"
          value={bulkBinUnits}
          onChange={setBulkBinUnits}
          min={1}
          max={12}
          step={1}
          suffix="u bins"
        />
        <button
          type="button"
          onClick={() => {
            setAllRowBinHeights(bulkBinUnits);
          }}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Apply
        </button>
      </div>

      <div className="space-y-3">
        {columns.map((col, ci) => (
          <div key={col.id}>
            {columns.length > 1 && (
              <p className="mb-1 text-xs font-semibold text-stone-600">
                Column {String(ci + 1)}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {col.rows.map((row, ri) => {
                const isDirect = row.heightMode === "direct";

                if (isDirect) {
                  const maxUnits = approxBinUnits(
                    row.openingHeight,
                    row.construction,
                    config,
                  );
                  return (
                    <div key={row.id}>
                      <NumberInput
                        label={`Row ${String(ri + 1)}`}
                        value={row.openingHeight}
                        onChange={(v) => {
                          setRowDirectHeight(col.id, row.id, v);
                        }}
                        min={0.5}
                        step={unit === "inches" ? 0.125 : 0.1}
                        suffix={unit === "inches" ? '"' : "cm"}
                        unit={unit}
                      />
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <p className="text-xs text-stone-500">
                          Fits {String(maxUnits)}u bins
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            resetRowToGridfinity(col.id, row.id);
                          }}
                          className="text-xs text-amber-700 hover:text-amber-800"
                        >
                          reset
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={row.id}>
                    <NumberInput
                      label={`Row ${String(ri + 1)}`}
                      value={row.binHeightUnits}
                      onChange={(v) => {
                        setRowBinHeight(col.id, row.id, v);
                      }}
                      min={1}
                      max={12}
                      step={1}
                      suffix="u"
                    />
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <p className="text-xs text-stone-500">
                        Opening: {formatDimension(row.openingHeight, unit)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRowDirectHeight(col.id, row.id, row.openingHeight);
                        }}
                        className="text-xs text-amber-700 hover:text-amber-800"
                        title="Override with a custom opening height"
                      >
                        override
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ColumnHeightMismatchWarning config={config} />
    </div>
  );
}

function ColumnHeightMismatchWarning({ config }: { config: ChestConfig }) {
  if (config.columns.length < 2) return null;

  const heights = config.columns.map((col) =>
    getColumnInnerHeight(col, config),
  );
  const firstHeight = heights[0];
  const allEqual =
    firstHeight !== undefined && heights.every((h) => h === firstHeight);
  if (allEqual) return null;

  const suffix = config.unit === "inches" ? '"' : "cm";

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <p className="flex items-center font-medium">
        <WarningIcon />
        Column heights are not equal
      </p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {config.columns.map((col, i) => (
          <li key={col.id}>
            Column {String(i + 1)}:{" "}
            {formatDimension(getColumnInnerHeight(col, config), config.unit)}
            {suffix}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useState } from "react";
import { useChestStore } from "../../store.ts";
import type { ChestConfig } from "../../types.ts";
import { getColumnInnerHeight } from "../../calculations/carcass.ts";
import { formatDimension } from "../../calculations/units.ts";
import NumberInput from "../ui/NumberInput.tsx";
import WarningIcon from "../ui/WarningIcon.tsx";

export default function DrawerHeightConfig() {
  const config = useChestStore((s) => s.config);
  const columns = config.columns;
  const unit = config.unit;
  const setRowBinHeight = useChestStore((s) => s.setRowBinHeight);
  const setAllRowBinHeights = useChestStore((s) => s.setAllRowBinHeights);

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
              {col.rows.map((row, ri) => (
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
                  <p className="mt-0.5 text-xs text-stone-500">
                    Opening: {formatDimension(row.openingHeight, unit)}
                  </p>
                </div>
              ))}
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
  const allEqual = heights.every((h) => h === heights[0]);
  if (allEqual) return null;

  const suffix = config.unit === "inches" ? '"' : "cm";

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <p className="flex items-center font-medium">
        <WarningIcon />
        Column heights are not equal
      </p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {heights.map((h, i) => (
          <li key={config.columns[i].id}>
            Column {String(i + 1)}: {formatDimension(h, config.unit)}
            {suffix}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useChestStore } from "../../store.ts";
import { calculateDrawerBox } from "../../calculations/drawer.ts";
import { toMm, gridfinityGridUnits } from "../../calculations/gridfinity.ts";
import { formatDimension } from "../../calculations/units.ts";
import NumberInput from "../ui/NumberInput.tsx";

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const labelId = `${label.toLowerCase().replace(/\s+/g, "-")}-label`;
  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-labelledby={labelId}
    >
      <span id={labelId} className="text-xs font-medium text-stone-600">
        {label}
      </span>
      <div className="flex items-center rounded border border-stone-300 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            onChange(Math.max(min, value - 1));
          }}
          disabled={value <= min}
          className="px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          -
        </button>
        <span
          className="px-3 py-1 text-sm font-medium text-stone-800 min-w-[2rem] text-center"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(Math.min(max, value + 1));
          }}
          disabled={value >= max}
          className="px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-40"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function GridfinityDepthInfo({
  column,
  config,
}: {
  column: import("../../types.ts").Column;
  config: import("../../types.ts").ChestConfig;
}) {
  const firstRow = column.rows[0];
  if (!firstRow) return null;

  const box = calculateDrawerBox(firstRow, column, config);
  const depthMm = toMm(box.usableInteriorDepth, config.unit);
  const gridL = gridfinityGridUnits(depthMm);

  return (
    <span className="text-stone-500">
      {gridL > 0 ? `${String(gridL)}L deep` : "too shallow for grid"}
    </span>
  );
}

export default function ColumnRowConfig() {
  const config = useChestStore((s) => s.config);
  const columns = config.columns;
  const unit = config.unit;
  const setColumnCount = useChestStore((s) => s.setColumnCount);
  const setColumnGridWidth = useChestStore((s) => s.setColumnGridWidth);
  const setRowCount = useChestStore((s) => s.setRowCount);

  return (
    <div className="space-y-4">
      <Stepper
        label="Columns"
        value={columns.length}
        onChange={setColumnCount}
        min={1}
        max={6}
      />

      <div className="space-y-3">
        {columns.map((col, i) => (
          <div
            key={col.id}
            className="rounded border border-stone-200 bg-stone-50 p-3"
          >
            <p className="mb-2 text-xs font-semibold text-stone-700">
              {columns.length > 1 ? `Column ${String(i + 1)}` : "Column"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Grid Width"
                value={col.gridWidthUnits}
                onChange={(v) => {
                  setColumnGridWidth(col.id, v);
                }}
                min={1}
                max={20}
                step={1}
                suffix=" units"
              />
              <Stepper
                label="Rows"
                value={col.rows.length}
                onChange={(v) => {
                  setRowCount(col.id, v);
                }}
                min={1}
                max={10}
              />
            </div>
            <p className="mt-2 text-xs text-stone-500">
              <span className="font-medium text-stone-600">Opening:</span>{" "}
              {formatDimension(col.openingWidth, unit)} wide
              {" \u00b7 "}
              <GridfinityDepthInfo column={col} config={config} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

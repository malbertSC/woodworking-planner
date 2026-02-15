import { STOCK_SHEETS } from "../../constants.ts";
import { formatDimension } from "../../calculations/units.ts";
import type { StockSheet, Unit, WoodThickness } from "../../types.ts";

interface StockSelection {
  thickness: WoodThickness;
  sheet: StockSheet;
}

interface StockConfigProps {
  thicknesses: WoodThickness[];
  selections: Map<string, StockSheet>;
  unit: Unit;
  onSelect: (thicknessId: string, sheet: StockSheet) => void;
}

function makeStockSheet(
  preset: (typeof STOCK_SHEETS)[number],
  thickness: WoodThickness,
): StockSheet {
  return {
    id: `stock-${thickness.id}-${String(preset.width)}x${String(preset.height)}`,
    label: preset.label,
    width: preset.width,
    height: preset.height,
    thickness,
  };
}

function getDefaultSheet(thickness: WoodThickness): StockSheet {
  const preset = STOCK_SHEETS[0];
  return makeStockSheet(preset, thickness);
}

export function getStockSelection(
  thicknesses: WoodThickness[],
  selections: Map<string, StockSheet>,
): StockSelection[] {
  return thicknesses.map((t) => ({
    thickness: t,
    sheet: selections.get(t.id) ?? getDefaultSheet(t),
  }));
}

export default function StockConfig({
  thicknesses,
  selections,
  unit,
  onSelect,
}: StockConfigProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-stone-700">
        Stock Sheet Sizes
      </h4>
      {thicknesses.map((thickness) => {
        const current =
          selections.get(thickness.id) ?? getDefaultSheet(thickness);
        return (
          <div key={thickness.id} className="flex items-center gap-3 text-sm">
            <span className="min-w-[140px] text-stone-600">
              {thickness.nominal} ({formatDimension(thickness.actual, unit)})
            </span>
            <select
              className="border border-stone-300 rounded px-2 py-1 text-sm bg-white"
              value={`${String(current.width)}x${String(current.height)}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split("x").map(Number);
                if (w && h) {
                  const preset = STOCK_SHEETS.find(
                    (s) => s.width === w && s.height === h,
                  );
                  if (preset) {
                    onSelect(thickness.id, makeStockSheet(preset, thickness));
                  }
                }
              }}
            >
              {STOCK_SHEETS.map((preset) => (
                <option
                  key={preset.label}
                  value={`${String(preset.width)}x${String(preset.height)}`}
                >
                  {preset.label} ({formatDimension(preset.width, unit)} x{" "}
                  {formatDimension(preset.height, unit)})
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

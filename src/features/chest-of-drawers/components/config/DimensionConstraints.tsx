import { useChestStore } from "../../store.ts";
import { selectCarcassDimensions } from "../../selectors.ts";
import { formatDimension } from "../../calculations/units.ts";
import NumberInput from "../ui/NumberInput.tsx";

export default function DimensionConstraints() {
  const config = useChestStore((s) => s.config);
  const setConstraints = useChestStore((s) => s.setConstraints);
  const { constraints } = config;
  const carcass = selectCarcassDimensions(config);
  const unit = config.unit;
  const suffix = unit === "inches" ? '"' : "cm";

  function toggle() {
    if (constraints) {
      setConstraints(undefined);
    } else {
      setConstraints({ width: 48, height: 72, depth: 24 });
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={constraints !== undefined}
          onChange={toggle}
          className="rounded border-stone-300 accent-amber-600"
        />
        Enable dimension constraints
      </label>

      {constraints && (
        <div className="grid grid-cols-3 gap-3">
          <NumberInput
            label="Max Width"
            value={constraints.width}
            onChange={(v) => {
              setConstraints({ ...constraints, width: v });
            }}
            min={1}
            suffix={suffix}
            unit={unit}
          />
          <NumberInput
            label="Max Height"
            value={constraints.height}
            onChange={(v) => {
              setConstraints({ ...constraints, height: v });
            }}
            min={1}
            suffix={suffix}
            unit={unit}
          />
          <NumberInput
            label="Max Depth"
            value={constraints.depth}
            onChange={(v) => {
              setConstraints({ ...constraints, depth: v });
            }}
            min={1}
            suffix={suffix}
            unit={unit}
          />
        </div>
      )}

      <div className="rounded bg-stone-50 p-2 text-xs text-stone-600">
        <p className="font-medium text-stone-700">Calculated Dimensions</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <span>
            W: {formatDimension(carcass.outerWidth, unit)}
            {constraints && carcass.outerWidth > constraints.width && (
              <span className="ml-1 text-red-600">!</span>
            )}
          </span>
          <span>
            H: {formatDimension(carcass.outerHeight, unit)}
            {constraints && carcass.outerHeight > constraints.height && (
              <span className="ml-1 text-red-600">!</span>
            )}
          </span>
          <span>
            D: {formatDimension(carcass.outerDepth, unit)}
            {constraints && carcass.outerDepth > constraints.depth && (
              <span className="ml-1 text-red-600">!</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

import { useChestStore } from "../../store.ts";

export default function UnitSelector() {
  const unit = useChestStore((s) => s.config.unit);
  const setUnit = useChestStore((s) => s.setUnit);

  return (
    <fieldset>
      <legend className="text-xs font-medium text-stone-600">Units</legend>
      <div className="mt-1 flex rounded-md border border-stone-300 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            setUnit("inches");
          }}
          className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
            unit === "inches"
              ? "bg-amber-600 text-white"
              : "bg-white text-stone-600 hover:bg-stone-50"
          }`}
          aria-pressed={unit === "inches"}
        >
          Inches
        </button>
        <button
          type="button"
          onClick={() => {
            setUnit("cm");
          }}
          className={`flex-1 px-3 py-1.5 text-sm font-medium border-l border-stone-300 transition-colors ${
            unit === "cm"
              ? "bg-amber-600 text-white"
              : "bg-white text-stone-600 hover:bg-stone-50"
          }`}
          aria-pressed={unit === "cm"}
        >
          Centimeters
        </button>
      </div>
    </fieldset>
  );
}

import { useChestStore } from "../../store.ts";
import { selectRecommendRails } from "../../selectors.ts";
import NumberInput from "../ui/NumberInput.tsx";
import ThicknessSelect from "../ui/ThicknessSelect.tsx";

export default function HorizontalRailConfig() {
  const config = useChestStore((s) => s.config);
  const setEnabled = useChestStore((s) => s.setHorizontalRailsEnabled);
  const setThickness = useChestStore((s) => s.setHorizontalRailThickness);
  const setRailWidth = useChestStore((s) => s.setHorizontalRailWidth);
  const rails = config.horizontalRails;
  const shouldRecommend = selectRecommendRails(config);
  const suffix = config.unit === "inches" ? '"' : "cm";

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={rails.enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
          }}
          className="rounded border-stone-300 accent-amber-600"
        />
        Enable horizontal rails
      </label>

      {!rails.enabled && shouldRecommend && (
        <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
          Horizontal rails are recommended for chests wider than 36&quot; or
          taller than 48&quot;, or with more than 5 rows per column. They add
          rigidity and provide mounting surfaces for drawer slides.
        </div>
      )}

      {rails.enabled && (
        <div className="grid grid-cols-2 gap-3">
          <ThicknessSelect
            label="Rail Thickness"
            value={rails.thickness}
            onChange={setThickness}
          />
          <NumberInput
            label="Rail Width (front-to-back)"
            value={rails.width}
            onChange={setRailWidth}
            min={1}
            max={6}
            suffix={suffix}
            unit={config.unit}
          />
        </div>
      )}
    </div>
  );
}

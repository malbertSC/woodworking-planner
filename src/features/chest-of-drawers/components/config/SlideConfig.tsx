import { useChestStore } from "../../store.ts";
import {
  selectAllDrawerBoxes,
  selectRecommendedSlideLength,
} from "../../selectors.ts";
import { STANDARD_SLIDE_LENGTHS } from "../../constants.ts";
import Select from "../ui/Select.tsx";
import NumberInput from "../ui/NumberInput.tsx";

export default function SlideConfig() {
  const config = useChestStore((s) => s.config);
  const setSlideLength = useChestStore((s) => s.setSlideLength);
  const setSlideClearance = useChestStore((s) => s.setSlideClearance);

  const recommended = selectRecommendedSlideLength(config);
  const drawerBoxes = selectAllDrawerBoxes(config);

  const slideWarnings = drawerBoxes.filter((box) =>
    box.warnings.some((w) => w.type === "slide-height"),
  );

  const suffix = config.unit === "inches" ? '"' : "cm";

  const options = STANDARD_SLIDE_LENGTHS.map((len) => ({
    value: String(len),
    label: `${String(len)}"`,
    badge: len === recommended ? "recommended" : undefined,
  }));

  return (
    <div className="space-y-3">
      <Select
        label="Slide Length"
        value={String(config.slideSpec.length)}
        onChange={(v) => {
          setSlideLength(Number(v));
        }}
        options={options}
      />

      <NumberInput
        label="Clearance Per Side"
        value={config.slideSpec.clearancePerSide}
        onChange={setSlideClearance}
        min={0.25}
        max={1}
        step={0.0625}
        suffix={suffix}
        unit={config.unit}
      />

      {slideWarnings.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          {slideWarnings.length} drawer opening
          {slideWarnings.length > 1 ? "s are" : " is"} shorter than the minimum
          slide mounting height ({String(config.slideSpec.minMountingHeight)}
          {suffix}).
        </div>
      )}
    </div>
  );
}

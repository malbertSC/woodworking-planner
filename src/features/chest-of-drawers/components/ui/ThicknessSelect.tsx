import { WOOD_THICKNESSES } from "../../constants.ts";
import type { WoodThickness } from "../../types.ts";
import Select from "./Select.tsx";

const thicknessOptions = WOOD_THICKNESSES.map((t) => ({
  value: t.id,
  label: `${t.nominal} (${String(t.actual)}")`,
}));

export default function ThicknessSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: WoodThickness;
  onChange: (t: WoodThickness) => void;
}) {
  return (
    <Select
      label={label}
      value={value.id}
      onChange={(id) => {
        const found = WOOD_THICKNESSES.find((t) => t.id === id);
        if (found) onChange(found);
      }}
      options={thicknessOptions}
    />
  );
}

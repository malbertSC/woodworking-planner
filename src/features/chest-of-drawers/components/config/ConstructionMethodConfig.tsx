import type { DrawerBoxConstruction } from "../../types.ts";
import { useChestStore } from "../../store.ts";
import RadioCardGroup from "../ui/RadioCardGroup.tsx";

const METHODS: {
  value: DrawerBoxConstruction;
  label: string;
  description: string;
}[] = [
  {
    value: "dado",
    label: "Dado Joint",
    description:
      "Bottom panel captured in dado grooves on all four sides. Strongest option, requires a table saw or router.",
  },
  {
    value: "butt-through-sides",
    label: "Butt Joint (Through Sides)",
    description:
      "Screws through side faces into bottom edges. Bottom sits between the sides. Simpler construction.",
  },
  {
    value: "butt-through-bottom",
    label: "Butt Joint (Through Bottom)",
    description:
      "Screws through bottom face into side bottom edges. Sides sit on top of the bottom panel. Easiest to assemble.",
  },
];

export default function ConstructionMethodConfig() {
  const method = useChestStore((s) => s.config.defaultConstruction);
  const setDefaultConstruction = useChestStore((s) => s.setDefaultConstruction);

  return (
    <RadioCardGroup
      name="construction-method"
      value={method}
      onChange={setDefaultConstruction}
      options={METHODS}
    />
  );
}

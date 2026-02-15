import type { DrawerStyle } from "../../types.ts";
import { useChestStore } from "../../store.ts";
import RadioCardGroup from "../ui/RadioCardGroup.tsx";

const STYLES: { value: DrawerStyle; label: string; description: string }[] = [
  {
    value: "overlay",
    label: "Overlay",
    description:
      "Drawer face overlaps the carcass opening, covering the edges. The most common style for frameless cabinets.",
  },
  {
    value: "inset",
    label: "Inset",
    description:
      "Drawer face sits flush within the carcass opening with a small reveal gap around the edges.",
  },
];

export default function DrawerStyleConfig() {
  const drawerStyle = useChestStore((s) => s.config.drawerStyle);
  const setDrawerStyle = useChestStore((s) => s.setDrawerStyle);

  return (
    <RadioCardGroup
      name="drawer-style"
      value={drawerStyle}
      onChange={setDrawerStyle}
      options={STYLES}
    />
  );
}

import type { WoodAssignments } from "../../types.ts";
import { useChestStore } from "../../store.ts";
import ThicknessSelect from "../ui/ThicknessSelect.tsx";

interface SimpleGroup {
  label: string;
  primaryKey: keyof WoodAssignments;
  keys: (keyof WoodAssignments)[];
}

const SIMPLE_GROUPS: SimpleGroup[] = [
  {
    label: "Carcass",
    primaryKey: "carcassTopBottom",
    keys: ["carcassTopBottom", "carcassSides", "carcassDividers"],
  },
  {
    label: "Drawer Box",
    primaryKey: "drawerSides",
    keys: ["drawerSides", "drawerFrontBack"],
  },
  {
    label: "Panels",
    primaryKey: "carcassBack",
    keys: ["carcassBack", "drawerBottom"],
  },
  { label: "Drawer Faces", primaryKey: "drawerFace", keys: ["drawerFace"] },
];

const ADVANCED_LABELS: Record<keyof WoodAssignments, string> = {
  carcassTopBottom: "Carcass Top/Bottom",
  carcassSides: "Carcass Sides",
  carcassDividers: "Carcass Dividers",
  carcassBack: "Back Panel",
  horizontalRails: "Horizontal Rails",
  drawerSides: "Drawer Sides",
  drawerFrontBack: "Drawer Front/Back",
  drawerBottom: "Drawer Bottom",
  drawerFace: "Drawer Faces",
};

export default function WoodThicknessConfig() {
  const advancedMode = useChestStore((s) => s.config.advancedWoodMode);
  const woodAssignments = useChestStore((s) => s.config.woodAssignments);
  const setAdvancedWoodMode = useChestStore((s) => s.setAdvancedWoodMode);
  const setWoodAssignment = useChestStore((s) => s.setWoodAssignment);

  if (advancedMode) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setAdvancedWoodMode(false);
          }}
          className="text-xs text-amber-700 underline hover:text-amber-800"
        >
          Switch to simple mode
        </button>
        <div className="space-y-2">
          {(Object.keys(ADVANCED_LABELS) as (keyof WoodAssignments)[]).map(
            (key) => (
              <ThicknessSelect
                key={key}
                label={ADVANCED_LABELS[key]}
                value={woodAssignments[key]}
                onChange={(t) => {
                  setWoodAssignment(key, t);
                }}
              />
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setAdvancedWoodMode(true);
        }}
        className="text-xs text-amber-700 underline hover:text-amber-800"
      >
        Switch to advanced mode
      </button>
      {SIMPLE_GROUPS.map((group) => (
        <ThicknessSelect
          key={group.label}
          label={group.label}
          value={woodAssignments[group.primaryKey]}
          onChange={(t) => {
            for (const key of group.keys) {
              setWoodAssignment(key, t);
            }
          }}
        />
      ))}
    </div>
  );
}

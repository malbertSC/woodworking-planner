import CollapsibleSection from "../ui/CollapsibleSection.tsx";
import UnitSelector from "./UnitSelector.tsx";
import DimensionConstraints from "./DimensionConstraints.tsx";
import ColumnRowConfig from "./ColumnRowConfig.tsx";
import DrawerHeightConfig from "./DrawerHeightConfig.tsx";
import DrawerStyleConfig from "./DrawerStyleConfig.tsx";
import ConstructionMethodConfig from "./ConstructionMethodConfig.tsx";
import WoodThicknessConfig from "./WoodThicknessConfig.tsx";
import SlideConfig from "./SlideConfig.tsx";
import HorizontalRailConfig from "./HorizontalRailConfig.tsx";
import SaveLoadPanel from "./SaveLoadPanel.tsx";

export default function ConfigPanel() {
  return (
    <div className="divide-y divide-stone-200 border-b border-stone-200">
      <div className="px-4 py-3">
        <UnitSelector />
      </div>

      <CollapsibleSection title="Dimension Constraints">
        <DimensionConstraints />
      </CollapsibleSection>

      <CollapsibleSection title="Gridfinity Layout">
        <ColumnRowConfig />
      </CollapsibleSection>

      <CollapsibleSection title="Drawer Bin Heights">
        <DrawerHeightConfig />
      </CollapsibleSection>

      <CollapsibleSection title="Drawer Style">
        <DrawerStyleConfig />
      </CollapsibleSection>

      <CollapsibleSection title="Construction Method">
        <ConstructionMethodConfig />
      </CollapsibleSection>

      <CollapsibleSection title="Wood Thickness" defaultOpen={false}>
        <WoodThicknessConfig />
      </CollapsibleSection>

      <CollapsibleSection title="Drawer Slides">
        <SlideConfig />
      </CollapsibleSection>

      <CollapsibleSection title="Horizontal Rails" defaultOpen={false}>
        <HorizontalRailConfig />
      </CollapsibleSection>

      <CollapsibleSection title="Save / Load" defaultOpen={false}>
        <SaveLoadPanel />
      </CollapsibleSection>
    </div>
  );
}

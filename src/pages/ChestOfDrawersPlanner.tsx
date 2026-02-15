import ConfigPanel from "../features/chest-of-drawers/components/config/ConfigPanel.tsx";
import CutList from "../features/chest-of-drawers/components/cutlist/CutList.tsx";
import Plans from "../features/chest-of-drawers/components/plans/Plans.tsx";
import Visualizer from "../features/chest-of-drawers/components/visualizer/Visualizer.tsx";

export default function ChestOfDrawersPlanner() {
  return (
    <div className="flex flex-col overflow-y-auto h-[calc(100vh-4rem)]">
      <div className="flex flex-col lg:flex-row flex-shrink-0">
        <aside className="w-full lg:w-[400px] shrink-0 border-r border-stone-200 overflow-y-auto">
          <div className="border-b border-stone-200 bg-stone-50 px-4 py-2">
            <h2 className="text-sm font-semibold text-stone-700">
              Configuration
            </h2>
          </div>
          <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
            <ConfigPanel />
          </div>
        </aside>

        <main className="flex-1 min-h-0">
          <Visualizer />
        </main>
      </div>

      <section className="w-full border-t border-stone-200 p-4">
        <Plans />
      </section>

      <section className="w-full border-t border-stone-200 p-4">
        <h2 className="text-lg font-semibold text-stone-800 mb-4">
          Cutlist & Sheet Layout
        </h2>
        <CutList />
      </section>
    </div>
  );
}

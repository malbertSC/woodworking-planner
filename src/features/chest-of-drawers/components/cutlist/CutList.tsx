import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChestStore } from "../../store.ts";
import {
  aggregateCutPieces,
  getUniqueThicknesses,
  groupPiecesByThickness,
} from "../../calculations/cutlist.ts";
import { packPieces } from "../../calculations/bin-packing.ts";
import type { SheetLayout, StockSheet } from "../../types.ts";
import StockConfig, { getStockSelection } from "./StockConfig.tsx";
import CutListTable from "./CutListTable.tsx";
import SheetLayoutView from "./SheetLayoutView.tsx";

export default function CutList() {
  const config = useChestStore((s) => s.config);
  const [stockSelections, setStockSelections] = useState<
    Map<string, StockSheet>
  >(new Map());
  const [layouts, setLayouts] = useState<Map<string, SheetLayout[]>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const pieces = useMemo(() => aggregateCutPieces(config), [config]);
  const thicknesses = useMemo(() => getUniqueThicknesses(pieces), [pieces]);

  const runOptimize = useCallback(() => {
    const groups = groupPiecesByThickness(pieces);
    const selections = getStockSelection(thicknesses, stockSelections);
    const newLayouts = new Map<string, SheetLayout[]>();

    for (const sel of selections) {
      const groupPieces = groups.get(sel.thickness.id);
      if (!groupPieces || groupPieces.length === 0) continue;
      const result = packPieces(groupPieces, sel.sheet, config.kerfWidth, true);
      newLayouts.set(sel.thickness.id, result);
    }

    setLayouts(newLayouts);
  }, [pieces, thicknesses, stockSelections, config.kerfWidth]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runOptimize, 300);
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, [runOptimize]);

  const handleStockSelect = useCallback(
    (thicknessId: string, sheet: StockSheet) => {
      setStockSelections((prev) => {
        const next = new Map(prev);
        next.set(thicknessId, sheet);
        return next;
      });
    },
    [],
  );

  const totalSheets = [...layouts.values()].reduce(
    (sum, l) => sum + l.length,
    0,
  );
  const totalWaste =
    totalSheets > 0
      ? [...layouts.values()]
          .flat()
          .reduce((sum, l) => sum + l.wastePercentage, 0) / totalSheets
      : 0;

  return (
    <div className="space-y-6">
      <StockConfig
        thicknesses={thicknesses}
        selections={stockSelections}
        unit={config.unit}
        onSelect={handleStockSelect}
      />

      <CutListTable pieces={pieces} layouts={layouts} unit={config.unit} />

      <div className="rounded border border-stone-200 bg-stone-50 px-4 py-3">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-stone-700 font-semibold">Summary</span>
          <span className="text-stone-600">
            {totalSheets} sheet{totalSheets !== 1 ? "s" : ""} total
          </span>
          <span className="text-stone-600">
            {totalWaste.toFixed(1)}% avg waste
          </span>
        </div>
      </div>

      {[...layouts.entries()].map(([thicknessId, sheetLayouts]) => (
        <div key={thicknessId} className="space-y-3">
          <h4 className="text-sm font-semibold text-stone-700">
            {sheetLayouts[0]?.sheet.thickness.nominal} — Sheet Layouts
          </h4>
          {sheetLayouts.map((layout, i) => (
            <SheetLayoutView
              key={i}
              layout={layout}
              sheetIndex={i}
              totalSheets={sheetLayouts.length}
              unit={config.unit}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

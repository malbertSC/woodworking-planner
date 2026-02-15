import { useState } from "react";
import { getCarcassPieces } from "../../calculations/carcass.ts";
import {
  calculateDrawerBox,
  getDrawerPieces,
} from "../../calculations/drawer.ts";
import { formatDimension } from "../../calculations/units.ts";
import { selectCarcassDimensions } from "../../selectors.ts";
import { useChestStore } from "../../store.ts";
import type { ChestConfig, CutPiece } from "../../types.ts";
import CarcassPlan from "./CarcassPlan.tsx";
import DrawerPlan from "./DrawerPlan.tsx";
import PlansSummary from "./PlansSummary.tsx";

type Tab = "carcass" | "drawers" | "summary";

const TABS: { id: Tab; label: string }[] = [
  { id: "carcass", label: "Carcass" },
  { id: "drawers", label: "Drawers" },
  { id: "summary", label: "Summary" },
];

function buildClipboardText(config: ChestConfig): string {
  const carcass = selectCarcassDimensions(config);
  const unit = config.unit;
  const lines: string[] = [];

  lines.push("CARCASS PLAN");
  lines.push("=".repeat(60));
  lines.push("");

  const carcassPieces = getCarcassPieces(config, carcass);
  lines.push(formatPieceTable(carcassPieces, unit));
  lines.push("");

  lines.push("DRAWER PLAN");
  lines.push("=".repeat(60));

  for (const [colIdx, col] of config.columns.entries()) {
    for (const [rowIdx, row] of col.rows.entries()) {
      const label =
        config.columns.length === 1
          ? `Row ${String(rowIdx + 1)}`
          : `Column ${String(colIdx + 1)}, Row ${String(rowIdx + 1)}`;
      const box = calculateDrawerBox(row, col, config);
      const pieces = getDrawerPieces(box, row, config);

      lines.push("");
      lines.push(`--- ${label} (${row.construction}) ---`);
      lines.push(formatPieceTable(pieces, unit));

      lines.push(
        `  Interior: ${formatDimension(box.usableInteriorWidth, unit)} W x ${formatDimension(box.usableInteriorHeight, unit)} H x ${formatDimension(box.usableInteriorDepth, unit)} D`,
      );

      for (const w of box.warnings) {
        lines.push(`  WARNING: ${w.message}`);
      }
    }
  }

  lines.push("");
  lines.push("SUMMARY");
  lines.push("=".repeat(60));
  lines.push(
    `Overall: ${formatDimension(carcass.outerWidth, unit)} W x ${formatDimension(carcass.outerHeight, unit)} H x ${formatDimension(carcass.outerDepth, unit)} D`,
  );

  for (const v of carcass.constraintViolations) {
    lines.push(
      `VIOLATION: ${v.dimension} ${formatDimension(v.actual, unit)} > ${formatDimension(v.max, unit)}`,
    );
  }

  return lines.join("\n");
}

function formatPieceTable(pieces: CutPiece[], unit: "inches" | "cm"): string {
  const rows = pieces.map((p) => [
    p.label,
    String(p.quantity),
    formatDimension(p.width, unit),
    formatDimension(p.height, unit),
    p.thickness.nominal,
  ]);

  const header = ["Part", "Qty", "Width", "Height", "Material"];
  const allRows = [header, ...rows];

  const colWidths = header.map((_, col) =>
    Math.max(...allRows.map((row) => (row[col] ?? "").length)),
  );

  return allRows
    .map((row) =>
      row.map((cell, i) => cell.padEnd(colWidths[i] ?? 0)).join("  "),
    )
    .join("\n");
}

export default function Plans() {
  const config = useChestStore((s) => s.config);
  const carcass = selectCarcassDimensions(config);
  const [activeTab, setActiveTab] = useState<Tab>("carcass");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = buildClipboardText(config);
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-stone-800">Plans</h3>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded border border-stone-300 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>

      <div className="flex border-b border-stone-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-amber-600 text-amber-800"
                : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === "carcass" && (
          <CarcassPlan config={config} carcass={carcass} />
        )}
        {activeTab === "drawers" && <DrawerPlan config={config} />}
        {activeTab === "summary" && (
          <PlansSummary config={config} carcass={carcass} />
        )}
      </div>
    </div>
  );
}

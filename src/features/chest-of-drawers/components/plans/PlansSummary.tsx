import { getCarcassPieces } from "../../calculations/carcass.ts";
import {
  calculateDrawerBox,
  getDrawerPieces,
} from "../../calculations/drawer.ts";
import { formatDimension } from "../../calculations/units.ts";
import type {
  CarcassDimensions,
  ChestConfig,
  CutPiece,
  DrawerWarning,
} from "../../types.ts";
import WarningIcon from "../ui/WarningIcon.tsx";

interface PlansSummaryProps {
  config: ChestConfig;
  carcass: CarcassDimensions;
}

interface MaterialGroup {
  nominal: string;
  material: string;
  actual: number;
  sqFt: number;
}

function collectAllPieces(
  config: ChestConfig,
  carcass: CarcassDimensions,
): CutPiece[] {
  const pieces = getCarcassPieces(config, carcass);
  for (const col of config.columns) {
    for (const row of col.rows) {
      const box = calculateDrawerBox(row, col, config);
      pieces.push(...getDrawerPieces(box, row, config));
    }
  }
  return pieces;
}

function collectAllWarnings(config: ChestConfig): DrawerWarning[] {
  const warnings: DrawerWarning[] = [];
  for (const col of config.columns) {
    for (const row of col.rows) {
      const box = calculateDrawerBox(row, col, config);
      warnings.push(...box.warnings);
    }
  }
  return warnings;
}

function groupByMaterial(pieces: CutPiece[]): MaterialGroup[] {
  const map = new Map<string, MaterialGroup>();

  for (const piece of pieces) {
    const key = piece.thickness.id;
    const existing = map.get(key);
    const areaSqIn = piece.width * piece.height * piece.quantity;

    if (existing) {
      existing.sqFt += areaSqIn / 144;
    } else {
      map.set(key, {
        nominal: piece.thickness.nominal,
        material: piece.thickness.material,
        actual: piece.thickness.actual,
        sqFt: areaSqIn / 144,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.sqFt - a.sqFt);
}

function totalPieceCount(pieces: CutPiece[]): number {
  return pieces.reduce((sum, p) => sum + p.quantity, 0);
}

function ConstraintStatus({
  config,
  carcass,
}: {
  config: ChestConfig;
  carcass: CarcassDimensions;
}) {
  const { unit } = config;
  const violations = carcass.constraintViolations;
  const hasConstraints = config.constraints !== undefined;

  return (
    <div className="rounded border border-stone-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-stone-800 mb-2">
        Overall Dimensions
      </h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-xs text-stone-500 block">Width</span>
          <span className="text-stone-800 font-medium">
            {formatDimension(carcass.outerWidth, unit)}
          </span>
        </div>
        <div>
          <span className="text-xs text-stone-500 block">Height</span>
          <span className="text-stone-800 font-medium">
            {formatDimension(carcass.outerHeight, unit)}
          </span>
        </div>
        <div>
          <span className="text-xs text-stone-500 block">Depth</span>
          <span className="text-stone-800 font-medium">
            {formatDimension(carcass.outerDepth, unit)}
          </span>
        </div>
      </div>

      {hasConstraints && violations.length === 0 && (
        <p className="mt-2 text-xs text-green-700">
          All dimensions within constraints.
        </p>
      )}

      {violations.map((v) => (
        <p key={v.dimension} className="mt-2 text-xs text-red-600">
          {v.dimension} exceeds constraint: {formatDimension(v.actual, unit)}{" "}
          &gt; {formatDimension(v.max, unit)}
        </p>
      ))}
    </div>
  );
}

export default function PlansSummary({ config, carcass }: PlansSummaryProps) {
  const allPieces = collectAllPieces(config, carcass);
  const materials = groupByMaterial(allPieces);
  const warnings = collectAllWarnings(config);
  const count = totalPieceCount(allPieces);

  return (
    <div className="space-y-4">
      <ConstraintStatus config={config} carcass={carcass} />

      <div className="rounded border border-stone-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-stone-800 mb-2">
          Total Pieces: {count}
        </h4>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-stone-200">
              <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Material
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider text-right">
                Thickness
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider text-right">
                Area (sq ft)
              </th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr
                key={m.nominal}
                className="border-b border-stone-100 even:bg-stone-50"
              >
                <td className="px-3 py-2 text-sm text-stone-800">
                  {m.nominal}
                </td>
                <td className="px-3 py-2 text-sm text-stone-600 text-right">
                  {formatDimension(m.actual, config.unit)}
                </td>
                <td className="px-3 py-2 text-sm text-stone-600 text-right">
                  {m.sqFt.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {warnings.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">
            Warnings
          </h4>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700">
                <WarningIcon />
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

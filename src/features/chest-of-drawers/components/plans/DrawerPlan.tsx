import {
  calculateDrawerBox,
  getDrawerPieces,
} from "../../calculations/drawer.ts";
import { formatDimension } from "../../calculations/units.ts";
import type {
  ChestConfig,
  Column,
  CutPiece,
  DrawerBoxConstruction,
  DrawerBoxDimensions,
  DrawerRow,
  DrawerWarning,
  Unit,
} from "../../types.ts";
import WarningIcon from "../ui/WarningIcon.tsx";

interface DrawerPlanProps {
  config: ChestConfig;
}

const CONSTRUCTION_LABELS: Record<DrawerBoxConstruction, string> = {
  dado: "Dado",
  "butt-through-sides": "Butt (through sides)",
  "butt-through-bottom": "Butt (through bottom)",
};

interface DrawerGroup {
  construction: DrawerBoxConstruction;
  pieces: CutPiece[];
  box: DrawerBoxDimensions;
  warnings: DrawerWarning[];
  count: number;
  locations: string[];
}

function drawersAreIdentical(
  a: DrawerBoxDimensions,
  b: DrawerBoxDimensions,
  rowA: DrawerRow,
  rowB: DrawerRow,
): boolean {
  return (
    rowA.construction === rowB.construction &&
    a.sideLength === b.sideLength &&
    a.sideHeight === b.sideHeight &&
    a.frontBackLength === b.frontBackLength &&
    a.frontBackHeight === b.frontBackHeight &&
    a.bottomWidth === b.bottomWidth &&
    a.bottomDepth === b.bottomDepth &&
    a.faceWidth === b.faceWidth &&
    a.faceHeight === b.faceHeight
  );
}

function groupDrawers(config: ChestConfig): DrawerGroup[] {
  const all: {
    box: DrawerBoxDimensions;
    row: DrawerRow;
    col: Column;
    colIdx: number;
    rowIdx: number;
  }[] = [];

  for (const [colIdx, col] of config.columns.entries()) {
    for (const [rowIdx, row] of col.rows.entries()) {
      all.push({
        box: calculateDrawerBox(row, col, config),
        row,
        col,
        colIdx,
        rowIdx,
      });
    }
  }

  if (all.length === 0) return [];

  const first = all[0];
  if (!first) return [];
  const allIdentical = all.every((d) =>
    drawersAreIdentical(d.box, first.box, d.row, first.row),
  );

  if (allIdentical) {
    return [
      {
        construction: first.row.construction,
        pieces: getDrawerPieces(first.box, first.row, config),
        box: first.box,
        warnings: all.flatMap((d) => d.box.warnings),
        count: all.length,
        locations: all.map((d) => locationLabel(d.colIdx, d.rowIdx, config)),
      },
    ];
  }

  return all.map((d) => ({
    construction: d.row.construction,
    pieces: getDrawerPieces(d.box, d.row, config),
    box: d.box,
    warnings: d.box.warnings,
    count: 1,
    locations: [locationLabel(d.colIdx, d.rowIdx, config)],
  }));
}

function locationLabel(
  colIdx: number,
  rowIdx: number,
  config: ChestConfig,
): string {
  if (config.columns.length === 1) return `Row ${String(rowIdx + 1)}`;
  return `Column ${String(colIdx + 1)}, Row ${String(rowIdx + 1)}`;
}

function DrawerGroupSection({
  group,
  unit,
}: {
  group: DrawerGroup;
  unit: Unit;
}) {
  const title =
    group.count > 1
      ? `All Drawers (x${String(group.count)})`
      : (group.locations[0] ?? "Drawer");

  return (
    <div className="rounded border border-stone-200 bg-white">
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-stone-800">{title}</h4>
          <span className="text-xs text-stone-500">
            {CONSTRUCTION_LABELS[group.construction]}
          </span>
        </div>
        {group.count > 1 && (
          <p className="text-xs text-stone-500 mt-1">
            {group.locations.join(", ")}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-stone-200">
              <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Part
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider text-center">
                Qty
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider text-right">
                Width
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider text-right">
                Height
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Material
              </th>
            </tr>
          </thead>
          <tbody>
            {group.pieces.map((piece) => (
              <tr
                key={piece.label}
                className="border-b border-stone-100 even:bg-stone-50"
              >
                <td className="px-3 py-2 text-sm text-stone-800">
                  {piece.label}
                </td>
                <td className="px-3 py-2 text-sm text-stone-600 text-center">
                  {piece.quantity * group.count}
                </td>
                <td className="px-3 py-2 text-sm text-stone-600 text-right">
                  {formatDimension(piece.width, unit)}
                </td>
                <td className="px-3 py-2 text-sm text-stone-600 text-right">
                  {formatDimension(piece.height, unit)}
                </td>
                <td className="px-3 py-2 text-sm text-stone-600">
                  {piece.thickness.nominal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-stone-100 space-y-1">
        <p className="text-xs text-stone-600">
          Usable interior:{" "}
          {formatDimension(group.box.usableInteriorWidth, unit)} W x{" "}
          {formatDimension(group.box.usableInteriorHeight, unit)} H x{" "}
          {formatDimension(group.box.usableInteriorDepth, unit)} D
        </p>

        {group.warnings.length > 0 &&
          group.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600">
              <WarningIcon />
              {w.message}
            </p>
          ))}
      </div>
    </div>
  );
}

export default function DrawerPlan({ config }: DrawerPlanProps) {
  const groups = groupDrawers(config);

  return (
    <div className="space-y-4">
      {groups.map((group, i) => (
        <DrawerGroupSection key={i} group={group} unit={config.unit} />
      ))}
    </div>
  );
}

import { formatDimension } from "../../calculations/units.ts";
import { groupPiecesByThickness } from "../../calculations/cutlist.ts";
import type { CutPiece, SheetLayout, Unit } from "../../types.ts";

interface CutListTableProps {
  pieces: CutPiece[];
  layouts: Map<string, SheetLayout[]>;
  unit: Unit;
}

function groupArea(pieces: CutPiece[]): number {
  return pieces.reduce((sum, p) => sum + p.width * p.height * p.quantity, 0);
}

function PieceRow({ piece, unit }: { piece: CutPiece; unit: Unit }) {
  return (
    <tr className="border-b border-stone-100 even:bg-stone-50">
      <td className="px-3 py-2 text-sm text-stone-800">{piece.label}</td>
      <td className="px-3 py-2 text-sm text-stone-600 text-right">
        {formatDimension(piece.width, unit)}
      </td>
      <td className="px-3 py-2 text-sm text-stone-600 text-right">
        {formatDimension(piece.height, unit)}
      </td>
      <td className="px-3 py-2 text-sm text-stone-600 text-center">
        {piece.quantity}
      </td>
      <td className="px-3 py-2 text-sm text-stone-600">
        {piece.thickness.nominal}
      </td>
    </tr>
  );
}

export default function CutListTable({
  pieces,
  layouts,
  unit,
}: CutListTableProps) {
  const groups = groupPiecesByThickness(pieces);

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([thicknessId, groupPieces]) => {
        const first = groupPieces[0];
        if (!first) return null;
        const thickness = first.thickness;
        const area = groupArea(groupPieces);
        const sheetCount = layouts.get(thicknessId)?.length ?? 0;

        return (
          <div key={thicknessId} className="rounded border border-stone-200">
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-stone-700">
                {thickness.nominal}
              </h4>
              <div className="text-xs text-stone-500 space-x-4">
                <span>{(area / 144).toFixed(1)} sq ft</span>
                {sheetCount > 0 && (
                  <span>
                    {sheetCount} sheet{sheetCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-stone-200">
                    <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Part
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider text-right">
                      Width
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider text-right">
                      Height
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider text-center">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Material
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupPieces.map((piece) => (
                    <PieceRow key={piece.id} piece={piece} unit={unit} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

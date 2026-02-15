import { getCarcassPieces } from "../../calculations/carcass.ts";
import { formatDimension } from "../../calculations/units.ts";
import type {
  CarcassDimensions,
  ChestConfig,
  CutPiece,
  Unit,
} from "../../types.ts";

interface CarcassPlanProps {
  config: ChestConfig;
  carcass: CarcassDimensions;
}

function thicknessNote(piece: CutPiece): string {
  const { nominal, actual } = piece.thickness;
  const nominalMatch = nominal.includes("hardwood") || nominal.includes("MDF");
  if (nominalMatch) return nominal;

  const fractionMap: Record<number, string> = {
    0.71875: '23/32"',
    0.46875: '15/32"',
  };
  const actualStr = fractionMap[actual];
  if (actualStr) return `${actualStr} actual`;
  return nominal;
}

function PieceRow({ piece, unit }: { piece: CutPiece; unit: Unit }) {
  return (
    <tr className="border-b border-stone-100 even:bg-stone-50">
      <td className="px-3 py-2 text-sm text-stone-800">{piece.label}</td>
      <td className="px-3 py-2 text-sm text-stone-600 text-center">
        {piece.quantity}
      </td>
      <td className="px-3 py-2 text-sm text-stone-600 text-right">
        {formatDimension(piece.width, unit)}
      </td>
      <td className="px-3 py-2 text-sm text-stone-600 text-right">
        {formatDimension(piece.height, unit)}
      </td>
      <td className="px-3 py-2 text-sm text-stone-600 text-right">
        {formatDimension(piece.thickness.actual, unit)}
      </td>
      <td className="px-3 py-2 text-sm text-stone-600">
        {piece.thickness.material}
      </td>
      <td className="px-3 py-2 text-xs text-stone-500">
        {thicknessNote(piece)}
      </td>
    </tr>
  );
}

export default function CarcassPlan({ config, carcass }: CarcassPlanProps) {
  const pieces = getCarcassPieces(config, carcass);

  return (
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
            <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider text-right">
              Thickness
            </th>
            <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Material
            </th>
            <th className="px-3 py-2 text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Notes
            </th>
          </tr>
        </thead>
        <tbody>
          {pieces.map((piece) => (
            <PieceRow key={piece.id} piece={piece} unit={config.unit} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

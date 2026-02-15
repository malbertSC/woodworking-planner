import { formatDimension } from "../../calculations/units.ts";
import type { SheetLayout, Unit } from "../../types.ts";

interface SheetLayoutViewProps {
  layout: SheetLayout;
  sheetIndex: number;
  totalSheets: number;
  unit: Unit;
}

const PIECE_COLORS: Record<string, string> = {
  carcass: "#D4A574",
  "drawer-box": "#A3BE8C",
  "drawer-face": "#C4956A",
};

const DEFAULT_COLOR = "#D4A574";

function getPieceColor(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("face"))
    return PIECE_COLORS["drawer-face"] ?? DEFAULT_COLOR;
  if (lower.includes("drawer"))
    return PIECE_COLORS["drawer-box"] ?? DEFAULT_COLOR;
  return PIECE_COLORS.carcass ?? DEFAULT_COLOR;
}

function truncateLabel(text: string, maxWidth: number): string {
  const approxChars = Math.floor(maxWidth / 7);
  if (text.length <= approxChars) return text;
  if (approxChars < 4) return "";
  return text.slice(0, approxChars - 1) + "\u2026";
}

const PADDING = 10;
const HEADER_HEIGHT = 28;

export default function SheetLayoutView({
  layout,
  sheetIndex,
  totalSheets,
  unit,
}: SheetLayoutViewProps) {
  const { sheet, placements, wastePercentage } = layout;
  const svgWidth = sheet.width + PADDING * 2;
  const svgHeight = sheet.height + PADDING * 2 + HEADER_HEIGHT;

  const headerText = `Sheet ${String(sheetIndex + 1)} of ${String(totalSheets)} \u2014 ${sheet.label} \u2014 ${wastePercentage.toFixed(0)}% waste`;

  return (
    <div className="rounded border border-stone-200 bg-white overflow-hidden">
      <svg
        viewBox={`0 0 ${String(svgWidth)} ${String(svgHeight)}`}
        className="w-full"
        style={{ maxHeight: "400px" }}
      >
        <text
          x={svgWidth / 2}
          y={18}
          textAnchor="middle"
          className="fill-stone-700"
          fontSize="10"
          fontWeight="600"
        >
          {headerText}
        </text>

        <rect
          x={PADDING}
          y={PADDING + HEADER_HEIGHT}
          width={sheet.width}
          height={sheet.height}
          fill="#F5F5F4"
          stroke="#78716C"
          strokeWidth="0.5"
        />

        {placements.map((placement, i) => {
          const w = placement.rotated
            ? placement.piece.height
            : placement.piece.width;
          const h = placement.rotated
            ? placement.piece.width
            : placement.piece.height;
          const x = placement.x + PADDING;
          const y = placement.y + PADDING + HEADER_HEIGHT;
          const color = getPieceColor(placement.piece.label);
          const dimLabel = `${formatDimension(placement.piece.width, unit)} x ${formatDimension(placement.piece.height, unit)}`;
          const nameLabel = truncateLabel(placement.piece.label, w);

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={color}
                stroke="#57534E"
                strokeWidth="0.3"
              />
              {w > 14 && h > 10 && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 - 3}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(5, w / 8)}
                  className="fill-stone-800"
                >
                  {nameLabel}
                </text>
              )}
              {w > 14 && h > 16 && (
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(4, w / 10)}
                  className="fill-stone-600"
                >
                  {dimLabel}
                </text>
              )}
              {placement.rotated && w > 8 && h > 8 && (
                <text
                  x={x + 2}
                  y={y + 5}
                  fontSize="3.5"
                  className="fill-stone-500"
                >
                  R
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

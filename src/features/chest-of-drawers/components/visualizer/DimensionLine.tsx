interface DimensionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  sublabel?: string | undefined;
  offset: number;
  orientation: "horizontal" | "vertical";
  violated?: boolean;
}

const TICK_SIZE = 0.5;
const FONT_SIZE = 1.5;
const EXTENSION_PAST = 0.5;
const LABEL_OFFSET = 1.5;

function HorizontalDimensionLine({
  x1,
  x2,
  y,
  extY,
  label,
  sublabel,
  violated,
}: {
  x1: number;
  x2: number;
  y: number;
  extY: number;
  label: string;
  sublabel?: string | undefined;
  violated: boolean;
}) {
  const stroke = violated ? "#DC2626" : "#666";
  const dashArray = violated ? "1" : undefined;
  const midX = (x1 + x2) / 2;
  const extPast = y > extY ? EXTENSION_PAST : -EXTENSION_PAST;

  return (
    <g>
      <line
        x1={x1}
        y1={extY}
        x2={x1}
        y2={y + extPast}
        stroke={stroke}
        strokeWidth={0.15}
      />
      <line
        x1={x2}
        y1={extY}
        x2={x2}
        y2={y + extPast}
        stroke={stroke}
        strokeWidth={0.15}
      />
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={stroke}
        strokeWidth={0.25}
        strokeDasharray={dashArray}
      />
      <line
        x1={x1}
        y1={y - TICK_SIZE}
        x2={x1}
        y2={y + TICK_SIZE}
        stroke={stroke}
        strokeWidth={0.25}
      />
      <line
        x1={x2}
        y1={y - TICK_SIZE}
        x2={x2}
        y2={y + TICK_SIZE}
        stroke={stroke}
        strokeWidth={0.25}
      />
      <text
        x={midX}
        y={y - FONT_SIZE / 3 - (sublabel ? FONT_SIZE * 0.5 : 0)}
        textAnchor="middle"
        fontSize={FONT_SIZE}
        fill={stroke}
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={midX}
          y={y - FONT_SIZE / 3 + FONT_SIZE * 0.5}
          textAnchor="middle"
          fontSize={FONT_SIZE * 0.75}
          fill={stroke}
          opacity={0.8}
        >
          {sublabel}
        </text>
      )}
    </g>
  );
}

function VerticalDimensionLine({
  y1,
  y2,
  x,
  extX,
  label,
  sublabel,
  violated,
}: {
  y1: number;
  y2: number;
  x: number;
  extX: number;
  label: string;
  sublabel?: string | undefined;
  violated: boolean;
}) {
  const stroke = violated ? "#DC2626" : "#666";
  const dashArray = violated ? "1" : undefined;
  const midY = (y1 + y2) / 2;
  const extPast = x > extX ? EXTENSION_PAST : -EXTENSION_PAST;
  const anchor = x > extX ? "start" : "end";

  return (
    <g>
      <line
        x1={extX}
        y1={y1}
        x2={x + extPast}
        y2={y1}
        stroke={stroke}
        strokeWidth={0.15}
      />
      <line
        x1={extX}
        y1={y2}
        x2={x + extPast}
        y2={y2}
        stroke={stroke}
        strokeWidth={0.15}
      />
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke={stroke}
        strokeWidth={0.25}
        strokeDasharray={dashArray}
      />
      <line
        x1={x - TICK_SIZE}
        y1={y1}
        x2={x + TICK_SIZE}
        y2={y1}
        stroke={stroke}
        strokeWidth={0.25}
      />
      <line
        x1={x - TICK_SIZE}
        y1={y2}
        x2={x + TICK_SIZE}
        y2={y2}
        stroke={stroke}
        strokeWidth={0.25}
      />
      <text
        x={x > extX ? x + LABEL_OFFSET : x - LABEL_OFFSET}
        y={midY + FONT_SIZE / 3 - (sublabel ? FONT_SIZE * 0.5 : 0)}
        textAnchor={anchor}
        fontSize={FONT_SIZE}
        fill={stroke}
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={x > extX ? x + LABEL_OFFSET : x - LABEL_OFFSET}
          y={midY + FONT_SIZE / 3 + FONT_SIZE * 0.5}
          textAnchor={anchor}
          fontSize={FONT_SIZE * 0.75}
          fill={stroke}
          opacity={0.8}
        >
          {sublabel}
        </text>
      )}
    </g>
  );
}

export default function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  sublabel,
  offset,
  orientation,
  violated = false,
}: DimensionLineProps) {
  if (orientation === "horizontal") {
    const dimY =
      y1 < y2 ? Math.min(y1, y2) - offset : Math.max(y1, y2) + offset;
    const extY = (y1 + y2) / 2;
    return (
      <HorizontalDimensionLine
        x1={x1}
        x2={x2}
        y={dimY}
        extY={extY}
        label={label}
        sublabel={sublabel}
        violated={violated}
      />
    );
  }

  const dimX = x1 < x2 ? Math.max(x1, x2) + offset : Math.min(x1, x2) - offset;
  const extX = (x1 + x2) / 2;
  return (
    <VerticalDimensionLine
      y1={y1}
      y2={y2}
      x={dimX}
      extX={extX}
      label={label}
      sublabel={sublabel}
      violated={violated}
    />
  );
}

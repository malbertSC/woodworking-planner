interface ViolationOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ViolationOverlay({
  x,
  y,
  width,
  height,
}: ViolationOverlayProps) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="none"
      stroke="#DC2626"
      strokeWidth={0.5}
      strokeDasharray="2"
      pointerEvents="none"
    />
  );
}

interface SlideWarningIconProps {
  x: number;
  y: number;
  size?: number;
}

export function SlideWarningIcon({ x, y, size = 2 }: SlideWarningIconProps) {
  const half = size / 2;
  const points = `${String(x)},${String(y - half)} ${String(x - half)},${String(y + half)} ${String(x + half)},${String(y + half)}`;

  return (
    <g>
      <polygon
        points={points}
        fill="#D97706"
        stroke="#92400E"
        strokeWidth={0.5}
      />
      <text
        x={x}
        y={y + half * 0.6}
        textAnchor="middle"
        fontSize={size * 0.7}
        fontWeight="bold"
        fill="white"
      >
        !
      </text>
    </g>
  );
}

import type { MouseEvent, RefObject } from "react";
import { useCallback, useState } from "react";

interface TooltipData {
  label: string;
  dims: string;
  x: number;
  y: number;
}

export interface TooltipHandlers {
  onEnter: (e: MouseEvent, label: string, dims: string) => void;
  onMove: (e: MouseEvent) => void;
  onLeave: () => void;
}

export function useSvgTooltip(containerRef: RefObject<HTMLDivElement | null>) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const onEnter = useCallback(
    (e: MouseEvent, label: string, dims: string) => {
      const c = containerRef.current;
      if (!c) return;
      const r = c.getBoundingClientRect();
      setTooltip({
        label,
        dims,
        x: e.clientX - r.left + c.scrollLeft,
        y: e.clientY - r.top + c.scrollTop,
      });
    },
    [containerRef],
  );

  const onMove = useCallback(
    (e: MouseEvent) => {
      const c = containerRef.current;
      if (!c) return;
      const r = c.getBoundingClientRect();
      setTooltip((prev) =>
        prev
          ? {
              ...prev,
              x: e.clientX - r.left + c.scrollLeft,
              y: e.clientY - r.top + c.scrollTop,
            }
          : null,
      );
    },
    [containerRef],
  );

  const onLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return { tooltip, tt: { onEnter, onMove, onLeave } };
}

export function SvgTooltipOverlay({
  tooltip,
}: {
  tooltip: TooltipData | null;
}) {
  if (!tooltip) return null;
  return (
    <div
      className="absolute pointer-events-none z-10 rounded bg-stone-800 px-2 py-1 text-xs text-white shadow-lg"
      style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
    >
      <div className="font-medium">{tooltip.label}</div>
      <div className="text-stone-300">{tooltip.dims}</div>
    </div>
  );
}

export function HoverRect({
  x = 0,
  y = 0,
  width,
  height,
  label,
  dims,
  tt,
}: {
  x?: number;
  y?: number;
  width: number;
  height: number;
  label: string;
  dims: string;
  tt: TooltipHandlers;
}) {
  if (width <= 0 || height <= 0) return null;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="transparent"
      className="cursor-pointer"
      onMouseEnter={(e) => {
        tt.onEnter(e, label, dims);
      }}
      onMouseMove={tt.onMove}
      onMouseLeave={tt.onLeave}
    />
  );
}

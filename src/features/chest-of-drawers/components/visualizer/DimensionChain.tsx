import type { Unit } from "../../types.ts";
import { HoverRect, type TooltipHandlers } from "./SvgTooltip.tsx";
import { fmt } from "./svg-constants.ts";

export interface ChainSegment {
  size: number;
  label: string;
  color: string;
  sublabel?: string;
}

interface DimensionChainProps {
  segments: ChainSegment[];
  expectedTotal?: number;
  orientation: "horizontal" | "vertical";
  anchor: number;
  offset: number;
  scale: number;
  unit: Unit;
  tt: TooltipHandlers;
  label?: string;
}

const TICK_SIZE = 0.5;
const FONT_SIZE = 1.3;
const BAR_THICKNESS = 2.5;
const SUM_GAP = 1.5;

/**
 * Minimum segment size (in px after scaling) to show an inline label.
 * For horizontal chains this is width; for vertical this is height.
 */
const MIN_LABEL_PX = 35;

/**
 * Minimum segment size in SVG units to show a vertical inline label.
 * This prevents overlapping text when segments are shorter than the font.
 */
const MIN_VERTICAL_LABEL_UNITS = FONT_SIZE * 2.5;

export default function DimensionChain({
  segments,
  expectedTotal,
  orientation,
  anchor,
  offset,
  scale,
  unit,
  tt,
  label,
}: DimensionChainProps) {
  const isH = orientation === "horizontal";
  const sum = segments.reduce((s, seg) => s + seg.size, 0);
  const mismatch =
    expectedTotal != null && Math.abs(sum - expectedTotal) > 0.001;

  // Precompute prefix sums (pure — no mutation)
  const segLayout = segments.reduce<{ start: number; end: number }[]>(
    (acc, seg) => {
      const prev = acc.length > 0 ? acc[acc.length - 1] : undefined;
      const start = prev ? prev.end : anchor;
      return [...acc, { start, end: start + seg.size }];
    },
    [],
  );
  const lastSeg =
    segLayout.length > 0 ? segLayout[segLayout.length - 1] : undefined;
  const totalEnd = lastSeg ? lastSeg.end : anchor;

  return (
    <g>
      {/* Chain label */}
      {label && (
        <text
          x={isH ? anchor - 1 : offset + BAR_THICKNESS / 2}
          y={isH ? offset - FONT_SIZE * 0.3 : anchor - 1}
          textAnchor={isH ? "start" : "middle"}
          fontSize={FONT_SIZE * 0.8}
          fill="#888"
          fontStyle="italic"
        >
          {label}
        </text>
      )}

      {segments.map((seg, i) => {
        const { start: segStart, end: segEnd } = segLayout[i] ?? {
          start: anchor,
          end: anchor,
        };
        const segPx = seg.size * scale;

        // Determine whether to show inline label
        const showLabel = isH
          ? segPx >= MIN_LABEL_PX
          : segPx >= MIN_LABEL_PX && seg.size >= MIN_VERTICAL_LABEL_UNITS;

        return (
          <g key={`${seg.label}-${String(i)}`}>
            {/* Colored bar */}
            {isH ? (
              <rect
                x={segStart}
                y={offset}
                width={seg.size}
                height={BAR_THICKNESS}
                fill={seg.color}
                stroke="#999"
                strokeWidth={0.1}
              />
            ) : (
              <rect
                x={offset}
                y={segStart}
                width={BAR_THICKNESS}
                height={seg.size}
                fill={seg.color}
                stroke="#999"
                strokeWidth={0.1}
              />
            )}

            {/* Tick mark at start */}
            {isH ? (
              <line
                x1={segStart}
                y1={offset - TICK_SIZE * 0.5}
                x2={segStart}
                y2={offset + BAR_THICKNESS + TICK_SIZE * 0.5}
                stroke="#666"
                strokeWidth={0.15}
              />
            ) : (
              <line
                x1={offset - TICK_SIZE * 0.5}
                y1={segStart}
                x2={offset + BAR_THICKNESS + TICK_SIZE * 0.5}
                y2={segStart}
                stroke="#666"
                strokeWidth={0.15}
              />
            )}

            {/* Inline label if wide/tall enough */}
            {showLabel &&
              (isH ? (
                <g>
                  <text
                    x={(segStart + segEnd) / 2}
                    y={offset + BAR_THICKNESS + FONT_SIZE + 0.5}
                    textAnchor="middle"
                    fontSize={FONT_SIZE}
                    fill="#333"
                  >
                    {fmt(seg.size, unit)}
                  </text>
                  <text
                    x={(segStart + segEnd) / 2}
                    y={
                      offset + BAR_THICKNESS + FONT_SIZE + 0.5 + FONT_SIZE * 0.9
                    }
                    textAnchor="middle"
                    fontSize={FONT_SIZE * 0.75}
                    fill="#666"
                  >
                    {seg.label}
                  </text>
                  {seg.sublabel && (
                    <text
                      x={(segStart + segEnd) / 2}
                      y={
                        offset +
                        BAR_THICKNESS +
                        FONT_SIZE +
                        0.5 +
                        FONT_SIZE * 1.7
                      }
                      textAnchor="middle"
                      fontSize={FONT_SIZE * 0.65}
                      fill="#888"
                    >
                      {seg.sublabel}
                    </text>
                  )}
                </g>
              ) : (
                <g>
                  <text
                    x={offset + BAR_THICKNESS + FONT_SIZE * 0.5}
                    y={(segStart + segEnd) / 2 + FONT_SIZE * 0.35}
                    textAnchor="start"
                    fontSize={FONT_SIZE}
                    fill="#333"
                  >
                    {fmt(seg.size, unit)} {seg.label}
                  </text>
                  {seg.sublabel && (
                    <text
                      x={offset + BAR_THICKNESS + FONT_SIZE * 0.5}
                      y={
                        (segStart + segEnd) / 2 +
                        FONT_SIZE * 0.35 +
                        FONT_SIZE * 0.9
                      }
                      textAnchor="start"
                      fontSize={FONT_SIZE * 0.65}
                      fill="#888"
                    >
                      {seg.sublabel}
                    </text>
                  )}
                </g>
              ))}

            {/* Hover target — always present for tooltip on hover */}
            {isH ? (
              <HoverRect
                x={segStart}
                y={offset}
                width={Math.max(seg.size, 0.5)}
                height={BAR_THICKNESS}
                label={seg.label}
                dims={`${fmt(seg.size, unit)}${seg.sublabel ? ` ${seg.sublabel}` : ""}`}
                tt={tt}
              />
            ) : (
              <HoverRect
                x={offset}
                y={segStart}
                width={BAR_THICKNESS}
                height={Math.max(seg.size, 0.5)}
                label={seg.label}
                dims={`${fmt(seg.size, unit)}${seg.sublabel ? ` ${seg.sublabel}` : ""}`}
                tt={tt}
              />
            )}
          </g>
        );
      })}

      {/* Final tick mark */}
      {isH ? (
        <line
          x1={totalEnd}
          y1={offset - TICK_SIZE * 0.5}
          x2={totalEnd}
          y2={offset + BAR_THICKNESS + TICK_SIZE * 0.5}
          stroke="#666"
          strokeWidth={0.15}
        />
      ) : (
        <line
          x1={offset - TICK_SIZE * 0.5}
          y1={totalEnd}
          x2={offset + BAR_THICKNESS + TICK_SIZE * 0.5}
          y2={totalEnd}
          stroke="#666"
          strokeWidth={0.15}
        />
      )}

      {/* Sum total */}
      {isH ? (
        <g>
          <text
            x={totalEnd + SUM_GAP}
            y={offset + BAR_THICKNESS / 2 + FONT_SIZE * 0.35}
            textAnchor="start"
            fontSize={FONT_SIZE}
            fontWeight="bold"
            fill={mismatch ? "#DC2626" : "#16A34A"}
          >
            = {fmt(sum, unit)}
          </text>
          {expectedTotal != null && (
            <text
              x={totalEnd + SUM_GAP}
              y={
                offset + BAR_THICKNESS / 2 + FONT_SIZE * 0.35 + FONT_SIZE * 1.0
              }
              textAnchor="start"
              fontSize={FONT_SIZE * 0.75}
              fill={mismatch ? "#DC2626" : "#888"}
            >
              {mismatch
                ? `expected ${fmt(expectedTotal, unit)}`
                : `\u2713 ${fmt(expectedTotal, unit)}`}
            </text>
          )}
        </g>
      ) : (
        <g>
          <text
            x={offset + BAR_THICKNESS / 2}
            y={totalEnd + SUM_GAP + FONT_SIZE}
            textAnchor="middle"
            fontSize={FONT_SIZE}
            fontWeight="bold"
            fill={mismatch ? "#DC2626" : "#16A34A"}
          >
            = {fmt(sum, unit)}
          </text>
          {expectedTotal != null && (
            <text
              x={offset + BAR_THICKNESS / 2}
              y={totalEnd + SUM_GAP + FONT_SIZE * 2.1}
              textAnchor="middle"
              fontSize={FONT_SIZE * 0.75}
              fill={mismatch ? "#DC2626" : "#888"}
            >
              {mismatch
                ? `expected ${fmt(expectedTotal, unit)}`
                : `\u2713 ${fmt(expectedTotal, unit)}`}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

import type { CarcassDimensions, ChestConfig } from "../../types.ts";
import DimensionLine from "./DimensionLine.tsx";
import InsetRect from "./InsetRect.tsx";
import { COLORS, DIM_OFFSET, fmt, fmtPanel } from "./svg-constants.ts";
import { HoverRect, type TooltipHandlers } from "./SvgTooltip.tsx";

interface SideViewProps {
  config: ChestConfig;
  carcass: CarcassDimensions;
  tt: TooltipHandlers;
}

export default function SideView({ config, carcass, tt }: SideViewProps) {
  const topBottomWood = config.woodAssignments.carcassTopBottom;
  const topT = topBottomWood.actual;
  const { unit } = config;
  const panelDim = fmtPanel(topBottomWood, unit);

  const depthViolated = carcass.constraintViolations.some(
    (v) => v.dimension === "depth",
  );
  const heightViolated = carcass.constraintViolations.some(
    (v) => v.dimension === "height",
  );

  return (
    <g>
      {/* Side panel (full exterior face) */}
      <InsetRect
        x={0}
        y={0}
        width={carcass.outerDepth}
        height={carcass.outerHeight}
        fill={COLORS.carcassFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.5}
      />

      {/* Top panel */}
      <rect
        x={0}
        y={0}
        width={carcass.outerDepth}
        height={topT}
        fill={COLORS.faceFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.25}
      />

      {/* Bottom panel */}
      <rect
        x={0}
        y={carcass.outerHeight - topT}
        width={carcass.outerDepth}
        height={topT}
        fill={COLORS.faceFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.25}
      />

      {/* Overall depth */}
      <DimensionLine
        x1={0}
        y1={0}
        x2={carcass.outerDepth}
        y2={0}
        label={fmt(carcass.outerDepth, unit)}
        offset={-DIM_OFFSET}
        orientation="horizontal"
        violated={depthViolated}
      />

      {/* Overall height */}
      <DimensionLine
        x1={carcass.outerDepth}
        y1={0}
        x2={carcass.outerDepth}
        y2={carcass.outerHeight}
        label={fmt(carcass.outerHeight, unit)}
        offset={-DIM_OFFSET}
        orientation="vertical"
        violated={heightViolated}
      />

      {/* Top panel height */}
      <DimensionLine
        x1={0}
        y1={0}
        x2={0}
        y2={topT}
        label={panelDim.label}
        sublabel={panelDim.sublabel}
        offset={DIM_OFFSET / 2}
        orientation="vertical"
      />

      {/* Side panel height */}
      <DimensionLine
        x1={0}
        y1={topT}
        x2={0}
        y2={carcass.outerHeight - topT}
        label={fmt(carcass.outerHeight - 2 * topT, unit)}
        offset={DIM_OFFSET / 2}
        orientation="vertical"
      />

      {/* Bottom panel height */}
      <DimensionLine
        x1={0}
        y1={carcass.outerHeight - topT}
        x2={0}
        y2={carcass.outerHeight}
        label={panelDim.label}
        sublabel={panelDim.sublabel}
        offset={DIM_OFFSET / 2}
        orientation="vertical"
      />

      {/* Hover targets */}
      <HoverRect
        x={0}
        y={topT}
        width={carcass.outerDepth}
        height={carcass.outerHeight - 2 * topT}
        label="Side Panel"
        dims={`${fmt(carcass.outerDepth, unit)} \u00d7 ${fmt(carcass.outerHeight - 2 * topT, unit)}`}
        tt={tt}
      />
      <HoverRect
        x={0}
        y={0}
        width={carcass.outerDepth}
        height={topT}
        label="Top Panel"
        dims={`${fmt(carcass.outerDepth, unit)} \u00d7 ${fmt(topT, unit)}`}
        tt={tt}
      />
      <HoverRect
        x={0}
        y={carcass.outerHeight - topT}
        width={carcass.outerDepth}
        height={topT}
        label="Bottom Panel"
        dims={`${fmt(carcass.outerDepth, unit)} \u00d7 ${fmt(topT, unit)}`}
        tt={tt}
      />
    </g>
  );
}

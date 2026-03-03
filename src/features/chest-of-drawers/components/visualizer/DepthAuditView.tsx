import type {
  CarcassDimensions,
  ChestConfig,
  DrawerBoxDimensions,
} from "../../types.ts";
import InsetRect from "./InsetRect.tsx";
import DimensionChain, { type ChainSegment } from "./DimensionChain.tsx";
import { COLORS, DIM_OFFSET, LABEL_FONT_SIZE, fmt } from "./svg-constants.ts";
import { HoverRect, type TooltipHandlers } from "./SvgTooltip.tsx";

interface DepthAuditViewProps {
  config: ChestConfig;
  carcass: CarcassDimensions;
  drawerBoxes: DrawerBoxDimensions[];
  selectedColumn: number;
  tt: TooltipHandlers;
  scale: number;
}

const H_CHAIN_GAP = 8;
/** Gap between carcass panel drawing and drawer box drawing. */
const INNER_GAP = 3;

/** Calculate content size for the depth audit view. */
export function depthAuditContentSize(carcass: CarcassDimensions): {
  width: number;
  height: number;
} {
  return {
    width: carcass.outerDepth + 20,
    height: carcass.outerHeight + 3 * H_CHAIN_GAP + 12,
  };
}

export default function DepthAuditView({
  config,
  carcass,
  drawerBoxes,
  selectedColumn,
  tt,
  scale,
}: DepthAuditViewProps) {
  const { unit } = config;
  const backT = config.woodAssignments.carcassBack.actual;
  const topT = config.woodAssignments.carcassTopBottom.actual;
  const backClearance = config.drawerBackClearance;
  const slideLength = config.slideSpec.length;
  const innerDepth = carcass.innerDepth;

  const column = config.columns[selectedColumn];
  const boxForColumn = column
    ? drawerBoxes.find((b) => b.columnId === column.id)
    : null;
  const boxDepth = boxForColumn ? boxForColumn.boxOuterDepth : slideLength;

  // ----- Drawing: side cutaway -----
  const drawingWidth = carcass.outerDepth;
  const drawingHeight = carcass.outerHeight;

  const drawing = (
    <g>
      {/* Carcass outline */}
      <InsetRect
        x={0}
        y={0}
        width={drawingWidth}
        height={drawingHeight}
        fill={COLORS.openingFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.5}
      />

      {/* Back panel */}
      <InsetRect
        x={0}
        y={0}
        width={backT}
        height={drawingHeight}
        fill={COLORS.backPanelFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.25}
      />

      {/* Top panel */}
      <rect
        x={0}
        y={0}
        width={drawingWidth}
        height={topT}
        fill={COLORS.carcassFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.15}
      />

      {/* Bottom panel */}
      <rect
        x={0}
        y={drawingHeight - topT}
        width={drawingWidth}
        height={topT}
        fill={COLORS.carcassFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.15}
      />

      {/* Drawer box floating inside */}
      {(() => {
        const boxX = backT + backClearance;
        const boxY = topT + INNER_GAP;
        const boxW = boxDepth;
        const boxH = drawingHeight - 2 * topT - 2 * INNER_GAP;
        return (
          <g>
            <InsetRect
              x={boxX}
              y={boxY}
              width={boxW}
              height={boxH}
              fill={COLORS.boxFill}
              stroke={COLORS.boxStroke}
              strokeWidth={0.4}
            />
            <text
              x={boxX + boxW / 2}
              y={boxY + boxH / 2 + LABEL_FONT_SIZE * 0.35}
              textAnchor="middle"
              fontSize={LABEL_FONT_SIZE}
              fill={COLORS.boxStroke}
            >
              Drawer Box
            </text>

            {/* Slide band at bottom of box */}
            <rect
              x={boxX}
              y={boxY + boxH - 1.5}
              width={boxW}
              height={1.5}
              fill={COLORS.slideFill}
              opacity={0.6}
            />
          </g>
        );
      })()}

      {/* Hover targets */}
      <HoverRect
        x={0}
        y={0}
        width={backT}
        height={drawingHeight}
        label="Back Panel"
        dims={`${fmt(backT, unit)} thick`}
        tt={tt}
      />
      <HoverRect
        x={backT}
        y={topT}
        width={backClearance}
        height={drawingHeight - 2 * topT}
        label="Back Clearance"
        dims={fmt(backClearance, unit)}
        tt={tt}
      />
      <HoverRect
        x={backT + backClearance}
        y={topT}
        width={boxDepth}
        height={drawingHeight - 2 * topT}
        label="Drawer Box Depth"
        dims={fmt(boxDepth, unit)}
        tt={tt}
      />
    </g>
  );

  // ----- Horizontal Dimension Chains (below drawing) -----
  const chainY1 = drawingHeight + DIM_OFFSET;
  const chainY2 = chainY1 + H_CHAIN_GAP;
  const chainY3 = chainY2 + H_CHAIN_GAP;

  // Carcass chain: back panel | inner depth → outerDepth
  const carcassChain: ChainSegment[] = [
    { size: backT, label: "back panel", color: COLORS.backPanelFill },
    { size: innerDepth, label: "inner depth", color: COLORS.openingFill },
  ];

  // Slide chain: back panel | back clearance | slide length
  const slideChain: ChainSegment[] = [
    { size: backT, label: "back panel", color: COLORS.backPanelFill },
    {
      size: backClearance,
      label: "back clearance",
      color: COLORS.clearanceFill,
    },
    { size: slideLength, label: "slide length", color: COLORS.slideFill },
  ];

  // Box chain: back panel | back clearance | box depth
  const boxChain: ChainSegment[] = [
    { size: backT, label: "back panel", color: COLORS.backPanelFill },
    {
      size: backClearance,
      label: "back clearance",
      color: COLORS.clearanceFill,
    },
    { size: boxDepth, label: "box depth", color: COLORS.boxFill },
  ];

  return (
    <g>
      {drawing}

      <DimensionChain
        segments={carcassChain}
        expectedTotal={carcass.outerDepth}
        orientation="horizontal"
        anchor={0}
        offset={chainY1}
        scale={scale}
        unit={unit}
        tt={tt}
        label="Carcass"
      />
      <DimensionChain
        segments={slideChain}
        expectedTotal={carcass.outerDepth}
        orientation="horizontal"
        anchor={0}
        offset={chainY2}
        scale={scale}
        unit={unit}
        tt={tt}
        label="Slides"
      />
      <DimensionChain
        segments={boxChain}
        expectedTotal={carcass.outerDepth}
        orientation="horizontal"
        anchor={0}
        offset={chainY3}
        scale={scale}
        unit={unit}
        tt={tt}
        label="Box"
      />
    </g>
  );
}

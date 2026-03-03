import type {
  CarcassDimensions,
  ChestConfig,
  DrawerBoxDimensions,
} from "../../types.ts";
import InsetRect from "./InsetRect.tsx";
import DimensionChain, { type ChainSegment } from "./DimensionChain.tsx";
import { COLORS, DIM_OFFSET, LABEL_FONT_SIZE, fmt } from "./svg-constants.ts";
import { HoverRect, type TooltipHandlers } from "./SvgTooltip.tsx";

interface WidthAuditViewProps {
  config: ChestConfig;
  carcass: CarcassDimensions;
  drawerBoxes: DrawerBoxDimensions[];
  selectedColumn: number;
  tt: TooltipHandlers;
  scale: number;
}

/** Fixed visual height for the top-down cutaway drawing. */
const DRAWING_HEIGHT = 12;
const H_CHAIN_GAP = 8;

/** Calculate content size for the width audit view. */
export function widthAuditContentSize(carcass: CarcassDimensions): {
  width: number;
  height: number;
} {
  return {
    width: carcass.outerWidth + 20,
    height: DRAWING_HEIGHT + H_CHAIN_GAP + 15,
  };
}

export default function WidthAuditView({
  config,
  carcass,
  drawerBoxes,
  selectedColumn,
  tt,
  scale,
}: WidthAuditViewProps) {
  const { unit } = config;
  const sideT = config.woodAssignments.carcassSides.actual;
  const dividerT = config.woodAssignments.carcassDividers.actual;
  const gap = config.drawerVerticalClearance; // horizontal slide clearance is same value

  // Select which row to show — use selectedColumn to pick a row index
  // (really "selectedRow" but we reuse the column selector)
  const rowIndex = selectedColumn;

  // Build the drawing: top-down cutaway of a single row
  const drawH = DRAWING_HEIGHT;
  const innerH = drawH * 0.6;
  const innerY = (drawH - innerH) / 2;

  // Build segments and drawing elements
  const segments: ChainSegment[] = [];
  const drawElements: React.ReactNode[] = [];

  let xPos = 0;

  // Left side panel
  segments.push({ size: sideT, label: "side", color: COLORS.carcassFill });
  drawElements.push(
    <InsetRect
      key="left-side"
      x={0}
      y={0}
      width={sideT}
      height={drawH}
      fill={COLORS.carcassFill}
      stroke={COLORS.carcassStroke}
      strokeWidth={0.3}
    />,
  );
  xPos += sideT;

  for (const [colIdx, col] of config.columns.entries()) {
    const row = col.rows[rowIndex] ?? col.rows[0];
    if (!row) continue;

    const box = drawerBoxes.find(
      (b) => b.columnId === col.id && b.rowId === row.id,
    );
    const boxWidth = box ? box.boxOuterWidth : col.openingWidth - 2 * gap;

    // Left clearance
    const leftClearance = (col.openingWidth - boxWidth) / 2;
    if (leftClearance > 0.001) {
      segments.push({
        size: leftClearance,
        label: "clearance",
        color: COLORS.clearanceFill,
      });
      xPos += leftClearance;
    }

    // Drawer box
    segments.push({
      size: boxWidth,
      label: `box ${String(colIdx + 1)}`,
      color: COLORS.boxFill,
    });
    drawElements.push(
      <InsetRect
        key={`box-${col.id}`}
        x={xPos}
        y={innerY}
        width={boxWidth}
        height={innerH}
        fill={COLORS.boxFill}
        stroke={COLORS.boxStroke}
        strokeWidth={0.3}
      />,
    );
    drawElements.push(
      <text
        key={`box-label-${col.id}`}
        x={xPos + boxWidth / 2}
        y={innerY + innerH / 2 + LABEL_FONT_SIZE * 0.35}
        textAnchor="middle"
        fontSize={LABEL_FONT_SIZE}
        fill={COLORS.boxStroke}
      >
        Box {String(colIdx + 1)}
      </text>,
    );
    xPos += boxWidth;

    // Right clearance
    const rightClearance = col.openingWidth - boxWidth - leftClearance;
    if (rightClearance > 0.001) {
      segments.push({
        size: rightClearance,
        label: "clearance",
        color: COLORS.clearanceFill,
      });
      xPos += rightClearance;
    }

    // Divider
    if (colIdx < config.columns.length - 1) {
      segments.push({
        size: dividerT,
        label: "divider",
        color: COLORS.carcassStroke,
      });
      drawElements.push(
        <InsetRect
          key={`div-${col.id}`}
          x={xPos}
          y={0}
          width={dividerT}
          height={drawH}
          fill={COLORS.carcassStroke}
          stroke={COLORS.carcassStroke}
          strokeWidth={0.15}
        />,
      );
      xPos += dividerT;
    }
  }

  // Right side panel
  segments.push({ size: sideT, label: "side", color: COLORS.carcassFill });
  drawElements.push(
    <InsetRect
      key="right-side"
      x={xPos}
      y={0}
      width={sideT}
      height={drawH}
      fill={COLORS.carcassFill}
      stroke={COLORS.carcassStroke}
      strokeWidth={0.3}
    />,
  );

  // Opening fill behind boxes
  const openingElements: React.ReactNode[] = [];
  let ox = sideT;
  for (const [colIdx, col] of config.columns.entries()) {
    openingElements.push(
      <rect
        key={`opening-${col.id}`}
        x={ox}
        y={0}
        width={col.openingWidth}
        height={drawH}
        fill={COLORS.openingFill}
      />,
    );
    ox += col.openingWidth;
    if (colIdx < config.columns.length - 1) {
      ox += dividerT;
    }
  }

  const chainY = drawH + DIM_OFFSET;

  return (
    <g>
      {/* Carcass outline */}
      <InsetRect
        x={0}
        y={0}
        width={carcass.outerWidth}
        height={drawH}
        fill={COLORS.carcassFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.5}
      />

      {/* Openings background */}
      {openingElements}

      {/* Structural elements and boxes */}
      {drawElements}

      {/* Hover targets */}
      <HoverRect
        x={0}
        y={0}
        width={carcass.outerWidth}
        height={drawH}
        label="Width Cross Section"
        dims={`${fmt(carcass.outerWidth, unit)} total width`}
        tt={tt}
      />

      {/* Dimension chain */}
      <DimensionChain
        segments={segments}
        expectedTotal={carcass.outerWidth}
        orientation="horizontal"
        anchor={0}
        offset={chainY}
        scale={scale}
        unit={unit}
        tt={tt}
        label="Width breakdown"
      />
    </g>
  );
}

import type {
  CarcassDimensions,
  ChestConfig,
  DrawerBoxDimensions,
} from "../../types.ts";
import { getColumnInnerHeight } from "../../calculations/carcass.ts";
import InsetRect from "./InsetRect.tsx";
import DimensionChain, { type ChainSegment } from "./DimensionChain.tsx";
import { COLORS, DIM_OFFSET, LABEL_FONT_SIZE, fmt } from "./svg-constants.ts";
import { HoverRect, type TooltipHandlers } from "./SvgTooltip.tsx";

interface FrontAuditViewProps {
  config: ChestConfig;
  carcass: CarcassDimensions;
  drawerBoxes: DrawerBoxDimensions[];
  selectedColumn: number;
  tt: TooltipHandlers;
  scale: number;
}

/** Vertical spacing between stacked horizontal chains below the drawing. */
const H_CHAIN_GAP = 8;
/** Horizontal spacing between the two vertical chains to the right. */
const V_CHAIN_GAP = 14;

interface OpeningRect {
  x: number;
  y: number;
  width: number;
  height: number;
  columnId: string;
  rowId: string;
}

function computeOpenings(config: ChestConfig): OpeningRect[] {
  const sideT = config.woodAssignments.carcassSides.actual;
  const topT = config.woodAssignments.carcassTopBottom.actual;
  const dividerT = config.woodAssignments.carcassDividers.actual;
  const railT = config.horizontalRails.enabled
    ? config.horizontalRails.thickness.actual
    : 0;

  const openings: OpeningRect[] = [];
  let xPos = sideT;

  for (const col of config.columns) {
    let yPos = topT;
    for (const row of col.rows) {
      openings.push({
        x: xPos,
        y: yPos,
        width: col.openingWidth,
        height: row.openingHeight,
        columnId: col.id,
        rowId: row.id,
      });
      yPos += row.openingHeight + railT;
    }
    xPos += col.openingWidth + dividerT;
  }

  return openings;
}

function buildHorizontalStructuralChain(config: ChestConfig): ChainSegment[] {
  const sideT = config.woodAssignments.carcassSides.actual;
  const dividerT = config.woodAssignments.carcassDividers.actual;

  const segments: ChainSegment[] = [];
  segments.push({
    size: sideT,
    label: "side",
    color: COLORS.carcassFill,
  });

  for (const [i, col] of config.columns.entries()) {
    segments.push({
      size: col.openingWidth,
      label: `opening ${String(i + 1)}`,
      color: COLORS.openingFill,
    });
    if (i < config.columns.length - 1) {
      segments.push({
        size: dividerT,
        label: "divider",
        color: COLORS.carcassStroke,
      });
    }
  }

  segments.push({
    size: sideT,
    label: "side",
    color: COLORS.carcassFill,
  });

  return segments;
}

function buildHorizontalFaceChain(
  config: ChestConfig,
  drawerBoxes: DrawerBoxDimensions[],
): ChainSegment[] {
  const segments: ChainSegment[] = [];

  for (const [i, col] of config.columns.entries()) {
    const firstRow = col.rows[0];
    if (!firstRow) continue;
    const box = drawerBoxes.find(
      (b) => b.columnId === col.id && b.rowId === firstRow.id,
    );
    if (!box) continue;

    const hReveal = (col.openingWidth - box.faceWidth) / 2;
    const sideT = config.woodAssignments.carcassSides.actual;

    if (i === 0) {
      segments.push({
        size: sideT + hReveal,
        label: "reveal",
        color: COLORS.revealFill,
      });
    } else {
      const dividerT = config.woodAssignments.carcassDividers.actual;
      const prevCol = config.columns[i - 1];
      const prevRow = prevCol?.rows[0];
      const prevBox =
        prevCol && prevRow
          ? drawerBoxes.find(
              (b) => b.columnId === prevCol.id && b.rowId === prevRow.id,
            )
          : null;
      const prevHReveal =
        prevBox && prevCol ? (prevCol.openingWidth - prevBox.faceWidth) / 2 : 0;
      segments.push({
        size: prevHReveal + dividerT + hReveal,
        label: "reveal",
        color: COLORS.revealFill,
      });
    }

    segments.push({
      size: box.faceWidth,
      label: `face ${String(i + 1)}`,
      color: COLORS.faceFill,
    });

    if (i === config.columns.length - 1) {
      segments.push({
        size: hReveal + sideT,
        label: "reveal",
        color: COLORS.revealFill,
      });
    }
  }

  return segments;
}

function buildVerticalStructuralChain(
  config: ChestConfig,
  columnIndex: number,
  carcass: CarcassDimensions,
  drawerBoxes: DrawerBoxDimensions[],
): ChainSegment[] {
  const topT = config.woodAssignments.carcassTopBottom.actual;
  const railT = config.horizontalRails.enabled
    ? config.horizontalRails.thickness.actual
    : 0;
  const clearance = config.drawerVerticalClearance;
  const column = config.columns[columnIndex];
  if (!column) return [];

  const segments: ChainSegment[] = [];
  segments.push({
    size: topT,
    label: "top",
    color: COLORS.carcassFill,
  });

  for (const [i, row] of column.rows.entries()) {
    const box = drawerBoxes.find(
      (b) => b.columnId === column.id && b.rowId === row.id,
    );
    const boxH = box ? box.boxOuterHeight : row.openingHeight - clearance;

    segments.push({
      size: clearance,
      label: "clearance",
      color: COLORS.clearanceFill,
    });
    segments.push({
      size: boxH,
      label: `box ${String(i + 1)}`,
      color: COLORS.boxFill,
    });
    if (railT > 0 && i < column.rows.length - 1) {
      segments.push({
        size: railT,
        label: "rail",
        color: COLORS.railFill,
      });
    }
  }

  // Bottom gap below bottom drawer
  segments.push({
    size: clearance,
    label: "clearance",
    color: COLORS.clearanceFill,
  });

  // Dead space if this column is shorter than tallest
  const colInnerH = getColumnInnerHeight(column, config);
  const maxInnerH = carcass.outerHeight - 2 * topT;
  const deadSpace = maxInnerH - colInnerH;
  if (deadSpace > 0.001) {
    segments.push({
      size: deadSpace,
      label: "dead space",
      color: "#FEF3C7",
    });
  }

  segments.push({
    size: topT,
    label: "bottom",
    color: COLORS.carcassFill,
  });

  return segments;
}

function buildVerticalFaceChain(
  config: ChestConfig,
  columnIndex: number,
  carcass: CarcassDimensions,
  drawerBoxes: DrawerBoxDimensions[],
): ChainSegment[] {
  const column = config.columns[columnIndex];
  if (!column) return [];

  const topT = config.woodAssignments.carcassTopBottom.actual;
  const railT = config.horizontalRails.enabled
    ? config.horizontalRails.thickness.actual
    : 0;
  const bottomGap = config.drawerVerticalClearance;

  const segments: ChainSegment[] = [];

  for (const [i, row] of column.rows.entries()) {
    const box = drawerBoxes.find(
      (b) => b.columnId === column.id && b.rowId === row.id,
    );
    if (!box) continue;

    const vReveal = (row.openingHeight - box.faceHeight) / 2;

    if (i === 0) {
      // Top panel + top reveal
      segments.push({
        size: topT + vReveal,
        label: "reveal",
        color: COLORS.revealFill,
      });
    } else {
      // Reveal between faces: prev bottom reveal + rail + this top reveal
      const prevRow = column.rows[i - 1];
      const prevBox = prevRow
        ? drawerBoxes.find(
            (b) => b.columnId === column.id && b.rowId === prevRow.id,
          )
        : null;
      const prevVReveal =
        prevBox && prevRow
          ? (prevRow.openingHeight - prevBox.faceHeight) / 2
          : 0;
      segments.push({
        size: prevVReveal + railT + vReveal,
        label: "reveal",
        color: COLORS.revealFill,
      });
    }

    segments.push({
      size: box.faceHeight,
      label: `face ${String(i + 1)}`,
      color: COLORS.faceFill,
    });

    if (i === column.rows.length - 1) {
      // Bottom reveal + bottom gap + dead space + bottom panel
      const colInnerH = getColumnInnerHeight(column, config);
      const maxInnerH = carcass.outerHeight - 2 * topT;
      const deadSpace = maxInnerH - colInnerH;
      segments.push({
        size: vReveal + bottomGap + deadSpace + topT,
        label: "reveal",
        color: COLORS.revealFill,
      });
    }
  }

  return segments;
}

/** Calculate content size for the front audit view. */
export function frontAuditContentSize(carcass: CarcassDimensions): {
  width: number;
  height: number;
} {
  // Right side: two vertical chains (structural + face) for selected column
  const rightMargin = DIM_OFFSET + 2 * V_CHAIN_GAP + 8;

  // Bottom: two horizontal chains
  const bottomMargin = 2 * H_CHAIN_GAP + 12;

  return {
    width: carcass.outerWidth + rightMargin,
    height: carcass.outerHeight + bottomMargin,
  };
}

export default function FrontAuditView({
  config,
  carcass,
  drawerBoxes,
  selectedColumn,
  tt,
  scale,
}: FrontAuditViewProps) {
  const { unit } = config;
  const topT = config.woodAssignments.carcassTopBottom.actual;
  const sideT = config.woodAssignments.carcassSides.actual;
  const dividerT = config.woodAssignments.carcassDividers.actual;
  const railT = config.horizontalRails.enabled
    ? config.horizontalRails.thickness.actual
    : 0;
  const innerW = carcass.outerWidth - 2 * sideT;
  const innerH = carcass.outerHeight - 2 * topT;
  const openings = computeOpenings(config);

  // ----- Drawing -----
  const drawing = (
    <g>
      {/* Carcass outline */}
      <InsetRect
        x={0}
        y={0}
        width={carcass.outerWidth}
        height={carcass.outerHeight}
        fill={COLORS.carcassFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.5}
      />

      {/* Dark interior */}
      <rect
        x={sideT}
        y={topT}
        width={innerW}
        height={innerH}
        fill={COLORS.revealFill}
      />

      {/* Dividers (inset style only) */}
      {config.drawerStyle === "inset" &&
        (() => {
          let xPos = sideT;
          return config.columns.map((col, i) => {
            const divX = xPos + col.openingWidth;
            xPos += col.openingWidth + dividerT;
            if (i >= config.columns.length - 1) return null;
            return (
              <InsetRect
                key={`div-${col.id}`}
                x={divX}
                y={topT}
                width={dividerT}
                height={innerH}
                fill={COLORS.carcassStroke}
                stroke={COLORS.carcassStroke}
                strokeWidth={0.25}
              />
            );
          });
        })()}

      {/* Rails */}
      {config.horizontalRails.enabled &&
        (() => {
          let rx = sideT;
          return config.columns.flatMap((col) => {
            const rails = [];
            let ry = topT;
            for (const [r, row] of col.rows.entries()) {
              if (r >= col.rows.length - 1) break;
              ry += row.openingHeight;
              rails.push(
                <rect
                  key={`rail-${col.id}-${row.id}`}
                  x={rx}
                  y={ry}
                  width={col.openingWidth}
                  height={railT}
                  fill={COLORS.carcassFill}
                  stroke={COLORS.carcassStroke}
                  strokeWidth={0.1}
                />,
              );
              ry += railT;
            }
            rx += col.openingWidth + dividerT;
            return rails;
          });
        })()}

      {/* Dead space hatching */}
      {config.columns.length > 1 && (
        <>
          <defs>
            <pattern
              id="deadspace-hatch"
              width={1.5}
              height={1.5}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={1.5}
                stroke="#D97706"
                strokeWidth={0.3}
                strokeOpacity={0.5}
              />
            </pattern>
          </defs>
          {config.columns.map((col) => {
            const colInnerH = getColumnInnerHeight(col, config);
            const gap = innerH - colInnerH;
            if (gap <= 0) return null;
            let xPos = sideT;
            for (const c of config.columns) {
              if (c.id === col.id) break;
              xPos += c.openingWidth + dividerT;
            }
            return (
              <g key={`dead-${col.id}`}>
                <rect
                  x={xPos}
                  y={topT + colInnerH}
                  width={col.openingWidth}
                  height={gap}
                  fill="url(#deadspace-hatch)"
                />
                <text
                  x={xPos + col.openingWidth / 2}
                  y={topT + colInnerH + gap / 2 + LABEL_FONT_SIZE * 0.35}
                  textAnchor="middle"
                  fontSize={LABEL_FONT_SIZE}
                  fill="#92400E"
                >
                  {fmt(gap, unit)} gap
                </text>
              </g>
            );
          })}
        </>
      )}

      {/* Drawer faces */}
      {openings.map((o) => {
        const box = drawerBoxes.find(
          (b) => b.columnId === o.columnId && b.rowId === o.rowId,
        );
        if (!box) return null;
        const faceX = o.x + (o.width - box.faceWidth) / 2;
        const faceY = o.y + (o.height - box.faceHeight) / 2;
        return (
          <g key={`face-${o.columnId}-${o.rowId}`}>
            <rect
              x={faceX}
              y={faceY}
              width={box.faceWidth}
              height={box.faceHeight}
              fill={COLORS.faceFill}
            />
            <text
              x={faceX + box.faceWidth / 2}
              y={faceY + box.faceHeight / 2 + LABEL_FONT_SIZE * 0.35}
              textAnchor="middle"
              fontSize={LABEL_FONT_SIZE}
              fill={COLORS.carcassStroke}
            >
              {fmt(box.faceHeight, unit)}
            </text>
          </g>
        );
      })}

      {/* Hover targets */}
      <HoverRect
        x={0}
        y={0}
        width={carcass.outerWidth}
        height={topT}
        label="Top Panel"
        dims={`${fmt(carcass.outerWidth, unit)} \u00d7 ${fmt(topT, unit)}`}
        tt={tt}
      />
      <HoverRect
        x={0}
        y={carcass.outerHeight - topT}
        width={carcass.outerWidth}
        height={topT}
        label="Bottom Panel"
        dims={`${fmt(carcass.outerWidth, unit)} \u00d7 ${fmt(topT, unit)}`}
        tt={tt}
      />
      <HoverRect
        x={0}
        y={topT}
        width={sideT}
        height={innerH}
        label="Left Side"
        dims={`${fmt(sideT, unit)} \u00d7 ${fmt(innerH, unit)}`}
        tt={tt}
      />
      <HoverRect
        x={carcass.outerWidth - sideT}
        y={topT}
        width={sideT}
        height={innerH}
        label="Right Side"
        dims={`${fmt(sideT, unit)} \u00d7 ${fmt(innerH, unit)}`}
        tt={tt}
      />
      {openings.map((o) => {
        const box = drawerBoxes.find(
          (b) => b.columnId === o.columnId && b.rowId === o.rowId,
        );
        if (!box) return null;
        const faceX = o.x + (o.width - box.faceWidth) / 2;
        const faceY = o.y + (o.height - box.faceHeight) / 2;
        return (
          <HoverRect
            key={`hover-face-${o.columnId}-${o.rowId}`}
            x={faceX}
            y={faceY}
            width={box.faceWidth}
            height={box.faceHeight}
            label="Drawer Face"
            dims={`${fmt(box.faceWidth, unit)} \u00d7 ${fmt(box.faceHeight, unit)}`}
            tt={tt}
          />
        );
      })}
    </g>
  );

  // ----- Horizontal Dimension Chains (below drawing) -----
  const hChainY1 = carcass.outerHeight + DIM_OFFSET;
  const hChainY2 = hChainY1 + H_CHAIN_GAP;

  const hStructural = buildHorizontalStructuralChain(config);
  const hFace = buildHorizontalFaceChain(config, drawerBoxes);

  // ----- Vertical Dimension Chains (right of drawing, selected column only) -----
  const vChainX = carcass.outerWidth + DIM_OFFSET;

  const vStructural = buildVerticalStructuralChain(
    config,
    selectedColumn,
    carcass,
    drawerBoxes,
  );
  const vFace = buildVerticalFaceChain(
    config,
    selectedColumn,
    carcass,
    drawerBoxes,
  );

  return (
    <g>
      {drawing}

      {/* Horizontal chains */}
      <DimensionChain
        segments={hStructural}
        expectedTotal={carcass.outerWidth}
        orientation="horizontal"
        anchor={0}
        offset={hChainY1}
        scale={scale}
        unit={unit}
        tt={tt}
        label="Structural"
      />
      <DimensionChain
        segments={hFace}
        expectedTotal={carcass.outerWidth}
        orientation="horizontal"
        anchor={0}
        offset={hChainY2}
        scale={scale}
        unit={unit}
        tt={tt}
        label="Faces"
      />

      {/* Vertical chains — selected column only */}
      <DimensionChain
        segments={vStructural}
        expectedTotal={carcass.outerHeight}
        orientation="vertical"
        anchor={0}
        offset={vChainX}
        scale={scale}
        unit={unit}
        tt={tt}
        label={
          config.columns.length > 1
            ? `Col ${String(selectedColumn + 1)} structural`
            : "Structural"
        }
      />
      <DimensionChain
        segments={vFace}
        expectedTotal={carcass.outerHeight}
        orientation="vertical"
        anchor={0}
        offset={vChainX + V_CHAIN_GAP}
        scale={scale}
        unit={unit}
        tt={tt}
        label={
          config.columns.length > 1
            ? `Col ${String(selectedColumn + 1)} faces`
            : "Faces"
        }
      />
    </g>
  );
}

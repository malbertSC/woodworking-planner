import type {
  CarcassDimensions,
  ChestConfig,
  Column,
  DrawerBoxDimensions,
} from "../../types.ts";
import { getColumnInnerHeight } from "../../calculations/carcass.ts";
import { computeSlidePositions } from "../../calculations/jig.ts";
import DimensionLine from "./DimensionLine.tsx";
import InsetRect from "./InsetRect.tsx";
import { COLORS, DIM_OFFSET, LABEL_FONT_SIZE, fmt } from "./svg-constants.ts";
import { HoverRect, type TooltipHandlers } from "./SvgTooltip.tsx";

interface SlideLayoutViewProps {
  config: ChestConfig;
  carcass: CarcassDimensions;
  drawerBoxes: DrawerBoxDimensions[];
  tt: TooltipHandlers;
}

/** Visual height of the slide band in the diagram (inches). */
const SLIDE_BAND_HEIGHT = 1.75;
/** Horizontal gap between the carcass panel and drawer box diagrams. */
const DIAGRAM_GAP = 8;
/** Vertical gap between stacked drawer boxes. */
const BOX_GAP = 2;
/** Vertical gap between column sections. */
const SECTION_GAP = 10;
/** Height reserved for column section labels. */
const SECTION_LABEL_HEIGHT = 3;

function CarcassPanel({
  column,
  config,
  carcass,
  x,
  y,
  tt,
}: {
  column: Column;
  config: ChestConfig;
  carcass: CarcassDimensions;
  x: number;
  y: number;
  tt: TooltipHandlers;
}) {
  const { unit } = config;
  const colInnerHeight = getColumnInnerHeight(column, config);
  const panelWidth = carcass.innerDepth;
  const positions = computeSlidePositions(column, config);
  const bandH = Math.min(
    SLIDE_BAND_HEIGHT,
    ...column.rows.map((r) => r.openingHeight),
  );

  const nonZeroPositions = positions
    .filter((p) => p.distanceFromBottom > 0)
    .sort((a, b) => a.distanceFromBottom - b.distanceFromBottom);

  return (
    <g transform={`translate(${String(x)}, ${String(y)})`}>
      <InsetRect
        width={panelWidth}
        height={colInnerHeight}
        fill={COLORS.openingFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.5}
      />

      {/* Slide bands */}
      {positions.map((pos) => {
        const bandY = colInnerHeight - pos.distanceFromBottom - bandH;
        return (
          <g key={pos.rowId}>
            <rect
              x={0}
              y={bandY}
              width={panelWidth}
              height={bandH}
              fill={COLORS.slideFill}
            />
            <line
              x1={0}
              y1={bandY}
              x2={panelWidth}
              y2={bandY}
              stroke={COLORS.slideStroke}
              strokeWidth={0.15}
            />
            <text
              x={panelWidth / 2}
              y={bandY + bandH / 2 + LABEL_FONT_SIZE * 0.35}
              textAnchor="middle"
              fontSize={LABEL_FONT_SIZE}
              fill={COLORS.slideStroke}
            >
              Row {String(pos.rowIndex + 1)}
            </text>
          </g>
        );
      })}

      {/* Cumulative dimension lines from bottom to each slide position */}
      {nonZeroPositions.map((pos, i) => (
        <DimensionLine
          key={`dim-${pos.rowId}`}
          x1={0}
          y1={colInnerHeight}
          x2={0}
          y2={colInnerHeight - pos.distanceFromBottom}
          label={fmt(pos.distanceFromBottom, unit)}
          offset={(i + 1) * DIM_OFFSET}
          orientation="vertical"
        />
      ))}

      {/* Overall panel height */}
      <DimensionLine
        x1={0}
        y1={0}
        x2={0}
        y2={colInnerHeight}
        label={fmt(colInnerHeight, unit)}
        offset={(nonZeroPositions.length + 1) * DIM_OFFSET}
        orientation="vertical"
      />

      {/* Hover targets */}
      <HoverRect
        width={panelWidth}
        height={colInnerHeight}
        label="Carcass Side Panel"
        dims={`${fmt(panelWidth, unit)} \u00d7 ${fmt(colInnerHeight, unit)}`}
        tt={tt}
      />
      {positions.map((pos) => {
        const bandY = colInnerHeight - pos.distanceFromBottom - bandH;
        return (
          <HoverRect
            key={`slide-hover-${pos.rowId}`}
            y={bandY}
            width={panelWidth}
            height={bandH}
            label={`Slide Position (Row ${String(pos.rowIndex + 1)})`}
            dims={`${fmt(pos.distanceFromBottom, unit)} from bottom`}
            tt={tt}
          />
        );
      })}
    </g>
  );
}

function DrawerBoxStack({
  column,
  config,
  columnBoxes,
  x,
  y,
  panelHeight,
  tt,
}: {
  column: Column;
  config: ChestConfig;
  columnBoxes: DrawerBoxDimensions[];
  x: number;
  y: number;
  panelHeight: number;
  tt: TooltipHandlers;
}) {
  const { unit } = config;

  const totalStackHeight =
    columnBoxes.reduce((sum, b) => sum + b.sideHeight, 0) +
    Math.max(0, columnBoxes.length - 1) * BOX_GAP;
  const yOffset = Math.max(0, (panelHeight - totalStackHeight) / 2);

  const boxPositions: {
    box: DrawerBoxDimensions;
    rowIndex: number;
    y: number;
  }[] = [];
  let currentY = yOffset;
  for (const [rowIdx, row] of column.rows.entries()) {
    const box = columnBoxes.find(
      (b) => b.rowId === row.id && b.columnId === column.id,
    );
    if (!box) continue;
    boxPositions.push({ box, rowIndex: rowIdx, y: currentY });
    currentY += box.sideHeight + BOX_GAP;
  }

  return (
    <g transform={`translate(${String(x)}, ${String(y)})`}>
      {boxPositions.map(({ box, rowIndex, y: boxY }) => {
        const boxBandH = Math.min(SLIDE_BAND_HEIGHT, box.sideHeight);
        return (
          <g key={box.rowId} transform={`translate(0, ${String(boxY)})`}>
            <InsetRect
              width={box.sideLength}
              height={box.sideHeight}
              fill={COLORS.boxFill}
              stroke={COLORS.boxStroke}
              strokeWidth={0.5}
            />

            {/* Slide band at bottom */}
            <rect
              x={0}
              y={box.sideHeight - boxBandH}
              width={box.sideLength}
              height={boxBandH}
              fill={COLORS.slideFill}
            />
            <line
              x1={0}
              y1={box.sideHeight - boxBandH}
              x2={box.sideLength}
              y2={box.sideHeight - boxBandH}
              stroke={COLORS.slideStroke}
              strokeWidth={0.15}
            />

            {/* Box height dimension on right */}
            <DimensionLine
              x1={box.sideLength}
              y1={0}
              x2={box.sideLength}
              y2={box.sideHeight}
              label={fmt(box.sideHeight, unit)}
              offset={-DIM_OFFSET}
              orientation="vertical"
            />

            {/* Row label */}
            <text
              x={box.sideLength / 2}
              y={box.sideHeight / 2 + LABEL_FONT_SIZE * 0.35}
              textAnchor="middle"
              fontSize={LABEL_FONT_SIZE}
              fill={COLORS.boxStroke}
            >
              Row {String(rowIndex + 1)}
            </text>

            {/* Hover targets */}
            <HoverRect
              width={box.sideLength}
              height={box.sideHeight}
              label={`Drawer Box (Row ${String(rowIndex + 1)})`}
              dims={`${fmt(box.sideLength, unit)} \u00d7 ${fmt(box.sideHeight, unit)}`}
              tt={tt}
            />
            <HoverRect
              y={box.sideHeight - boxBandH}
              width={box.sideLength}
              height={boxBandH}
              label={`Slide Band (Row ${String(rowIndex + 1)})`}
              dims={fmt(boxBandH, unit)}
              tt={tt}
            />
          </g>
        );
      })}
    </g>
  );
}

function getDimLeftMargin(column: Column): number {
  return (column.rows.length + 1) * DIM_OFFSET;
}

function getColumnSectionHeight(
  column: Column,
  config: ChestConfig,
  columnBoxes: DrawerBoxDimensions[],
  multiColumn: boolean,
): number {
  const colInnerHeight = getColumnInnerHeight(column, config);
  const totalBoxHeight =
    columnBoxes.reduce((sum, b) => sum + b.sideHeight, 0) +
    Math.max(0, columnBoxes.length - 1) * BOX_GAP;
  const labelHeight = multiColumn ? SECTION_LABEL_HEIGHT : 0;
  return Math.max(colInnerHeight, totalBoxHeight) + labelHeight;
}

export function computeSlideLayoutSize(
  config: ChestConfig,
  carcass: CarcassDimensions,
  drawerBoxes: DrawerBoxDimensions[],
): { width: number; height: number } {
  const multiColumn = config.columns.length > 1;
  let totalHeight = 0;
  let maxWidth = 0;

  for (const [i, column] of config.columns.entries()) {
    const columnBoxes = drawerBoxes.filter((b) => b.columnId === column.id);
    const sectionHeight = getColumnSectionHeight(
      column,
      config,
      columnBoxes,
      multiColumn,
    );

    if (i > 0) totalHeight += SECTION_GAP;
    totalHeight += sectionHeight;

    const dimLeftMargin = getDimLeftMargin(column);
    const maxBoxWidth =
      columnBoxes.length > 0
        ? Math.max(...columnBoxes.map((b) => b.sideLength))
        : 0;
    const sectionWidth =
      dimLeftMargin +
      carcass.innerDepth +
      DIAGRAM_GAP +
      maxBoxWidth +
      DIM_OFFSET * 2;

    maxWidth = Math.max(maxWidth, sectionWidth);
  }

  return { width: maxWidth, height: totalHeight };
}

export default function SlideLayoutView({
  config,
  carcass,
  drawerBoxes,
  tt,
}: SlideLayoutViewProps) {
  const multiColumn = config.columns.length > 1;

  const sections: {
    column: Column;
    colIndex: number;
    columnBoxes: DrawerBoxDimensions[];
    y: number;
  }[] = [];
  let y = 0;
  for (const [i, column] of config.columns.entries()) {
    const columnBoxes = drawerBoxes.filter((b) => b.columnId === column.id);
    if (i > 0) y += SECTION_GAP;
    sections.push({ column, colIndex: i, columnBoxes, y });
    y += getColumnSectionHeight(column, config, columnBoxes, multiColumn);
  }

  return (
    <g>
      {sections.map(({ column, colIndex, columnBoxes, y: sectionY }) => {
        const colInnerHeight = getColumnInnerHeight(column, config);
        const dimLeftMargin = getDimLeftMargin(column);
        const labelOffset = multiColumn ? SECTION_LABEL_HEIGHT : 0;

        return (
          <g key={column.id} transform={`translate(0, ${String(sectionY)})`}>
            {multiColumn && (
              <text
                x={dimLeftMargin + carcass.innerDepth / 2}
                y={SECTION_LABEL_HEIGHT * 0.7}
                textAnchor="middle"
                fontSize={SECTION_LABEL_HEIGHT * 0.6}
                fill={COLORS.carcassStroke}
                fontWeight="bold"
              >
                Column {String(colIndex + 1)}
              </text>
            )}

            <CarcassPanel
              column={column}
              config={config}
              carcass={carcass}
              x={dimLeftMargin}
              y={labelOffset}
              tt={tt}
            />

            <DrawerBoxStack
              column={column}
              config={config}
              columnBoxes={columnBoxes}
              x={dimLeftMargin + carcass.innerDepth + DIAGRAM_GAP}
              y={labelOffset}
              panelHeight={colInnerHeight}
              tt={tt}
            />
          </g>
        );
      })}
    </g>
  );
}

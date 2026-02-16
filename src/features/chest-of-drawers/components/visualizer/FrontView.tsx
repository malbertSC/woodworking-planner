import type {
  CarcassDimensions,
  ChestConfig,
  DrawerBoxDimensions,
  Unit,
} from "../../types.ts";
import { getColumnInnerHeight } from "../../calculations/carcass.ts";
import DimensionLine from "./DimensionLine.tsx";
import InsetRect from "./InsetRect.tsx";
import {
  COLORS,
  DIM_OFFSET,
  LABEL_FONT_SIZE,
  fmt,
  fmtPanel,
} from "./svg-constants.ts";

interface FrontViewProps {
  config: ChestConfig;
  carcass: CarcassDimensions;
  drawerBoxes: DrawerBoxDimensions[];
}

function CarcassRect({ width, height }: { width: number; height: number }) {
  return (
    <InsetRect
      x={0}
      y={0}
      width={width}
      height={height}
      fill={COLORS.carcassFill}
      stroke={COLORS.carcassStroke}
      strokeWidth={0.5}
    />
  );
}

function Dividers({
  config,
  carcass,
}: {
  config: ChestConfig;
  carcass: CarcassDimensions;
}) {
  const sideThickness = config.woodAssignments.carcassSides.actual;
  const topThickness = config.woodAssignments.carcassTopBottom.actual;
  const dividerThickness = config.woodAssignments.carcassDividers.actual;
  const innerHeight = carcass.outerHeight - 2 * topThickness;

  const dividers: { x: number }[] = [];
  let xPos = sideThickness;
  for (const [i, col] of config.columns.entries()) {
    if (i >= config.columns.length - 1) break;
    xPos += col.openingWidth;
    dividers.push({ x: xPos });
    xPos += dividerThickness;
  }

  return (
    <>
      {dividers.map((d) => (
        <rect
          key={`div-${String(d.x)}`}
          x={d.x}
          y={topThickness}
          width={dividerThickness}
          height={innerHeight}
          fill={COLORS.carcassFill}
          stroke={COLORS.carcassStroke}
          strokeWidth={0.25}
        />
      ))}
    </>
  );
}

function HorizontalRails({ config }: { config: ChestConfig }) {
  if (!config.horizontalRails.enabled) return null;

  const sideThickness = config.woodAssignments.carcassSides.actual;
  const topThickness = config.woodAssignments.carcassTopBottom.actual;
  const dividerThickness = config.woodAssignments.carcassDividers.actual;
  const railThickness = config.horizontalRails.thickness.actual;

  const rails: { x: number; y: number; width: number }[] = [];
  let xPos = sideThickness;

  for (const col of config.columns) {
    let yPos = topThickness;
    for (const [r, row] of col.rows.entries()) {
      if (r >= col.rows.length - 1) break;
      yPos += row.openingHeight;
      rails.push({ x: xPos, y: yPos, width: col.openingWidth });
      yPos += railThickness;
    }
    xPos += col.openingWidth + dividerThickness;
  }

  return (
    <>
      {rails.map((rail) => (
        <rect
          key={`rail-${String(rail.x)}-${String(rail.y)}`}
          x={rail.x}
          y={rail.y}
          width={rail.width}
          height={railThickness}
          fill={COLORS.carcassFill}
          stroke={COLORS.carcassStroke}
          strokeWidth={0.25}
        />
      ))}
    </>
  );
}

interface OpeningRect {
  x: number;
  y: number;
  width: number;
  height: number;
  columnId: string;
  rowId: string;
}

function computeOpenings(config: ChestConfig): OpeningRect[] {
  const sideThickness = config.woodAssignments.carcassSides.actual;
  const topThickness = config.woodAssignments.carcassTopBottom.actual;
  const dividerThickness = config.woodAssignments.carcassDividers.actual;
  const railThickness = config.horizontalRails.enabled
    ? config.horizontalRails.thickness.actual
    : 0;

  const openings: OpeningRect[] = [];
  let xPos = sideThickness;

  for (const col of config.columns) {
    let yPos = topThickness;
    for (const row of col.rows) {
      openings.push({
        x: xPos,
        y: yPos,
        width: col.openingWidth,
        height: row.openingHeight,
        columnId: col.id,
        rowId: row.id,
      });
      yPos += row.openingHeight + railThickness;
    }
    xPos += col.openingWidth + dividerThickness;
  }

  return openings;
}

function DrawerOpenings({ openings }: { openings: OpeningRect[] }) {
  return (
    <>
      {openings.map((o) => (
        <rect
          key={`${o.columnId}-${o.rowId}`}
          x={o.x}
          y={o.y}
          width={o.width}
          height={o.height}
          fill={COLORS.openingFill}
          stroke={COLORS.carcassStroke}
          strokeWidth={0.25}
        />
      ))}
    </>
  );
}

function DrawerFaces({
  openings,
  drawerBoxes,
  unit,
}: {
  openings: OpeningRect[];
  drawerBoxes: DrawerBoxDimensions[];
  unit: Unit;
}) {
  return (
    <>
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
              stroke={COLORS.carcassStroke}
              strokeWidth={0.5}
              rx={0.25}
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
    </>
  );
}

function PanelDimensions({
  config,
  carcass,
}: {
  config: ChestConfig;
  carcass: CarcassDimensions;
}) {
  const { unit } = config;
  const topBottomWood = config.woodAssignments.carcassTopBottom;
  const sidesWood = config.woodAssignments.carcassSides;
  const topT = topBottomWood.actual;
  const sideT = sidesWood.actual;

  const topPanel = fmtPanel(topBottomWood, unit);
  const sidePanel = fmtPanel(sidesWood, unit);

  const offset = DIM_OFFSET / 2;

  return (
    <>
      {/* Top panel thickness */}
      <DimensionLine
        x1={0}
        y1={0}
        x2={0}
        y2={topT}
        label={topPanel.label}
        sublabel={topPanel.sublabel}
        offset={offset}
        orientation="vertical"
      />
      {/* Bottom panel thickness */}
      <DimensionLine
        x1={0}
        y1={carcass.outerHeight - topT}
        x2={0}
        y2={carcass.outerHeight}
        label={topPanel.label}
        sublabel={topPanel.sublabel}
        offset={offset}
        orientation="vertical"
      />

      {/* Side panel widths at bottom */}
      <DimensionLine
        x1={0}
        y1={carcass.outerHeight}
        x2={sideT}
        y2={carcass.outerHeight}
        label={sidePanel.label}
        sublabel={sidePanel.sublabel}
        offset={DIM_OFFSET / 2}
        orientation="horizontal"
      />
      <DimensionLine
        x1={carcass.outerWidth - sideT}
        y1={carcass.outerHeight}
        x2={carcass.outerWidth}
        y2={carcass.outerHeight}
        label={sidePanel.label}
        sublabel={sidePanel.sublabel}
        offset={DIM_OFFSET / 2}
        orientation="horizontal"
      />
    </>
  );
}

function OverallDimensions({
  carcass,
  unit,
}: {
  carcass: CarcassDimensions;
  unit: Unit;
}) {
  const widthViolated = carcass.constraintViolations.some(
    (v) => v.dimension === "width",
  );
  const heightViolated = carcass.constraintViolations.some(
    (v) => v.dimension === "height",
  );

  return (
    <>
      <DimensionLine
        x1={0}
        y1={0}
        x2={carcass.outerWidth}
        y2={0}
        label={fmt(carcass.outerWidth, unit)}
        offset={-DIM_OFFSET}
        orientation="horizontal"
        violated={widthViolated}
      />
      <DimensionLine
        x1={carcass.outerWidth}
        y1={0}
        x2={carcass.outerWidth}
        y2={carcass.outerHeight}
        label={fmt(carcass.outerHeight, unit)}
        offset={-DIM_OFFSET}
        orientation="vertical"
        violated={heightViolated}
      />
    </>
  );
}

function ColumnWidthDimensions({
  config,
  carcass,
  unit,
}: {
  config: ChestConfig;
  carcass: CarcassDimensions;
  unit: Unit;
}) {
  const sideThickness = config.woodAssignments.carcassSides.actual;
  const dividerThickness = config.woodAssignments.carcassDividers.actual;

  const dims: { x1: number; x2: number; label: string }[] = [];
  let xPos = sideThickness;
  for (const col of config.columns) {
    dims.push({
      x1: xPos,
      x2: xPos + col.openingWidth,
      label: fmt(col.openingWidth, unit),
    });
    xPos += col.openingWidth + dividerThickness;
  }

  return (
    <>
      {dims.map((d, i) => (
        <DimensionLine
          key={i}
          x1={d.x1}
          y1={carcass.outerHeight}
          x2={d.x2}
          y2={carcass.outerHeight}
          label={d.label}
          offset={DIM_OFFSET / 2}
          orientation="horizontal"
        />
      ))}
    </>
  );
}

interface ColumnGap {
  x: number;
  y: number;
  width: number;
  height: number;
  columnId: string;
}

function computeColumnGaps(
  config: ChestConfig,
  carcass: CarcassDimensions,
): ColumnGap[] {
  const topThickness = config.woodAssignments.carcassTopBottom.actual;
  const sideThickness = config.woodAssignments.carcassSides.actual;
  const dividerThickness = config.woodAssignments.carcassDividers.actual;
  const maxInnerHeight = carcass.outerHeight - 2 * topThickness;

  const gaps: ColumnGap[] = [];
  let xPos = sideThickness;

  for (const col of config.columns) {
    const colHeight = getColumnInnerHeight(col, config);
    const gap = maxInnerHeight - colHeight;
    if (gap > 0) {
      gaps.push({
        x: xPos,
        y: topThickness + colHeight,
        width: col.openingWidth,
        height: gap,
        columnId: col.id,
      });
    }
    xPos += col.openingWidth + dividerThickness;
  }

  return gaps;
}

function ColumnHeightMismatch({
  config,
  carcass,
  unit,
}: {
  config: ChestConfig;
  carcass: CarcassDimensions;
  unit: Unit;
}) {
  if (config.columns.length < 2) return null;

  const gaps = computeColumnGaps(config, carcass);
  if (gaps.length === 0) return null;

  return (
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
      {gaps.map((g) => (
        <g key={g.columnId}>
          <rect
            x={g.x}
            y={g.y}
            width={g.width}
            height={g.height}
            fill="url(#deadspace-hatch)"
          />
          <text
            x={g.x + g.width / 2}
            y={g.y + g.height / 2 + LABEL_FONT_SIZE * 0.35}
            textAnchor="middle"
            fontSize={LABEL_FONT_SIZE}
            fill="#92400E"
          >
            {fmt(g.height, unit)} gap
          </text>
        </g>
      ))}
    </>
  );
}

function RevealDimensions({
  config,
  carcass,
  openings,
  drawerBoxes,
}: {
  config: ChestConfig;
  carcass: CarcassDimensions;
  openings: OpeningRect[];
  drawerBoxes: DrawerBoxDimensions[];
}) {
  const { unit } = config;
  const topT = config.woodAssignments.carcassTopBottom.actual;
  const sideT = config.woodAssignments.carcassSides.actual;
  const dividerT = config.woodAssignments.carcassDividers.actual;

  // Compute face rectangles
  const faces = openings.flatMap((o) => {
    const box = drawerBoxes.find(
      (b) => b.columnId === o.columnId && b.rowId === o.rowId,
    );
    if (!box) return [];
    return [
      {
        x: o.x + (o.width - box.faceWidth) / 2,
        y: o.y + (o.height - box.faceHeight) / 2,
        width: box.faceWidth,
        height: box.faceHeight,
        columnId: o.columnId,
        rowId: o.rowId,
      },
    ];
  });

  if (faces.length === 0) return null;

  // First column faces for vertical reveals
  const firstCol = config.columns[0];
  if (!firstCol) return null;
  const colFaces = faces
    .filter((f) => f.columnId === firstCol.id)
    .sort((a, b) => a.y - b.y);

  // First row faces for horizontal reveals
  const firstRow = firstCol.rows[0];
  const rowFaces = firstRow
    ? faces.filter((f) => f.rowId === firstRow.id).sort((a, b) => a.x - b.x)
    : [];

  // Vertical reveal gaps (from panel inner edge, not carcass outer edge)
  const vReveals: { y1: number; y2: number }[] = [];
  const firstFace = colFaces[0];
  if (firstFace) {
    const topGap = firstFace.y - topT;
    if (topGap > 0.001) vReveals.push({ y1: topT, y2: firstFace.y });

    for (let i = 0; i < colFaces.length - 1; i++) {
      const cur = colFaces[i];
      const next = colFaces[i + 1];
      if (!cur || !next) continue;
      const y1 = cur.y + cur.height;
      const y2 = next.y;
      if (y2 - y1 > 0.001) vReveals.push({ y1, y2 });
    }

    const last = colFaces[colFaces.length - 1];
    if (last) {
      const botY1 = last.y + last.height;
      const botY2 = carcass.outerHeight - topT;
      if (botY2 - botY1 > 0.001) vReveals.push({ y1: botY1, y2: botY2 });
    }
  }

  // Divider positions (for bottom structural chain)
  const dividers: { x1: number; x2: number }[] = [];
  if (config.columns.length > 1) {
    let xPos = sideT;
    for (let i = 0; i < config.columns.length - 1; i++) {
      const col = config.columns[i];
      if (!col) continue;
      xPos += col.openingWidth;
      dividers.push({ x1: xPos, x2: xPos + dividerT });
      xPos += dividerT;
    }
  }

  // Horizontal between-column reveal gaps
  const hReveals: { x1: number; x2: number }[] = [];
  if (rowFaces.length > 1) {
    for (let i = 0; i < rowFaces.length - 1; i++) {
      const cur = rowFaces[i];
      const next = rowFaces[i + 1];
      if (!cur || !next) continue;
      const x1 = cur.x + cur.width;
      const x2 = next.x;
      if (x2 - x1 > 0.001) hReveals.push({ x1, x2 });
    }
  }

  const divPanel =
    dividers.length > 0
      ? fmtPanel(config.woodAssignments.carcassDividers, unit)
      : null;

  return (
    <>
      {/* Vertical reveals on right side */}
      {vReveals.map((r, i) => (
        <DimensionLine
          key={`vr-${String(i)}`}
          x1={carcass.outerWidth}
          y1={r.y1}
          x2={carcass.outerWidth}
          y2={r.y2}
          label={fmt(r.y2 - r.y1, unit)}
          offset={-DIM_OFFSET / 2}
          orientation="vertical"
        />
      ))}

      {/* Divider thicknesses at bottom (same row as column widths) */}
      {divPanel &&
        dividers.map((d, i) => (
          <DimensionLine
            key={`div-${String(i)}`}
            x1={d.x1}
            y1={carcass.outerHeight}
            x2={d.x2}
            y2={carcass.outerHeight}
            label={divPanel.label}
            sublabel={divPanel.sublabel}
            offset={DIM_OFFSET / 2}
            orientation="horizontal"
          />
        ))}

      {/* Horizontal between-column reveals at bottom (second row) */}
      {hReveals.map((r, i) => (
        <DimensionLine
          key={`hr-${String(i)}`}
          x1={r.x1}
          y1={carcass.outerHeight}
          x2={r.x2}
          y2={carcass.outerHeight}
          label={fmt(r.x2 - r.x1, unit)}
          offset={DIM_OFFSET}
          orientation="horizontal"
        />
      ))}
    </>
  );
}

export default function FrontView({
  config,
  carcass,
  drawerBoxes,
}: FrontViewProps) {
  const openings = computeOpenings(config);

  return (
    <g>
      <CarcassRect width={carcass.outerWidth} height={carcass.outerHeight} />
      <Dividers config={config} carcass={carcass} />
      <HorizontalRails config={config} />
      <ColumnHeightMismatch
        config={config}
        carcass={carcass}
        unit={config.unit}
      />
      <DrawerOpenings openings={openings} />
      <DrawerFaces
        openings={openings}
        drawerBoxes={drawerBoxes}
        unit={config.unit}
      />
      <OverallDimensions carcass={carcass} unit={config.unit} />
      <PanelDimensions config={config} carcass={carcass} />
      <ColumnWidthDimensions
        config={config}
        carcass={carcass}
        unit={config.unit}
      />
      <RevealDimensions
        config={config}
        carcass={carcass}
        openings={openings}
        drawerBoxes={drawerBoxes}
      />
    </g>
  );
}

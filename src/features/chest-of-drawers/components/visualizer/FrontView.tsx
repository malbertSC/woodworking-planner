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
import { HoverRect, type TooltipHandlers } from "./SvgTooltip.tsx";

interface FrontViewProps {
  config: ChestConfig;
  carcass: CarcassDimensions;
  drawerBoxes: DrawerBoxDimensions[];
  tt: TooltipHandlers;
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
        <InsetRect
          key={`div-${String(d.x)}`}
          x={d.x}
          y={topThickness}
          width={dividerThickness}
          height={innerHeight}
          fill={COLORS.carcassStroke}
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

function DividerDimensions({
  config,
  carcass,
}: {
  config: ChestConfig;
  carcass: CarcassDimensions;
}) {
  const { unit } = config;
  const sideT = config.woodAssignments.carcassSides.actual;
  const dividerT = config.woodAssignments.carcassDividers.actual;

  if (config.columns.length < 2) return null;

  const dividers: { x1: number; x2: number }[] = [];
  let xPos = sideT;
  for (let i = 0; i < config.columns.length - 1; i++) {
    const col = config.columns[i];
    if (!col) continue;
    xPos += col.openingWidth;
    dividers.push({ x1: xPos, x2: xPos + dividerT });
    xPos += dividerT;
  }

  const divPanel = fmtPanel(config.woodAssignments.carcassDividers, unit);

  return (
    <>
      {dividers.map((d, i) => (
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
    </>
  );
}

function FrontViewHoverTargets({
  config,
  carcass,
  drawerBoxes,
  tt,
}: FrontViewProps) {
  const { unit } = config;
  const topT = config.woodAssignments.carcassTopBottom.actual;
  const sideT = config.woodAssignments.carcassSides.actual;
  const dividerT = config.woodAssignments.carcassDividers.actual;
  const railT = config.horizontalRails.enabled
    ? config.horizontalRails.thickness.actual
    : 0;
  const innerHeight = carcass.outerHeight - 2 * topT;
  const multiCol = config.columns.length > 1;

  const openings = computeOpenings(config);

  // Compute face rects per opening
  const faces = openings.flatMap((o) => {
    const box = drawerBoxes.find(
      (b) => b.columnId === o.columnId && b.rowId === o.rowId,
    );
    if (!box) return [];
    const colIdx = config.columns.findIndex((c) => c.id === o.columnId);
    const col = config.columns[colIdx];
    const rowIdx = col ? col.rows.findIndex((r) => r.id === o.rowId) : 0;
    return [
      {
        x: o.x + (o.width - box.faceWidth) / 2,
        y: o.y + (o.height - box.faceHeight) / 2,
        width: box.faceWidth,
        height: box.faceHeight,
        columnId: o.columnId,
        rowId: o.rowId,
        colIdx,
        rowIdx,
      },
    ];
  });

  // Divider positions
  const dividers: { x: number }[] = [];
  let xp = sideT;
  for (const [i, col] of config.columns.entries()) {
    if (i >= config.columns.length - 1) break;
    xp += col.openingWidth;
    dividers.push({ x: xp });
    xp += dividerT;
  }

  // Rail positions
  const rails: { x: number; y: number; width: number }[] = [];
  if (config.horizontalRails.enabled) {
    let rx = sideT;
    for (const col of config.columns) {
      let ry = topT;
      for (const [r, row] of col.rows.entries()) {
        if (r >= col.rows.length - 1) break;
        ry += row.openingHeight;
        rails.push({ x: rx, y: ry, width: col.openingWidth });
        ry += railT;
      }
      rx += col.openingWidth + dividerT;
    }
  }

  // Dead space gaps
  const gaps = computeColumnGaps(config, carcass);

  // Vertical reveal rects for each column
  const vRevealRects: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  }[] = [];
  let colX = sideT;
  for (const [ci, col] of config.columns.entries()) {
    const colFaces = faces
      .filter((f) => f.columnId === col.id)
      .sort((a, b) => a.y - b.y);

    if (colFaces.length > 0) {
      const first = colFaces[0];
      if (first) {
        const topGap = first.y - topT;
        if (topGap > 0.001) {
          vRevealRects.push({
            x: colX,
            y: topT,
            width: col.openingWidth,
            height: topGap,
            label: `Top Reveal${multiCol ? ` (Col ${String(ci + 1)})` : ""}`,
          });
        }
      }

      for (let i = 0; i < colFaces.length - 1; i++) {
        const cur = colFaces[i];
        const next = colFaces[i + 1];
        if (!cur || !next) continue;
        const y1 = cur.y + cur.height;
        const y2 = next.y;
        if (y2 - y1 > 0.001) {
          vRevealRects.push({
            x: colX,
            y: y1,
            width: col.openingWidth,
            height: y2 - y1,
            label: `Reveal${multiCol ? ` (Col ${String(ci + 1)})` : ""}`,
          });
        }
      }

      const last = colFaces[colFaces.length - 1];
      if (last) {
        const botY1 = last.y + last.height;
        const botY2 = carcass.outerHeight - topT;
        if (botY2 - botY1 > 0.001) {
          vRevealRects.push({
            x: colX,
            y: botY1,
            width: col.openingWidth,
            height: botY2 - botY1,
            label: `Bottom Reveal${multiCol ? ` (Col ${String(ci + 1)})` : ""}`,
          });
        }
      }
    }

    colX += col.openingWidth + dividerT;
  }

  // Horizontal reveal rects between faces across columns (first row)
  const hRevealRects: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[] = [];
  if (multiCol) {
    const rowFaces: (typeof faces)[number][] = [];
    for (const col of config.columns) {
      const firstRow = col.rows[0];
      if (!firstRow) continue;
      const face = faces.find(
        (f) => f.columnId === col.id && f.rowId === firstRow.id,
      );
      if (face) rowFaces.push(face);
    }
    rowFaces.sort((a, b) => a.x - b.x);

    for (let i = 0; i < rowFaces.length - 1; i++) {
      const cur = rowFaces[i];
      const next = rowFaces[i + 1];
      if (!cur || !next) continue;
      const x1 = cur.x + cur.width;
      const x2 = next.x;
      if (x2 - x1 > 0.001) {
        const minY = Math.min(cur.y, next.y);
        const maxY = Math.max(cur.y + cur.height, next.y + next.height);
        hRevealRects.push({
          x: x1,
          y: minY,
          width: x2 - x1,
          height: maxY - minY,
        });
      }
    }
  }

  const faceLabel = (f: (typeof faces)[number]): string => {
    if (multiCol)
      return `Drawer Face (Col ${String(f.colIdx + 1)}, Row ${String(f.rowIdx + 1)})`;
    const firstCol = config.columns[0];
    if (firstCol && firstCol.rows.length > 1)
      return `Drawer Face (Row ${String(f.rowIdx + 1)})`;
    return "Drawer Face";
  };

  return (
    <g>
      {/* Layer 1: Openings — show per-opening reveal dims */}
      {openings.map((o) => {
        const box = drawerBoxes.find(
          (b) => b.columnId === o.columnId && b.rowId === o.rowId,
        );
        const hRev = box ? (o.width - box.faceWidth) / 2 : 0;
        const vRev = box ? (o.height - box.faceHeight) / 2 : 0;
        return (
          <HoverRect
            key={`o-${o.columnId}-${o.rowId}`}
            x={o.x}
            y={o.y}
            width={o.width}
            height={o.height}
            label={box ? "Reveal" : "Opening"}
            dims={
              box
                ? `${fmt(hRev, unit)} H \u00d7 ${fmt(vRev, unit)} V per side`
                : `${fmt(o.width, unit)} \u00d7 ${fmt(o.height, unit)}`
            }
            tt={tt}
          />
        );
      })}

      {/* Layer 2: Vertical reveal rects (between faces, spanning rails) */}
      {vRevealRects.map((r, i) => (
        <HoverRect
          key={`vr-${String(i)}`}
          x={r.x}
          y={r.y}
          width={r.width}
          height={r.height}
          label={r.label}
          dims={fmt(r.height, unit)}
          tt={tt}
        />
      ))}

      {/* Layer 3: Horizontal reveal rects (between faces across columns) */}
      {hRevealRects.map((r, i) => (
        <HoverRect
          key={`hr-${String(i)}`}
          x={r.x}
          y={r.y}
          width={r.width}
          height={r.height}
          label="Reveal"
          dims={fmt(r.width, unit)}
          tt={tt}
        />
      ))}

      {/* Layer 4: Structural panels */}
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
        height={innerHeight}
        label="Left Side"
        dims={`${fmt(sideT, unit)} \u00d7 ${fmt(innerHeight, unit)}`}
        tt={tt}
      />
      <HoverRect
        x={carcass.outerWidth - sideT}
        y={topT}
        width={sideT}
        height={innerHeight}
        label="Right Side"
        dims={`${fmt(sideT, unit)} \u00d7 ${fmt(innerHeight, unit)}`}
        tt={tt}
      />
      {dividers.map((d) => (
        <HoverRect
          key={`d-${String(d.x)}`}
          x={d.x}
          y={topT}
          width={dividerT}
          height={innerHeight}
          label="Divider"
          dims={`${fmt(dividerT, unit)} \u00d7 ${fmt(innerHeight, unit)}`}
          tt={tt}
        />
      ))}
      {rails.map((r) => (
        <HoverRect
          key={`r-${String(r.x)}-${String(r.y)}`}
          x={r.x}
          y={r.y}
          width={r.width}
          height={railT}
          label="Horizontal Rail"
          dims={`${fmt(r.width, unit)} \u00d7 ${fmt(railT, unit)}`}
          tt={tt}
        />
      ))}

      {/* Layer 5: Dead space gaps */}
      {gaps.map((g) => (
        <HoverRect
          key={`gap-${g.columnId}`}
          x={g.x}
          y={g.y}
          width={g.width}
          height={g.height}
          label="Dead Space"
          dims={`${fmt(g.height, unit)} gap`}
          tt={tt}
        />
      ))}

      {/* Layer 6: Drawer faces (topmost — always wins when hovering a face) */}
      {faces.map((f) => (
        <HoverRect
          key={`f-${f.columnId}-${f.rowId}`}
          x={f.x}
          y={f.y}
          width={f.width}
          height={f.height}
          label={faceLabel(f)}
          dims={`${fmt(f.width, unit)} \u00d7 ${fmt(f.height, unit)}`}
          tt={tt}
        />
      ))}
    </g>
  );
}

export default function FrontView({
  config,
  carcass,
  drawerBoxes,
  tt,
}: FrontViewProps) {
  const openings = computeOpenings(config);
  const topT = config.woodAssignments.carcassTopBottom.actual;
  const sideT = config.woodAssignments.carcassSides.actual;
  const innerW = carcass.outerWidth - 2 * sideT;
  const innerH = carcass.outerHeight - 2 * topT;

  return (
    <g>
      <CarcassRect width={carcass.outerWidth} height={carcass.outerHeight} />
      {/* Dark interior — all gaps/reveals between faces show as dark */}
      <rect
        x={sideT}
        y={topT}
        width={innerW}
        height={innerH}
        fill={COLORS.revealFill}
      />
      <Dividers config={config} carcass={carcass} />
      <ColumnHeightMismatch
        config={config}
        carcass={carcass}
        unit={config.unit}
      />
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
      <DividerDimensions config={config} carcass={carcass} />
      <FrontViewHoverTargets
        config={config}
        carcass={carcass}
        drawerBoxes={drawerBoxes}
        tt={tt}
      />
    </g>
  );
}

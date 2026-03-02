import type {
  CarcassDimensions,
  ChestConfig,
  DrawerBoxDimensions,
} from "../../types.ts";
import DimensionLine from "./DimensionLine.tsx";
import { COLORS, DIM_OFFSET, fmt } from "./svg-constants.ts";
import { HoverRect, type TooltipHandlers } from "./SvgTooltip.tsx";

interface CrossSectionViewProps {
  config: ChestConfig;
  carcass: CarcassDimensions;
  drawerBoxes: DrawerBoxDimensions[];
  selectedColumn: number;
  tt: TooltipHandlers;
}

export default function CrossSectionView({
  config,
  carcass,
  drawerBoxes,
  selectedColumn,
  tt,
}: CrossSectionViewProps) {
  const { unit } = config;
  const topT = config.woodAssignments.carcassTopBottom.actual;
  const sideT = config.woodAssignments.carcassSides.actual;
  const railsEnabled = config.horizontalRails.enabled;
  const railT = railsEnabled ? config.horizontalRails.thickness.actual : 0;
  const gap = config.drawerVerticalClearance;

  const column = config.columns[selectedColumn];
  if (!column) return null;

  const crossWidth = carcass.outerDepth * 0.6;
  const wallT = sideT;
  const innerWidth = crossWidth - 2 * wallT;

  const heightViolated = carcass.constraintViolations.some(
    (v) => v.dimension === "height",
  );

  // Build segments for the column
  interface Segment {
    type: "box" | "gap" | "rail";
    height: number;
    rowId?: string;
    rowIdx?: number;
  }

  const segments: Segment[] = [];
  for (const [i, row] of column.rows.entries()) {
    const box = drawerBoxes.find(
      (b) => b.columnId === column.id && b.rowId === row.id,
    );
    const boxHeight = box ? box.boxOuterHeight : row.openingHeight;
    // Gap above box — the clearance sits between the top of the opening and the top of the box
    segments.push({ type: "gap", height: gap });
    segments.push({ type: "box", height: boxHeight, rowId: row.id, rowIdx: i });
    if (railsEnabled && i < column.rows.length - 1) {
      segments.push({ type: "rail", height: railT });
    }
  }
  // Gap below the bottom drawer so it can slide freely
  segments.push({ type: "gap", height: gap });

  // Compute total internal used height
  const totalInternalUsed = segments.reduce((sum, s) => sum + s.height, 0);
  const totalInternalHeight = carcass.outerHeight - 2 * topT;

  // Layout positions (y increases downward)
  let y = topT;
  const positioned = segments.map((seg) => {
    const segY = y;
    y += seg.height;
    return { ...seg, y: segY };
  });

  // Dimension lines - stacked on the right side
  const dimX = crossWidth;
  const dimOffset1 = DIM_OFFSET;
  const dimOffset2 = DIM_OFFSET * 2.5;
  const dimOffset3 = DIM_OFFSET * 4;

  return (
    <g>
      {/* Carcass outline */}
      <rect
        x={0}
        y={0}
        width={crossWidth}
        height={carcass.outerHeight}
        fill={COLORS.carcassFill}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.5}
      />

      {/* Internal cavity */}
      <rect
        x={wallT}
        y={topT}
        width={innerWidth}
        height={totalInternalHeight}
        fill={COLORS.openingFill}
      />

      {/* Top panel boundary */}
      <line
        x1={0}
        y1={topT}
        x2={crossWidth}
        y2={topT}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.15}
      />
      {/* Bottom panel boundary */}
      <line
        x1={0}
        y1={carcass.outerHeight - topT}
        x2={crossWidth}
        y2={carcass.outerHeight - topT}
        stroke={COLORS.carcassStroke}
        strokeWidth={0.15}
      />

      {/* Render segments */}
      {positioned.map((seg, i) => {
        if (seg.type === "box") {
          return (
            <g key={`box-${String(i)}`}>
              <rect
                x={wallT + 0.5}
                y={seg.y}
                width={innerWidth - 1}
                height={seg.height}
                fill={COLORS.boxFill}
                stroke={COLORS.boxStroke}
                strokeWidth={0.25}
              />
            </g>
          );
        }
        if (seg.type === "rail") {
          return (
            <rect
              key={`rail-${String(i)}`}
              x={wallT}
              y={seg.y}
              width={innerWidth}
              height={seg.height}
              fill={COLORS.carcassFill}
              stroke={COLORS.carcassStroke}
              strokeWidth={0.15}
            />
          );
        }
        // gap — just leave the opening fill visible
        return null;
      })}

      {/* Segment dimension lines on the right */}
      {positioned.map((seg, i) => {
        if (seg.height < 0.01) return null;
        const label =
          seg.type === "box"
            ? fmt(seg.height, unit)
            : seg.type === "rail"
              ? `${fmt(seg.height, unit)} rail`
              : `${fmt(seg.height, unit)} gap`;
        return (
          <DimensionLine
            key={`dim-${String(i)}`}
            x1={dimX}
            y1={seg.y}
            x2={dimX}
            y2={seg.y + seg.height}
            label={label}
            offset={dimOffset1}
            orientation="vertical"
          />
        );
      })}

      {/* Total internal height */}
      <DimensionLine
        x1={dimX}
        y1={topT}
        x2={dimX}
        y2={topT + totalInternalHeight}
        label={fmt(totalInternalHeight, unit)}
        sublabel="internal"
        offset={dimOffset2}
        orientation="vertical"
      />

      {/* Used internal height (if different from total) */}
      {Math.abs(totalInternalUsed - totalInternalHeight) > 0.01 && (
        <DimensionLine
          x1={dimX}
          y1={topT}
          x2={dimX}
          y2={topT + totalInternalUsed}
          label={fmt(totalInternalUsed, unit)}
          sublabel="used"
          offset={dimOffset2}
          orientation="vertical"
        />
      )}

      {/* Overall outer height */}
      <DimensionLine
        x1={dimX}
        y1={0}
        x2={dimX}
        y2={carcass.outerHeight}
        label={fmt(carcass.outerHeight, unit)}
        offset={dimOffset3}
        orientation="vertical"
        violated={heightViolated}
      />

      {/* Hover targets */}
      <HoverRect
        x={0}
        y={0}
        width={crossWidth}
        height={topT}
        label="Top Panel"
        dims={fmt(topT, unit)}
        tt={tt}
      />
      <HoverRect
        x={0}
        y={carcass.outerHeight - topT}
        width={crossWidth}
        height={topT}
        label="Bottom Panel"
        dims={fmt(topT, unit)}
        tt={tt}
      />
      {positioned.map((seg, i) => {
        if (seg.height < 0.01) return null;
        const label =
          seg.type === "box"
            ? `Drawer Box${seg.rowIdx != null ? ` (Row ${String(seg.rowIdx + 1)})` : ""}`
            : seg.type === "rail"
              ? "Horizontal Rail"
              : "Vertical Clearance";
        const dims =
          seg.type === "box"
            ? `${fmt(seg.height, unit)} tall`
            : fmt(seg.height, unit);
        return (
          <HoverRect
            key={`hover-${String(i)}`}
            x={wallT}
            y={seg.y}
            width={innerWidth}
            height={seg.height}
            label={label}
            dims={dims}
            tt={tt}
          />
        );
      })}
    </g>
  );
}

/** Compute the content size for the cross-section view. */
export function crossSectionContentSize(carcass: CarcassDimensions) {
  return {
    width: carcass.outerDepth * 0.6 + DIM_OFFSET * 6,
    height: carcass.outerHeight,
  };
}

/**
 * SVG rect that keeps its stroke inside the specified bounds.
 *
 * Normal SVG rects center the stroke on the path, so a rect at (0, 0, 100, 50)
 * with strokeWidth=2 has its visual boundary at (-1, -1, 102, 52). This causes
 * dimension lines (which reference the nominal coords) to appear misaligned.
 *
 * InsetRect insets the underlying <rect> by half the stroke width so the visual
 * boundary matches the specified (x, y, width, height) exactly.
 */
export default function InsetRect({
  x = 0,
  y = 0,
  width,
  height,
  strokeWidth: sw = 0,
  ...rest
}: {
  x?: number;
  y?: number;
  width: number;
  height: number;
  strokeWidth?: number;
} & Omit<
  React.SVGAttributes<SVGRectElement>,
  "x" | "y" | "width" | "height" | "strokeWidth"
>) {
  const half = sw / 2;
  return (
    <rect
      x={x + half}
      y={y + half}
      width={width - sw}
      height={height - sw}
      strokeWidth={sw}
      {...rest}
    />
  );
}

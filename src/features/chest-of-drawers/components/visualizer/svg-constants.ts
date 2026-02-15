import type { Unit, WoodThickness } from "../../types.ts";
import { formatDimension } from "../../calculations/units.ts";

export const COLORS = {
  carcassFill: "#D4A574",
  carcassStroke: "#8B6914",
  faceFill: "#C4956A",
  openingFill: "#F5E6D3",
  slideFill: "#94A3B8",
  slideStroke: "#64748B",
  boxFill: "#E8D5B7",
  boxStroke: "#8B6914",
};

export const DIM_OFFSET = 4;
export const LABEL_FONT_SIZE = 1;

export function fmt(value: number, unit: Unit): string {
  return formatDimension(value, unit);
}

/** Extract the short nominal size from a WoodThickness nominal string, e.g. '3/4"' from '3/4" plywood'. */
function shortNominal(wood: WoodThickness): string {
  const match = /^[^"]*"/.exec(wood.nominal);
  return match ? match[0] : wood.nominal;
}

/** Format a panel dimension showing nominal label with actual sublabel (if they differ). */
export function fmtPanel(
  wood: WoodThickness,
  unit: Unit,
): { label: string; sublabel: string | undefined } {
  const nominal = shortNominal(wood);
  const actual = formatDimension(wood.actual, unit);
  return {
    label: nominal,
    sublabel: nominal === actual ? undefined : `(${actual} act.)`,
  };
}

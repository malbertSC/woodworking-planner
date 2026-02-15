import {
  calculateCarcassDimensions,
  getCarcassPieces,
  shouldRecommendHorizontalRails,
} from "./calculations/carcass.ts";
import { calculateDrawerBox, getDrawerPieces } from "./calculations/drawer.ts";
import { recommendSlideLength } from "./calculations/slides.ts";
import type {
  CarcassDimensions,
  ChestConfig,
  CutPiece,
  DrawerBoxDimensions,
} from "./types.ts";

export function selectCarcassDimensions(
  config: ChestConfig,
): CarcassDimensions {
  return calculateCarcassDimensions(config);
}

export function selectAllDrawerBoxes(
  config: ChestConfig,
): DrawerBoxDimensions[] {
  return config.columns.flatMap((column) =>
    column.rows.map((row) => calculateDrawerBox(row, column, config)),
  );
}

export function selectAllCutPieces(config: ChestConfig): CutPiece[] {
  const carcass = selectCarcassDimensions(config);
  const pieces: CutPiece[] = getCarcassPieces(config, carcass);

  for (const column of config.columns) {
    for (const row of column.rows) {
      const box = calculateDrawerBox(row, column, config);
      pieces.push(...getDrawerPieces(box, row, config));
    }
  }

  return pieces;
}

export function selectRecommendRails(config: ChestConfig): boolean {
  return shouldRecommendHorizontalRails(config);
}

export function selectRecommendedSlideLength(config: ChestConfig): number {
  const carcass = selectCarcassDimensions(config);
  return recommendSlideLength(carcass.innerDepth);
}

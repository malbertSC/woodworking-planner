import type { ChestConfig, CutPiece, WoodThickness } from "../types.ts";
import { calculateCarcassDimensions, getCarcassPieces } from "./carcass.ts";
import { calculateDrawerBox, getDrawerPieces } from "./drawer.ts";

function pieceKey(piece: CutPiece): string {
  return `${piece.thickness.id}|${String(piece.width)}|${String(piece.height)}`;
}

export function aggregateCutPieces(config: ChestConfig): CutPiece[] {
  const carcass = calculateCarcassDimensions(config);
  const allPieces: CutPiece[] = getCarcassPieces(config, carcass);

  for (const column of config.columns) {
    for (const row of column.rows) {
      const box = calculateDrawerBox(row, column, config);
      allPieces.push(...getDrawerPieces(box, row, config));
    }
  }

  const merged = new Map<string, CutPiece>();

  for (const piece of allPieces) {
    const key = pieceKey(piece);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += piece.quantity;
    } else {
      merged.set(key, { ...piece });
    }
  }

  return [...merged.values()];
}

export function groupPiecesByThickness(
  pieces: CutPiece[],
): Map<string, CutPiece[]> {
  const groups = new Map<string, CutPiece[]>();

  for (const piece of pieces) {
    const key = piece.thickness.id;
    const group = groups.get(key);
    if (group) {
      group.push(piece);
    } else {
      groups.set(key, [piece]);
    }
  }

  return groups;
}

export function getUniqueThicknesses(pieces: CutPiece[]): WoodThickness[] {
  const seen = new Set<string>();
  const result: WoodThickness[] = [];

  for (const piece of pieces) {
    if (!seen.has(piece.thickness.id)) {
      seen.add(piece.thickness.id);
      result.push(piece.thickness);
    }
  }

  return result;
}

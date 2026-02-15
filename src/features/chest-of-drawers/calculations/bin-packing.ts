import type {
  CutPiece,
  PlacedPiece,
  SheetLayout,
  StockSheet,
} from "../types.ts";

interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FitResult {
  rectIndex: number;
  rotated: boolean;
  leftover: number;
}

function findBestFit(
  pieceW: number,
  pieceH: number,
  _kerf: number,
  freeRects: FreeRect[],
  allowRotation: boolean,
): FitResult | null {
  let best: FitResult | null = null;

  for (let i = 0; i < freeRects.length; i++) {
    const rect = freeRects[i];
    if (!rect) continue;

    if (pieceW <= rect.width && pieceH <= rect.height) {
      const leftover = rect.width * rect.height - pieceW * pieceH;
      if (best === null || leftover < best.leftover) {
        best = { rectIndex: i, rotated: false, leftover };
      }
    }

    if (allowRotation && pieceH <= rect.width && pieceW <= rect.height) {
      const leftover = rect.width * rect.height - pieceW * pieceH;
      if (best === null || leftover < best.leftover) {
        best = { rectIndex: i, rotated: true, leftover };
      }
    }
  }

  return best;
}

function guillotineSplit(
  rect: FreeRect,
  placedW: number,
  placedH: number,
  kerf: number,
): FreeRect[] {
  const result: FreeRect[] = [];

  const rightW = rect.width - placedW - kerf;
  const bottomH = rect.height - placedH - kerf;

  if (rightW <= 0 && bottomH <= 0) return result;

  if (rightW <= 0) {
    result.push({
      x: rect.x,
      y: rect.y + placedH + kerf,
      width: rect.width,
      height: bottomH,
    });
    return result;
  }

  if (bottomH <= 0) {
    result.push({
      x: rect.x + placedW + kerf,
      y: rect.y,
      width: rightW,
      height: rect.height,
    });
    return result;
  }

  const horizontalSplitLarger = Math.max(
    rect.width * bottomH,
    rightW * placedH,
  );
  const verticalSplitLarger = Math.max(rightW * rect.height, placedW * bottomH);

  if (horizontalSplitLarger >= verticalSplitLarger) {
    result.push({
      x: rect.x,
      y: rect.y + placedH + kerf,
      width: rect.width,
      height: bottomH,
    });
    result.push({
      x: rect.x + placedW + kerf,
      y: rect.y,
      width: rightW,
      height: placedH,
    });
  } else {
    result.push({
      x: rect.x + placedW + kerf,
      y: rect.y,
      width: rightW,
      height: rect.height,
    });
    result.push({
      x: rect.x,
      y: rect.y + placedH + kerf,
      width: placedW,
      height: bottomH,
    });
  }

  return result.filter((r) => r.width > 0 && r.height > 0);
}

interface ExpandedPiece {
  piece: CutPiece;
  width: number;
  height: number;
}

function expandPieces(pieces: CutPiece[]): ExpandedPiece[] {
  const expanded: ExpandedPiece[] = [];
  for (const piece of pieces) {
    for (let i = 0; i < piece.quantity; i++) {
      expanded.push({ piece, width: piece.width, height: piece.height });
    }
  }
  return expanded;
}

interface FillResult {
  placements: PlacedPiece[];
  remaining: ExpandedPiece[];
}

function fillSheet(
  items: ExpandedPiece[],
  sheet: StockSheet,
  kerfWidth: number,
  allowRotation: boolean,
): FillResult {
  const freeRects: FreeRect[] = [
    { x: 0, y: 0, width: sheet.width, height: sheet.height },
  ];
  const placements: PlacedPiece[] = [];
  const remaining: ExpandedPiece[] = [];

  for (const item of items) {
    const fit = findBestFit(
      item.width,
      item.height,
      kerfWidth,
      freeRects,
      allowRotation,
    );

    if (fit === null) {
      remaining.push(item);
      continue;
    }

    const rect = freeRects[fit.rectIndex];
    if (!rect) continue;
    const placedW = fit.rotated ? item.height : item.width;
    const placedH = fit.rotated ? item.width : item.height;

    placements.push({
      piece: item.piece,
      x: rect.x,
      y: rect.y,
      rotated: fit.rotated,
    });
    freeRects.splice(
      fit.rectIndex,
      1,
      ...guillotineSplit(rect, placedW, placedH, kerfWidth),
    );
  }

  return { placements, remaining };
}

function buildLayout(
  sheet: StockSheet,
  placements: PlacedPiece[],
): SheetLayout {
  const totalArea = sheet.width * sheet.height;
  const usedArea = placements.reduce((sum, p) => {
    const w = p.rotated ? p.piece.height : p.piece.width;
    const h = p.rotated ? p.piece.width : p.piece.height;
    return sum + w * h;
  }, 0);

  return {
    sheet,
    placements,
    wastePercentage: ((totalArea - usedArea) / totalArea) * 100,
    usedArea,
    totalArea,
  };
}

export function packPieces(
  pieces: CutPiece[],
  sheet: StockSheet,
  kerfWidth: number,
  allowRotation = true,
): SheetLayout[] {
  const expanded = expandPieces(pieces);
  expanded.sort((a, b) => b.width * b.height - a.width * a.height);

  const layouts: SheetLayout[] = [];
  let unplaced = [...expanded];

  while (unplaced.length > 0) {
    const { placements, remaining } = fillSheet(
      unplaced,
      sheet,
      kerfWidth,
      allowRotation,
    );
    if (placements.length === 0) break;

    layouts.push(buildLayout(sheet, placements));

    if (remaining.length === unplaced.length) break;
    unplaced = remaining;
  }

  return layouts;
}

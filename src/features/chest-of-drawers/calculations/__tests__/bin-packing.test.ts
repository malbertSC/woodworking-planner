import { describe, it, expect } from "vitest";
import type { CutPiece, StockSheet, WoodThickness } from "../../types.ts";
import { packPieces } from "../bin-packing.ts";

const ply34: WoodThickness = {
  id: "ply-3/4",
  nominal: '3/4" plywood',
  actual: 0.71875,
  material: "plywood",
};

function makeSheet(width: number, height: number): StockSheet {
  return {
    id: "test-sheet",
    label: `${String(width)} x ${String(height)}`,
    width,
    height,
    thickness: ply34,
  };
}

function makePiece(
  width: number,
  height: number,
  quantity = 1,
  label = "Test Piece",
): CutPiece {
  return {
    id: `piece-${String(width)}-${String(height)}`,
    label,
    width,
    height,
    thickness: ply34,
    quantity,
  };
}

describe("packPieces", () => {
  it("packs a single piece on a sheet", () => {
    const pieces = [makePiece(10, 10)];
    const sheet = makeSheet(48, 96);
    const layouts = packPieces(pieces, sheet, 0.125);

    expect(layouts).toHaveLength(1);
    expect(layouts[0]!.placements).toHaveLength(1);
    expect(layouts[0]!.placements[0]!.x).toBe(0);
    expect(layouts[0]!.placements[0]!.y).toBe(0);
  });

  it("packs multiple pieces on one sheet", () => {
    const pieces = [
      makePiece(20, 20, 1, "Large"),
      makePiece(10, 10, 1, "Small 1"),
      makePiece(10, 10, 1, "Small 2"),
    ];
    const sheet = makeSheet(48, 96);
    const layouts = packPieces(pieces, sheet, 0.125);

    expect(layouts).toHaveLength(1);
    expect(layouts[0]!.placements).toHaveLength(3);
  });

  it("starts a new sheet when pieces do not fit", () => {
    const pieces = [makePiece(40, 90, 2, "Large Panel")];
    const sheet = makeSheet(48, 96);
    const layouts = packPieces(pieces, sheet, 0.125);

    expect(layouts).toHaveLength(2);
    expect(layouts[0]!.placements).toHaveLength(1);
    expect(layouts[1]!.placements).toHaveLength(1);
  });

  it("accounts for kerf reducing available space", () => {
    const pieces = [makePiece(24, 47, 2, "Half Width")];
    const sheet = makeSheet(48, 48);
    const layoutsNoKerf = packPieces(pieces, sheet, 0);
    const layoutsWithKerf = packPieces(pieces, sheet, 0.125);

    expect(layoutsNoKerf).toHaveLength(1);
    expect(layoutsNoKerf[0]!.placements).toHaveLength(2);
    expect(layoutsWithKerf).toHaveLength(2);
  });

  it("uses rotation to produce a better fit", () => {
    const pieces = [
      makePiece(40, 10, 1, "Wide"),
      makePiece(40, 10, 1, "Wide 2"),
    ];
    const sheet = makeSheet(48, 20);

    const noRotation = packPieces(pieces, sheet, 0, false);
    expect(noRotation).toHaveLength(1);

    const pieces2 = [
      makePiece(40, 10, 1, "Wide"),
      makePiece(10, 40, 1, "Tall"),
    ];
    const layoutsNoRot = packPieces(pieces2, makeSheet(48, 20), 0, false);
    const layoutsWithRot = packPieces(pieces2, makeSheet(48, 20), 0, true);

    expect(layoutsWithRot.length).toBeLessThanOrEqual(layoutsNoRot.length);
  });

  it("handles oversized pieces that cannot fit any sheet", () => {
    const pieces = [makePiece(100, 100)];
    const sheet = makeSheet(48, 96);
    const layouts = packPieces(pieces, sheet, 0.125);

    expect(layouts).toHaveLength(0);
  });

  it("calculates waste percentage accurately", () => {
    const pieces = [makePiece(48, 96)];
    const sheet = makeSheet(48, 96);
    const layouts = packPieces(pieces, sheet, 0);

    expect(layouts).toHaveLength(1);
    expect(layouts[0]!.wastePercentage).toBeCloseTo(0, 1);
    expect(layouts[0]!.usedArea).toBeCloseTo(48 * 96);
    expect(layouts[0]!.totalArea).toBe(48 * 96);
  });

  it("waste percentage is nonzero for partially used sheet", () => {
    const pieces = [makePiece(24, 48)];
    const sheet = makeSheet(48, 96);
    const layouts = packPieces(pieces, sheet, 0);

    expect(layouts).toHaveLength(1);
    expect(layouts[0]!.wastePercentage).toBeCloseTo(75, 1);
  });

  it("expands pieces by quantity correctly", () => {
    const pieces = [makePiece(10, 10, 4, "Small Square")];
    const sheet = makeSheet(48, 96);
    const layouts = packPieces(pieces, sheet, 0);

    expect(layouts).toHaveLength(1);
    expect(layouts[0]!.placements).toHaveLength(4);
  });

  it("places no pieces overlap", () => {
    const pieces = [
      makePiece(20, 30, 3, "Panel A"),
      makePiece(15, 25, 2, "Panel B"),
    ];
    const sheet = makeSheet(48, 96);
    const layouts = packPieces(pieces, sheet, 0);

    for (const layout of layouts) {
      for (let i = 0; i < layout.placements.length; i++) {
        const a = layout.placements[i]!;
        const aW = a.rotated ? a.piece.height : a.piece.width;
        const aH = a.rotated ? a.piece.width : a.piece.height;

        for (let j = i + 1; j < layout.placements.length; j++) {
          const b = layout.placements[j]!;
          const bW = b.rotated ? b.piece.height : b.piece.width;
          const bH = b.rotated ? b.piece.width : b.piece.height;

          const overlapX = a.x < b.x + bW && a.x + aW > b.x;
          const overlapY = a.y < b.y + bH && a.y + aH > b.y;
          expect(overlapX && overlapY).toBe(false);
        }
      }
    }
  });
});

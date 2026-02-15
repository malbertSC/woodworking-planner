import { describe, it, expect } from "vitest";
import {
  toMm,
  gridfinityGridUnits,
  gridfinityBinHeightMm,
  gridfinityMaxBinUnits,
  roundUpToNearestEighth,
  openingWidthForGridUnits,
  openingHeightForBinUnits,
} from "../gridfinity.ts";

describe("toMm", () => {
  it("converts inches to mm", () => {
    expect(toMm(1, "inches")).toBeCloseTo(25.4);
    expect(toMm(14, "inches")).toBeCloseTo(355.6);
  });

  it("converts cm to mm", () => {
    expect(toMm(1, "cm")).toBe(10);
    expect(toMm(42, "cm")).toBe(420);
  });
});

describe("gridfinityGridUnits", () => {
  it("computes how many 42mm units fit", () => {
    expect(gridfinityGridUnits(42)).toBe(1);
    expect(gridfinityGridUnits(84)).toBe(2);
    expect(gridfinityGridUnits(83)).toBe(1);
    expect(gridfinityGridUnits(41)).toBe(0);
    expect(gridfinityGridUnits(300)).toBe(7);
  });
});

describe("gridfinityBinHeightMm", () => {
  it("matches known bin heights", () => {
    expect(gridfinityBinHeightMm(4)).toBe(32);
    expect(gridfinityBinHeightMm(6)).toBe(46);
  });

  it("computes other bin heights via formula units*7+4", () => {
    expect(gridfinityBinHeightMm(1)).toBe(11);
    expect(gridfinityBinHeightMm(2)).toBe(18);
    expect(gridfinityBinHeightMm(3)).toBe(25);
    expect(gridfinityBinHeightMm(5)).toBe(39);
    expect(gridfinityBinHeightMm(7)).toBe(53);
    expect(gridfinityBinHeightMm(8)).toBe(60);
    expect(gridfinityBinHeightMm(9)).toBe(67);
    expect(gridfinityBinHeightMm(10)).toBe(74);
    expect(gridfinityBinHeightMm(11)).toBe(81);
    expect(gridfinityBinHeightMm(12)).toBe(88);
  });
});

describe("gridfinityMaxBinUnits", () => {
  it("returns 0 when too short for any bin", () => {
    expect(gridfinityMaxBinUnits(10)).toBe(0);
    expect(gridfinityMaxBinUnits(0)).toBe(0);
  });

  it("returns correct max for exact fit", () => {
    expect(gridfinityMaxBinUnits(32)).toBe(4); // 4u = 32mm exactly
    expect(gridfinityMaxBinUnits(46)).toBe(6); // 6u = 46mm exactly
  });

  it("returns correct max when between sizes", () => {
    expect(gridfinityMaxBinUnits(45)).toBe(5); // 5u = 39mm fits, 6u = 46mm doesn't
    expect(gridfinityMaxBinUnits(50)).toBe(6); // 6u = 46mm fits, 7u = 53mm doesn't
  });

  it("caps at 12u", () => {
    expect(gridfinityMaxBinUnits(200)).toBe(12); // 12u = 88mm, plenty of room but capped
  });

  it("returns 12 for exactly 88mm", () => {
    expect(gridfinityMaxBinUnits(88)).toBe(12);
  });
});

describe("roundUpToNearestEighth", () => {
  it("rounds up fractional inches to nearest 1/8", () => {
    expect(roundUpToNearestEighth(1.0)).toBe(1.0);
    expect(roundUpToNearestEighth(1.01)).toBe(1.125);
    expect(roundUpToNearestEighth(1.125)).toBe(1.125);
    expect(roundUpToNearestEighth(1.126)).toBe(1.25);
    expect(roundUpToNearestEighth(1.5)).toBe(1.5);
    expect(roundUpToNearestEighth(0.0)).toBe(0.0);
  });

  it("handles the gridfinity 7-unit width conversion", () => {
    // 7 * 42mm = 294mm = 11.5748..." → ceil to 11.625" (11-5/8")
    const inches = 294 / 25.4;
    expect(roundUpToNearestEighth(inches)).toBe(11.625);
  });

  it("handles the gridfinity 4u bin height conversion", () => {
    // 4u = 32mm = 1.2598..." → ceil to 1.375" (1-3/8")
    const inches = 32 / 25.4;
    expect(roundUpToNearestEighth(inches)).toBe(1.375);
  });
});

describe("openingWidthForGridUnits", () => {
  const sideThickness = 0.46875; // 15/32" plywood
  const clearance = 0.5;

  it("computes opening width for 7 grid units", () => {
    // 7*42mm = 294mm = 11.5748..." + 2*0.46875 + 2*0.5 = 13.5123..." → ceil to 13.625"
    const width = openingWidthForGridUnits(7, sideThickness, clearance);
    expect(width).toBeCloseTo(13.625);
  });

  it("computes opening width for 1 grid unit", () => {
    // 1*42mm = 42mm = 1.6535..." + 2*0.46875 + 2*0.5 = 3.591..." → ceil to 3.625"
    const width = openingWidthForGridUnits(1, sideThickness, clearance);
    expect(width).toBeCloseTo(3.625);
  });

  it("rounds final result to nearest 1/8 even with non-eighth thicknesses", () => {
    // This is the key scenario: 15/32" plywood sides produce non-eighth sums
    // without the final rounding step
    const width = openingWidthForGridUnits(7, sideThickness, clearance);
    expect(width * 8).toBe(Math.round(width * 8)); // exact 1/8" multiple
  });

  it("resulting interior width fits the requested grid units", () => {
    const width = openingWidthForGridUnits(7, sideThickness, clearance);
    // Reverse: interiorWidth = width - 2*clearance - 2*sideThickness
    const interior = width - 2 * clearance - 2 * sideThickness;
    const interiorMm = interior * 25.4;
    expect(gridfinityGridUnits(interiorMm)).toBeGreaterThanOrEqual(7);
  });
});

describe("openingHeightForBinUnits", () => {
  const verticalClearance = 0.25;
  const bottomThickness = 0.25;
  const dadoGrooveOffset = 0.375;

  it("computes opening height for 4u bin with dado", () => {
    // 4u = 32mm → 1.375" rounded + 0.375 + 0.25 + 0.25 = 2.25"
    const height = openingHeightForBinUnits(
      4,
      "dado",
      verticalClearance,
      bottomThickness,
      dadoGrooveOffset,
    );
    expect(height).toBeCloseTo(2.25);
  });

  it("computes opening height for 4u bin with butt-through-sides", () => {
    // 4u = 32mm → 1.375" + 0.25 + 0.25 = 1.875"
    const height = openingHeightForBinUnits(
      4,
      "butt-through-sides",
      verticalClearance,
      bottomThickness,
      dadoGrooveOffset,
    );
    expect(height).toBeCloseTo(1.875);
  });

  it("computes opening height for 4u bin with butt-through-bottom", () => {
    // 4u = 32mm → 1.375" + 0.25 + 0.25 = 1.875"
    const height = openingHeightForBinUnits(
      4,
      "butt-through-bottom",
      verticalClearance,
      bottomThickness,
      dadoGrooveOffset,
    );
    expect(height).toBeCloseTo(1.875);
  });

  it("dado requires more opening height than butt joints", () => {
    const dado = openingHeightForBinUnits(
      8,
      "dado",
      verticalClearance,
      bottomThickness,
      dadoGrooveOffset,
    );
    const butt = openingHeightForBinUnits(
      8,
      "butt-through-sides",
      verticalClearance,
      bottomThickness,
      dadoGrooveOffset,
    );
    expect(dado).toBeGreaterThan(butt);
  });

  it("rounds final result to nearest 1/8 with non-eighth thicknesses", () => {
    // 15/32" plywood bottom (0.46875") would produce 1/32" fractions without final rounding
    // 4u = 32mm = 1.2598..." + 0.46875 + 0.25 = 1.978..." → ceil to 2.0"
    const plywoodBottom = 0.46875; // 15/32"
    const height = openingHeightForBinUnits(
      4,
      "butt-through-sides",
      verticalClearance,
      plywoodBottom,
      dadoGrooveOffset,
    );
    expect(height).toBe(2.0);
    expect(height * 8).toBe(Math.round(height * 8)); // exact 1/8" multiple
  });
});

import { describe, it, expect } from "vitest";
import {
  toCm,
  toInches,
  convert,
  decimalToFraction,
  formatDimension,
} from "../units.ts";

describe("toCm", () => {
  it("converts inches to centimeters", () => {
    expect(toCm(1)).toBeCloseTo(2.54);
    expect(toCm(12)).toBeCloseTo(30.48);
    expect(toCm(0.5)).toBeCloseTo(1.27);
  });

  it("returns 0 for 0 inches", () => {
    expect(toCm(0)).toBe(0);
  });
});

describe("toInches", () => {
  it("converts centimeters to inches", () => {
    expect(toInches(2.54)).toBeCloseTo(1);
    expect(toInches(30.48)).toBeCloseTo(12);
    expect(toInches(1.27)).toBeCloseTo(0.5);
  });

  it("returns 0 for 0 cm", () => {
    expect(toInches(0)).toBe(0);
  });
});

describe("convert", () => {
  it("returns the same value when units match", () => {
    expect(convert(5, "inches", "inches")).toBe(5);
    expect(convert(10, "cm", "cm")).toBe(10);
  });

  it("converts inches to cm", () => {
    expect(convert(1, "inches", "cm")).toBeCloseTo(2.54);
  });

  it("converts cm to inches", () => {
    expect(convert(2.54, "cm", "inches")).toBeCloseTo(1);
  });

  it("round-trips accurately", () => {
    const original = 18.75;
    const roundTripped = convert(
      convert(original, "inches", "cm"),
      "cm",
      "inches",
    );
    expect(roundTripped).toBeCloseTo(original);
  });
});

describe("decimalToFraction", () => {
  it("converts common plywood thicknesses", () => {
    expect(decimalToFraction(0.71875)).toBe("23/32");
    expect(decimalToFraction(0.46875)).toBe("15/32");
  });

  it("converts simple fractions", () => {
    expect(decimalToFraction(0.5)).toBe("1/2");
    expect(decimalToFraction(0.25)).toBe("1/4");
    expect(decimalToFraction(0.75)).toBe("3/4");
    expect(decimalToFraction(0.125)).toBe("1/8");
  });

  it("handles whole numbers with fractions", () => {
    expect(decimalToFraction(3.5)).toBe("3-1/2");
    expect(decimalToFraction(1.25)).toBe("1-1/4");
    expect(decimalToFraction(2.75)).toBe("2-3/4");
  });

  it("handles whole numbers", () => {
    expect(decimalToFraction(1)).toBe("1");
    expect(decimalToFraction(12)).toBe("12");
  });

  it("handles zero", () => {
    expect(decimalToFraction(0)).toBe("0");
  });

  it("handles negative values", () => {
    expect(decimalToFraction(-0.5)).toBe("-1/2");
    expect(decimalToFraction(-3.25)).toBe("-3-1/4");
  });

  it("handles very small values near zero", () => {
    expect(decimalToFraction(0.001)).toBe("0");
  });

  it("rounds to nearest fraction within precision", () => {
    expect(decimalToFraction(0.0625)).toBe("1/16");
    expect(decimalToFraction(0.03125)).toBe("1/32");
  });

  it("respects custom maxDenominator", () => {
    expect(decimalToFraction(0.333, 8)).toBe("3/8");
    expect(decimalToFraction(0.333, 16)).toBe("5/16");
  });

  it("rounds up to next whole number when fraction rounds to 1", () => {
    expect(decimalToFraction(2.99)).toBe("3");
  });
});

describe("formatDimension", () => {
  it("formats inches with fractional display", () => {
    expect(formatDimension(0.71875, "inches")).toBe('23/32"');
    expect(formatDimension(3.5, "inches")).toBe('3-1/2"');
    expect(formatDimension(18, "inches")).toBe('18"');
  });

  it("formats cm with one decimal place", () => {
    expect(formatDimension(2.54, "cm")).toBe("2.5 cm");
    expect(formatDimension(30.48, "cm")).toBe("30.5 cm");
    expect(formatDimension(0, "cm")).toBe("0.0 cm");
  });

  it("formats zero in inches", () => {
    expect(formatDimension(0, "inches")).toBe('0"');
  });
});

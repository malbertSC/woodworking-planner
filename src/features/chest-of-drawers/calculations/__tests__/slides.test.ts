import { describe, it, expect } from "vitest";
import { recommendSlideLength, getAvailableSlideLengths } from "../slides.ts";
import { STANDARD_SLIDE_LENGTHS } from "../../constants.ts";

describe("getAvailableSlideLengths", () => {
  it("returns all standard slide lengths", () => {
    const lengths = getAvailableSlideLengths();
    expect(lengths).toEqual(STANDARD_SLIDE_LENGTHS);
  });
});

describe("recommendSlideLength", () => {
  it('recommends 18" slide for 20" available depth', () => {
    expect(recommendSlideLength(20)).toBe(18);
  });

  it('recommends 22" slide for 24" available depth', () => {
    expect(recommendSlideLength(24)).toBe(22);
  });

  it('recommends 28" slide for 30" available depth', () => {
    expect(recommendSlideLength(30)).toBe(28);
  });

  it('recommends 10" slide for 11.5" available depth', () => {
    expect(recommendSlideLength(11.5)).toBe(10);
  });

  it("returns smallest slide when nothing fits", () => {
    expect(recommendSlideLength(5)).toBe(10);
  });

  it('returns exact match minus 1" clearance', () => {
    expect(recommendSlideLength(15)).toBe(14);
  });

  it('handles boundary: availableDepth exactly 1" more than slide', () => {
    expect(recommendSlideLength(11)).toBe(10);
  });

  it("handles very large available depth", () => {
    expect(recommendSlideLength(100)).toBe(28);
  });
});

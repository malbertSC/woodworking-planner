import { STANDARD_SLIDE_LENGTHS } from "../constants.ts";

export function getAvailableSlideLengths(): readonly number[] {
  return STANDARD_SLIDE_LENGTHS;
}

export function recommendSlideLength(availableDepth: number): number {
  const maxSlideLength = availableDepth - 1;

  for (let i = STANDARD_SLIDE_LENGTHS.length - 1; i >= 0; i--) {
    const length = STANDARD_SLIDE_LENGTHS[i];
    if (length !== undefined && length <= maxSlideLength) {
      return length;
    }
  }

  return STANDARD_SLIDE_LENGTHS[0];
}

import type { Unit } from "../types.ts";
import { INCHES_TO_CM } from "../constants.ts";

export function toCm(inches: number): number {
  return inches * INCHES_TO_CM;
}

export function toInches(cm: number): number {
  return cm / INCHES_TO_CM;
}

export function convert(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  return from === "inches" ? toCm(value) : toInches(value);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function decimalToFraction(
  decimal: number,
  maxDenominator = 32,
): string {
  if (decimal < 0) return `-${decimalToFraction(-decimal, maxDenominator)}`;

  const wholePart = Math.floor(decimal);
  const fractionalPart = decimal - wholePart;

  if (fractionalPart < 1 / (maxDenominator * 2)) {
    return String(wholePart || 0);
  }

  const numerator = Math.round(fractionalPart * maxDenominator);

  if (numerator === maxDenominator) {
    return String(wholePart + 1);
  }

  const divisor = gcd(numerator, maxDenominator);
  const reducedNum = numerator / divisor;
  const reducedDen = maxDenominator / divisor;

  if (wholePart === 0) {
    return `${String(reducedNum)}/${String(reducedDen)}`;
  }

  return `${String(wholePart)}-${String(reducedNum)}/${String(reducedDen)}`;
}

export function formatDimension(value: number, unit: Unit): string {
  if (unit === "cm") {
    return `${value.toFixed(1)} cm`;
  }

  return `${decimalToFraction(value)}"`;
}

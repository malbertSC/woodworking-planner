import { useCallback, useEffect, useRef, useState } from "react";
import type { Unit } from "../../types.ts";
import { decimalToFraction } from "../../calculations/units.ts";

function parseFractionalInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const plain = Number(trimmed);
  if (!Number.isNaN(plain)) return plain;

  const mixedMatch = /^(\d+)\s*[-\s]\s*(\d+)\s*\/\s*(\d+)$/.exec(trimmed);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (den !== 0) return whole + num / den;
  }

  const fractionMatch = /^(\d+)\s*\/\s*(\d+)$/.exec(trimmed);
  if (fractionMatch) {
    const num = Number(fractionMatch[1]);
    const den = Number(fractionMatch[2]);
    if (den !== 0) return num / den;
  }

  return null;
}

function formatDisplay(value: number, unit?: Unit): string {
  if (unit === "inches") return decimalToFraction(value);
  return String(value);
}

function useRejectFlash() {
  const [rejected, setRejected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const flash = useCallback(() => {
    setRejected(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setRejected(false);
    }, 500);
  }, []);

  return { rejected, flash } as const;
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  unit?: Unit;
  id?: string;
}

export default function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.125,
  suffix,
  unit,
  id,
}: NumberInputProps) {
  const [editingText, setEditingText] = useState<string | null>(null);
  const { rejected, flash } = useRejectFlash();

  const commit = useCallback(
    (input: string) => {
      const parsed = parseFractionalInput(input);
      if (parsed === null) {
        flash();
        return;
      }
      let clamped = parsed;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      if (clamped !== parsed) flash();
      onChange(clamped);
    },
    [onChange, min, max, flash],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && editingText !== null) commit(editingText);
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onChange(
          max !== undefined ? Math.min(max, value + step) : value + step,
        );
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onChange(
          min !== undefined ? Math.max(min, value - step) : value - step,
        );
      }
    },
    [editingText, commit, value, step, onChange, max, min],
  );

  const displayValue = editingText ?? formatDisplay(value, unit);
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const borderClass = rejected
    ? "border-red-400"
    : "border-stone-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs font-medium text-stone-600">
        {label}
      </label>
      <div className="flex items-center">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(e) => {
            setEditingText(e.target.value);
          }}
          onFocus={() => {
            setEditingText(String(value));
          }}
          onBlur={() => {
            if (editingText !== null) commit(editingText);
            setEditingText(null);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded border bg-white px-2 py-1.5 text-sm text-stone-800 transition-colors focus:outline-none ${borderClass}`}
        />
        {suffix && (
          <span className="ml-1.5 text-xs text-stone-500 whitespace-nowrap">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

type RangeFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  className?: string;
};

/** A slider with a matching number field, kept in sync and clamped to the range. */
export function RangeField({ label, value, min, max, step = 1, unit, onChange, className }: RangeFieldProps) {
  const id = useId();
  const set = (raw: string) => {
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(n)) return;
    onChange(Math.min(max, Math.max(min, n)));
  };
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="flex items-center gap-1">
          <input
            type="number"
            aria-label={`${label}${unit ? ` in ${unit}` : ""}`}
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => set(e.target.value)}
            className="h-7 w-16 rounded-sm border border-input bg-surface px-1.5 text-right font-mono text-xs text-foreground"
          />
          {unit ? <span className="w-5 text-xs text-muted-foreground">{unit}</span> : null}
        </span>
      </div>
      <input
        id={id}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-5 w-full cursor-pointer accent-accent"
      />
    </div>
  );
}

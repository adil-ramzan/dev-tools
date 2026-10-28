"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

type SegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
};

/** A row of mutually exclusive options, built on native radio buttons for keyboard and screen reader support. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className={cn("mb-1.5 text-sm font-medium", hideLabel && "sr-only")}>{label}</legend>
      <div className="inline-flex flex-wrap rounded-sm border border-border-strong bg-surface p-0.5">
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="flex h-8 cursor-pointer items-center rounded-[3px] px-3 text-sm whitespace-nowrap text-muted-foreground transition-colors duration-150 peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-accent hover:text-foreground peer-checked:hover:text-background">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

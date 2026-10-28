"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

type ColorFieldProps = {
  label: string;
  /** Six-digit hex color, e.g. #1f4fe0. */
  value: string;
  onChange: (hex: string) => void;
  hideLabel?: boolean;
  className?: string;
};

const HEX6 = /^#?[0-9a-f]{6}$/i;

/** Native color picker with an editable hex field. Invalid hex text is kept but not applied. */
export function ColorField({ label, value, onChange, hideLabel = false, className }: ColorFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const invalid = draft !== null && !HEX6.test(draft);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-sm font-medium", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={value}
          onChange={(e) => {
            setDraft(null);
            onChange(e.target.value);
          }}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-sm border border-input bg-surface p-0.5"
        />
        <input
          id={id}
          value={text}
          onChange={(e) => {
            const next = e.target.value.trim();
            setDraft(next);
            if (HEX6.test(next)) onChange((next.startsWith("#") ? next : `#${next}`).toLowerCase());
          }}
          onBlur={() => setDraft(null)}
          aria-invalid={invalid}
          spellCheck={false}
          autoComplete="off"
          className="h-9 w-24 rounded-sm border border-input bg-surface px-2 font-mono text-sm text-foreground aria-invalid:border-danger"
        />
      </div>
    </div>
  );
}

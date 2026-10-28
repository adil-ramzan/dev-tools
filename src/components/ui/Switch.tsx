"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

type SwitchProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

/** On/off toggle with an accessible switch role. The label is clickable. */
export function Switch({ label, checked, onChange, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <label htmlFor={id} className="cursor-pointer text-sm select-none">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150",
          checked ? "border-accent bg-accent" : "border-border-strong bg-subtle",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-4.5 rounded-full bg-white shadow-sm transition-transform duration-150",
            checked ? "translate-x-5.5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

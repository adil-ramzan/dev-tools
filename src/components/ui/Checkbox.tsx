import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & { label: ReactNode };

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm select-none", className)}>
      <input type="checkbox" className="size-4 shrink-0 cursor-pointer accent-accent" {...props} />
      {label}
    </label>
  );
}

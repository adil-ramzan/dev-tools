import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type SeparatorProps = ComponentProps<"hr"> & {
  orientation?: "horizontal" | "vertical";
};

/** Thematic break. Vertical separators are treated as decorative. */
export function Separator({ orientation = "horizontal", className, ...props }: SeparatorProps) {
  if (orientation === "vertical") {
    return <span aria-hidden="true" className={cn("inline-block h-5 w-px self-center bg-border", className)} />;
  }
  return <hr className={cn("border-0 border-t border-border", className)} {...props} />;
}

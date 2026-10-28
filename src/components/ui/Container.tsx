import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type ContainerProps = ComponentProps<"div"> & {
  /** "prose" for reading-width content, "wide" for tool workspaces. */
  size?: "prose" | "default" | "wide";
};

const sizes = {
  prose: "max-w-reading",
  default: "max-w-page",
  wide: "max-w-wide",
};

export function Container({ size = "default", className, ...props }: ContainerProps) {
  return <div className={cn("mx-auto w-full px-gutter", sizes[size], className)} {...props} />;
}

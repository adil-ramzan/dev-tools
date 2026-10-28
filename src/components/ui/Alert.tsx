import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AlertProps = {
  tone?: "danger" | "warning" | "success";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const tones = {
  danger: "border-danger",
  warning: "border-border-strong",
  success: "border-success",
};

const titleTones = {
  danger: "text-danger",
  warning: "text-foreground",
  success: "text-success",
};

/** Inline message. Errors are announced immediately; other tones politely. */
export function Alert({ tone = "danger", title, children, className }: AlertProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex flex-col gap-1 border-l-2 bg-surface py-2.5 pr-3 pl-3.5 text-sm", tones[tone], className)}
    >
      {title ? <p className={cn("font-medium", titleTones[tone])}>{title}</p> : null}
      {children ? <div className="text-muted-foreground">{children}</div> : null}
    </div>
  );
}

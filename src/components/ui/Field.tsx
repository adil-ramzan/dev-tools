import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-sm border border-input bg-surface px-3 text-foreground placeholder:text-muted-foreground hover:border-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-sm font-medium text-foreground", className)} {...props} />;
}

export function Hint({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/** Validation message. Reference it from the control with `aria-describedby`. */
export function FieldError({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-danger", className)} {...props} />;
}

/** Vertical stack for a label, control, hint and error. */
export function Field({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10 text-sm", className)} {...props} />;
}

/** Native select, styled to match Input. `className` sizes the wrapper. */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select className={cn(control, "h-9 cursor-pointer appearance-none pr-9 text-sm")} {...props} />
      <svg
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}

/** Monospace by default: most tool input is code or structured text. */
export function Textarea({ className, spellCheck = false, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      spellCheck={spellCheck}
      className={cn(control, "min-h-48 resize-none py-2 font-mono text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

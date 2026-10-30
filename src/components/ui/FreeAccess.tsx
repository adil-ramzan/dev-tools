import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * The site's free-access messaging. Every tool is free, with no account,
 * signup, subscription or payment, so these components say exactly that and
 * nothing more: no claims about usage limits or where input is processed.
 * One style everywhere, so the message reads as part of the design.
 */

/** The footer line and the items of the homepage trust strip. */
export const FREE_ACCESS_LINE = "100% Free · No Signup · No Subscription";
const freeAccessItems = ["100% Free", "No signup", "No account", "No subscription"];

/** Compact FREE label, e.g. next to the logo or a tool title. */
export function FreeBadge({ children = "Free", className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border border-success/50 px-1.5 font-mono text-[0.6875rem] leading-[1.125rem] font-semibold tracking-wide whitespace-nowrap text-success uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={cn("shrink-0 text-success", className)}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** A short line of free-access copy with a check mark, for page introductions. */
export function FreeAccessNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-sm text-muted-foreground", className)}>
      <CheckIcon className="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

/** Homepage trust strip: what using the site does not require. */
export function FreeAccessStrip({ className }: { className?: string }) {
  return (
    <ul aria-label="Free access" className={cn("flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium text-foreground", className)}>
      {freeAccessItems.map((item) => (
        <li key={item} className="flex items-center gap-1.5">
          <CheckIcon />
          {item}
        </li>
      ))}
    </ul>
  );
}

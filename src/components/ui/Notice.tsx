import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type NoticeProps = {
  /** The essential message, always visible. */
  title: ReactNode;
  /** Supporting detail, shown on request. */
  children?: ReactNode;
  tone?: "warning" | "info";
  className?: string;
};

/**
 * A compact notice for standing advice such as security warnings: the title
 * stays visible, the explanation is one click away. Built on <details>, so it
 * works with the keyboard and without JavaScript, and the text stays in the
 * page for search engines and screen readers.
 */
export function Notice({ title, children, tone = "warning", className }: NoticeProps) {
  const icon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={cn("mt-0.5 shrink-0", tone === "warning" ? "text-danger" : "text-accent")}>
      {tone === "warning" ? <path d="M12 3 2 21h20L12 3Zm0 7v5m0 3v.01" /> : <path d="M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />}
    </svg>
  );
  if (!children) {
    return (
      <p className={cn("flex gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm", className)}>
        {icon}
        <span className="font-medium">{title}</span>
      </p>
    );
  }
  return (
    <details className={cn("group rounded-md border border-border bg-surface text-sm", className)}>
      <summary className="flex cursor-pointer list-none gap-2 px-3 py-2 marker:hidden [&::-webkit-details-marker]:hidden">
        {icon}
        <span className="font-medium">{title}</span>
        <span className="ml-auto shrink-0 pl-2 text-xs whitespace-nowrap text-muted-foreground group-open:hidden">Details</span>
        <span className="ml-auto hidden shrink-0 pl-2 text-xs whitespace-nowrap text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <div className="border-t border-border px-3 py-2.5 pl-9 leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

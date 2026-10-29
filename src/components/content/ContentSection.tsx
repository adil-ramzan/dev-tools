import type { ReactNode } from "react";

/** A titled block of written content: tool explanations, tutorials and site pages. */
export function ContentSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-4 leading-relaxed text-muted-foreground">
      <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ExampleBlock({ label, code }: { label: string; code: string }) {
  return (
    <figure className="flex min-w-0 flex-col gap-1.5">
      <figcaption className="font-mono text-xs text-muted-foreground uppercase">{label}</figcaption>
      {/* Focusable so keyboard users can scroll long lines (WCAG 2.1.1). */}
      <pre tabIndex={0} className="overflow-x-auto rounded-md border border-border bg-surface p-3 text-[0.8125rem] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

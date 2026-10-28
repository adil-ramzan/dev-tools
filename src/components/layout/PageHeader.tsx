import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Short label above the title, e.g. a category or status. */
  eyebrow?: ReactNode;
  className?: string;
};

/** Standard page heading. Each page renders exactly one, which provides its h1. */
export function PageHeader({ title, description, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {eyebrow ? <p className="text-sm font-medium text-accent">{eyebrow}</p> : null}
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
      {description ? (
        <p className="max-w-2xl text-lg text-pretty text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { ToolGrid } from "@/components/tools/ToolGrid";
import { cn } from "@/lib/cn";
import type { CategoryDefinition, ToolCategory, ToolDefinition } from "@/types/tool";

type ToolDirectoryProps = {
  tools: ToolDefinition[];
  categories: CategoryDefinition[];
  initialCategory?: ToolCategory | null;
  /** Mirror the selected category to the URL (?category=). */
  syncUrl?: boolean;
  /** Heading level for tool names in the grid. */
  headingLevel?: "h2" | "h3";
  /** "hero" centers the filters for the homepage. */
  variant?: "default" | "hero";
};

/** Tool grid with category filters. Filtering runs in the browser against the tool registry. */
export function ToolDirectory({
  tools,
  categories,
  initialCategory = null,
  syncUrl = false,
  headingLevel = "h2",
  variant = "default",
}: ToolDirectoryProps) {
  const [category, setCategory] = useState<ToolCategory | null>(initialCategory);
  const filterLabelId = useId();
  const hero = variant === "hero";

  const results = category ? tools.filter((tool) => tool.category === category) : tools;

  function selectCategory(next: ToolCategory | null) {
    setCategory(next);
    if (!syncUrl) return;
    window.history.replaceState(null, "", next ? `?category=${next}` : window.location.pathname);
  }

  const filters: { slug: ToolCategory | null; label: string; count: number }[] = [
    { slug: null, label: "All tools", count: tools.length },
    ...categories.map((c) => ({
      slug: c.slug,
      label: c.shortName,
      count: tools.filter((tool) => tool.category === c.slug).length,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className={cn("flex w-full flex-col gap-2", hero && "items-center")}>
        <p id={filterLabelId} className={cn("text-sm font-medium", hero && "sr-only")}>
          Filter by category
        </p>
        <div role="group" aria-labelledby={filterLabelId} className={cn("flex flex-wrap gap-2", hero && "justify-center")}>
          {filters.map((filter) => {
            const selected = category === filter.slug;
            return (
              <button
                key={filter.slug ?? "all"}
                type="button"
                aria-pressed={selected}
                onClick={() => selectCategory(filter.slug)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-sm border px-3.5 text-sm transition-colors duration-150",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-transparent text-foreground hover:border-border-strong hover:bg-surface",
                )}
              >
                {filter.label}
                <span
                  className={cn("font-mono text-xs tabular-nums", selected ? "opacity-70" : "text-muted-foreground")}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {/* Announces the result count to screen readers; the grid itself shows the change visually. */}
        <p aria-live="polite" className="sr-only">
          {results.length === tools.length ? `${tools.length} tools` : `${results.length} of ${tools.length} tools`}
        </p>
        <ToolGrid tools={results} headingLevel={headingLevel} />
      </div>
    </div>
  );
}

/**
 * Reads the initial category from the URL. Must sit inside a Suspense
 * boundary so the page can be prerendered (see /tools page).
 */
export function ToolDirectoryFromUrl(props: Omit<ToolDirectoryProps, "initialCategory">) {
  const searchParams = useSearchParams();
  const rawCategory = searchParams.get("category");
  const initialCategory = props.categories.some((c) => c.slug === rawCategory)
    ? (rawCategory as ToolCategory)
    : null;

  return <ToolDirectory {...props} initialCategory={initialCategory} />;
}

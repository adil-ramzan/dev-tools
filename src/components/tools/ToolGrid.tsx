import Link from "next/link";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { toolPath } from "@/content/tools";
import { cn } from "@/lib/cn";
import type { ToolDefinition } from "@/types/tool";

type ToolGridProps = {
  tools: ToolDefinition[];
  /** Heading level for tool names, so the grid fits the page outline. */
  headingLevel?: "h2" | "h3";
  className?: string;
};

/**
 * Tool tiles: a colorful icon beside the name, then the description. Available tools are fully clickable
 * (a stretched link on the name keeps the accessible name short). Planned
 * tools are shown but not linked, and are labelled "Coming soon".
 */
export function ToolGrid({ tools, headingLevel = "h3", className }: ToolGridProps) {
  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5", className)}>
      {tools.map((tool) => (
        <ToolTile key={tool.slug} tool={tool} headingLevel={headingLevel} />
      ))}
    </ul>
  );
}

function ToolTile({ tool, headingLevel: Heading }: { tool: ToolDefinition; headingLevel: "h2" | "h3" }) {
  const available = tool.status === "available";

  return (
    <li
      className={cn(
        "group relative flex flex-col gap-3 rounded-md border border-border bg-surface p-5 transition-colors duration-150",
        available &&
          "hover:border-border-strong hover:bg-subtle has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent",
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("transition-transform duration-150", available && "group-hover:scale-110")}>
          <ToolIcon name={tool.icon} size={34} />
        </span>
        <Heading className="text-[1.0625rem] leading-snug font-semibold tracking-tight">
          {available ? (
            <Link
              href={toolPath(tool.slug)}
              className="text-foreground no-underline hover:no-underline focus-visible:outline-none after:absolute after:inset-0 after:rounded-md"
            >
              {tool.name}
            </Link>
          ) : (
            tool.name
          )}
        </Heading>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
      {available ? null : (
        <span className="self-start rounded-sm border border-border px-1.5 py-0.5 font-mono text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
          Coming soon
        </span>
      )}
    </li>
  );
}

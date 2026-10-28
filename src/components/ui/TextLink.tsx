import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type TextLinkProps = ComponentProps<typeof Link> & {
  /** "muted" for secondary links such as footers and metadata. */
  tone?: "accent" | "muted";
};

/** Inline link. Plain `<a>` and `<Link>` elements in content get the same look from base styles. */
export function TextLink({ tone = "accent", className, ...props }: TextLinkProps) {
  return (
    <Link
      className={cn(tone === "muted" && "text-muted-foreground hover:text-foreground", className)}
      {...props}
    />
  );
}

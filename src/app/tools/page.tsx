import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoryList } from "@/components/tools/CategoryList";
import { ToolDirectory, ToolDirectoryFromUrl } from "@/components/tools/ToolDirectory";
import { Container } from "@/components/ui/Container";
import { categories } from "@/content/categories";
import { tools } from "@/content/tools";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "All Developer Tools",
  description: `Browse all ${tools.length} free developer tools: formatters, encoders and decoders, data converters, generators, text utilities, hashing, regex testing and diff checking.`,
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <Container size="wide" className="flex flex-col gap-10 py-10 sm:py-14">
      <PageHeader
        title="All developer tools"
        description="Every tool on the site, with filters to narrow the list by category."
      />

      {/* The fallback is the unfiltered list, so the prerendered HTML lists every tool. */}
      <Suspense fallback={<ToolDirectory tools={tools} categories={categories} syncUrl />}>
        <ToolDirectoryFromUrl tools={tools} categories={categories} syncUrl />
      </Suspense>

      <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
        <h2 id="categories-heading" className="text-xl font-semibold tracking-tight">
          Categories
        </h2>
        <CategoryList categories={categories} />
      </section>
    </Container>
  );
}

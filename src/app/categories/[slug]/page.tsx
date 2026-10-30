import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoryList } from "@/components/tools/CategoryList";
import { ToolGrid } from "@/components/tools/ToolGrid";
import { Container } from "@/components/ui/Container";
import { FreeAccessNote } from "@/components/ui/FreeAccess";
import { categories, categoryPath, getCategoryBySlug, toolsInCategory } from "@/content/categories";
import { pageMetadata } from "@/lib/metadata";

// Only categories with tools get a page; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const category = getCategoryBySlug((await params).slug);
  if (!category) return {};
  const free = `${category.description} Free online ${category.name.toLowerCase()}`;
  const withNote = `${free}, no signup required.`;
  return pageMetadata({
    title: category.name,
    // The note is left out where it would push the description past a search snippet.
    description: withNote.length <= 160 ? withNote : `${free}.`,
    path: categoryPath(category.slug),
    socialDescription: withNote,
  });
}

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const category = getCategoryBySlug((await params).slug);
  if (!category) notFound();

  const categoryTools = toolsInCategory(category.slug);
  const otherCategories = categories.filter((c) => c.slug !== category.slug);

  return (
    <Container size="wide" className="flex flex-col gap-12 py-10 sm:py-14">
      <div className="flex flex-col gap-4">
        <PageHeader title={category.name} description={category.intro} />
        <FreeAccessNote>
          <span className="font-medium text-foreground">Every tool in this category is free.</span> No signup
          required — no account, subscription or payment.
        </FreeAccessNote>
      </div>

      <section aria-labelledby="tools-heading" className="flex flex-col gap-4">
        <h2 id="tools-heading" className="text-xl font-semibold tracking-tight">
          {categoryTools.length} {categoryTools.length === 1 ? "tool" : "tools"} in this category
        </h2>
        <ToolGrid tools={categoryTools} />
      </section>

      {otherCategories.length > 0 ? (
        <section aria-labelledby="other-heading" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="other-heading" className="text-xl font-semibold tracking-tight">
              Other categories
            </h2>
            <Link href="/tools" className="text-sm">
              View all tools
            </Link>
          </div>
          <CategoryList categories={otherCategories} />
        </section>
      ) : null}
    </Container>
  );
}

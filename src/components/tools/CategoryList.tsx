import Link from "next/link";
import { categoryPath, toolsInCategory } from "@/content/categories";
import type { CategoryDefinition } from "@/types/tool";

type CategoryListProps = {
  categories: CategoryDefinition[];
  headingLevel?: "h2" | "h3";
};

/** Categories with their description and tool count, linking to each category page. */
export function CategoryList({ categories, headingLevel = "h3" }: CategoryListProps) {
  const Heading = headingLevel;

  return (
    <ul className="grid border-b border-border sm:grid-cols-2 sm:gap-x-8">
      {categories.map((category) => {
        const count = toolsInCategory(category.slug).length;
        return (
          <li key={category.slug} className="group relative flex flex-col gap-1 border-t border-border py-4">
            <Heading className="text-base font-medium">
              <Link
                href={categoryPath(category.slug)}
                className="text-foreground no-underline group-hover:text-accent group-hover:underline after:absolute after:inset-0"
              >
                {category.name}
              </Link>
            </Heading>
            <p className="text-sm text-muted-foreground">{category.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {count} {count === 1 ? "tool" : "tools"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

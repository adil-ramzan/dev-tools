import { Container } from "@/components/ui/Container";
import { TextLink } from "@/components/ui/TextLink";
import { footerNav, siteConfig, type NavItem } from "@/config/site";
import { categories, categoryPath } from "@/content/categories";

const categoryNav: NavItem[] = categories.map((category) => ({
  label: category.name,
  href: categoryPath(category.slug),
}));

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <Container size="wide" className="flex flex-col gap-8 py-10 text-sm sm:flex-row sm:justify-between">
        <p className="max-w-xs text-muted-foreground">
          <span className="font-medium text-foreground">{siteConfig.name}</span>
          <span aria-hidden="true"> · </span>
          {siteConfig.tagline}
        </p>
        <div className="flex flex-wrap gap-x-16 gap-y-8">
          <FooterNavGroup label="Site" items={footerNav} />
          <FooterNavGroup label="Categories" items={categoryNav} />
        </div>
      </Container>
    </footer>
  );
}

function FooterNavGroup({ label, items }: { label: string; items: NavItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className="flex flex-col gap-3">
      <h2 className="font-medium text-foreground">{label}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <TextLink href={item.href} tone="muted">
              {item.label}
            </TextLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

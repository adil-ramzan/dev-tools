import Link from "next/link";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Container } from "@/components/ui/Container";
import { mainNav, siteConfig } from "@/config/site";

export function SiteHeader() {
  const hasNav = mainNav.length > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <Container size="wide" className="flex h-(--header-height) items-center gap-4">
        <Link
          href="/"
          className="mr-auto flex items-center gap-2.5 font-semibold tracking-tight text-foreground no-underline hover:no-underline md:mr-4"
        >
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <rect width="32" height="32" rx="6" className="fill-foreground" />
            <path
              d="M12 10l-6 6 6 6M20 10l6 6-6 6"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-background"
            />
          </svg>
          {siteConfig.name}
        </Link>
        {hasNav ? <DesktopNav items={mainNav} /> : null}
        <div className="flex items-center gap-1 md:ml-auto">
          <div className="md:mr-2">
            <HeaderSearch />
          </div>
          <ThemeToggle />
          {hasNav ? <MobileNav items={mainNav} /> : null}
        </div>
      </Container>
    </header>
  );
}

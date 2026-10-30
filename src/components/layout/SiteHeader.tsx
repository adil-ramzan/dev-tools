import Link from "next/link";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FreeBadge } from "@/components/ui/FreeAccess";
import { mainNav, siteConfig } from "@/config/site";

export function SiteHeader() {
  const hasNav = mainNav.length > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      {/* Full width rather than a Container, so the header spans the screen on wide displays. */}
      <div className="flex h-(--header-height) w-full items-center gap-4 px-gutter lg:px-6">
        {/* The badge sits beside the logo link, not inside it, so the link's name stays the site name. */}
        <div className="mr-auto flex shrink-0 items-center gap-2 md:mr-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight text-foreground no-underline hover:no-underline"
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
          {/* Shortened where the search and navigation leave little room, and hidden on the narrowest phones. */}
          <FreeBadge className="max-[359px]:hidden">
            <span className="sm:hidden md:inline lg:hidden">Free</span>
            <span className="hidden sm:inline md:hidden lg:inline">100% Free</span>
          </FreeBadge>
        </div>
        {hasNav ? <DesktopNav items={mainNav} /> : null}
        <div className="flex items-center gap-1 md:ml-auto">
          {/* Wide screens only; the mobile menu carries the same message. */}
          <p className="mr-3 hidden text-xs whitespace-nowrap text-muted-foreground xl:block">No signup required</p>
          <div className="md:mr-2">
            <HeaderSearch />
          </div>
          <ThemeToggle />
          {hasNav ? <MobileNav items={mainNav} /> : null}
        </div>
      </div>
    </header>
  );
}

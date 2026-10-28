"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { buttonClassName } from "@/components/ui/Button";
import type { NavItem } from "@/config/site";
import { cn } from "@/lib/cn";
import { isNavItemActive } from "@/lib/nav";

// Matches Tailwind's `md` breakpoint, where DesktopNav takes over.
const DESKTOP_QUERY = "(width >= 48rem)";

/**
 * Disclosure-style menu for small screens: a toggle button controlling a panel
 * below the header. Closes on Escape (returning focus to the toggle), on
 * navigation, and when the viewport widens to the desktop layout.
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // Remember which page the menu was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      toggleRef.current?.focus();
    }
    const desktop = window.matchMedia(DESKTOP_QUERY);
    function onDesktopChange() {
      if (desktop.matches) setOpenOn(null);
    }

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktopChange);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktopChange);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        className={buttonClassName({ variant: "ghost", size: "icon" })}
        onClick={() => setOpenOn(open ? null : pathname)}
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      <nav
        id={panelId}
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-background"
      >
        <ul className="mx-auto flex max-w-wide flex-col px-gutter py-2">
          {items.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpenOn(null)}
                  className={cn(
                    "flex h-11 items-center border-l-2 pl-3 no-underline hover:no-underline",
                    active
                      ? "border-accent font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

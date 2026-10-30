"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/site";
import { cn } from "@/lib/cn";
import { isNavItemActive } from "@/lib/nav";

export function DesktopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1 text-sm">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-sm px-3 whitespace-nowrap no-underline hover:bg-subtle hover:no-underline",
                  active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

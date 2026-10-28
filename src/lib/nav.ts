import type { NavItem } from "@/config/site";

/** True when `href` is the current page or a parent section of it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True when the item's own path or any of its `match` paths is active. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  return [item.href, ...(item.match ?? [])].some((href) => isActivePath(pathname, href));
}

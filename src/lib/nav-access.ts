import type { NavItem } from "@/lib/nav-config";

export function normalizeNavPath(path: string): string {
  const t = path.trim();
  if (!t) return "/";
  let s = t.startsWith("/") ? t : `/${t}`;
  while (s.length > 1 && s.endsWith("/")) {
    s = s.slice(0, -1);
  }
  return s;
}

/** Paths that are always reachable for signed-in users in the shell. */
const ALWAYS_ALLOW = new Set(["/profile", "/logout"].map(normalizeNavPath));

export function isHrefAllowedForNav(href: string, allowed: Set<string>): boolean {
  const h = normalizeNavPath(href);
  if (ALWAYS_ALLOW.has(h)) return true;

  if (allowed.has(h)) return true;

  if (h === "/dashboard" || h === "/") {
    if (allowed.has("/dashboard") || allowed.has("/")) return true;
    for (const p of allowed) {
      const pn = normalizeNavPath(p);
      if (pn === "/dashboard" || pn === "/" || pn.startsWith("/dashboard/")) return true;
    }
    return false;
  }

  for (const p of allowed) {
    const pn = normalizeNavPath(p);
    if (pn === h) return true;
    if (h.startsWith(pn + "/")) return true;
    if (pn.startsWith(h + "/")) return true;
  }
  return false;
}

export function filterNavItemsByPermissions(items: NavItem[], allowed: Set<string>): NavItem[] {
  return items
    .map((item) => {
      const children = item.children?.filter((c) => isHrefAllowedForNav(c.href, allowed));
      const selfOk = isHrefAllowedForNav(item.href, allowed);
      const hasVisibleChildren = Boolean(children?.length);
      if (!selfOk && !hasVisibleChildren) return null;
      return {
        ...item,
        ...(hasVisibleChildren ? { children } : {}),
      };
    })
    .filter((x): x is NavItem => x !== null);
}

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
const ALWAYS_ALLOW = new Set(
  ["/logout", "/billing", "/onboarding/plan", "/profile"].map(normalizeNavPath),
);

export function isHrefAllowedForNav(href: string, allowed: Set<string>): boolean {
  const h = normalizeNavPath(href);
  if (ALWAYS_ALLOW.has(h)) return true;
  for (const allowedPath of ALWAYS_ALLOW) {
    if (h === allowedPath || h.startsWith(`${allowedPath}/`)) return true;
  }

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

/** When a route is forbidden, send the user to the first usable menu path they have. */
export function redirectPathWhenMenuForbidden(allowed: Set<string>): string {
  const billing = normalizeNavPath("/billing");
  for (const p of allowed) {
    if (normalizeNavPath(p) === billing) return "/billing";
  }

  if (isHrefAllowedForNav("/dashboard", allowed)) {
    return "/dashboard";
  }

  const logout = normalizeNavPath("/logout");
  for (const p of allowed) {
    if (normalizeNavPath(p) === logout) continue;
    return normalizeNavPath(p);
  }

  return "/logout";
}

export function filterNavItemsByPermissions(
  items: NavItem[],
  allowed: Set<string>,
  isAdmin = false,
): NavItem[] {
  return items
    .map((item) => {
      if (item.requiresAdmin && !isAdmin) return null;
      const children = item.children?.filter(
        (c) => (!c.requiresAdmin || isAdmin) && isHrefAllowedForNav(c.href, allowed),
      );
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

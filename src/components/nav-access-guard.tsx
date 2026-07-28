"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isHrefAllowedForNav, redirectPathWhenMenuForbidden } from "@/lib/nav-access";

type NavAccessGuardProps = {
  allowedNavPaths: string[] | null;
  enabled: boolean;
};

function isBillingLockoutPath(pathname: string): boolean {
  return (
    pathname === "/billing" ||
    pathname.startsWith("/billing/") ||
    pathname === "/onboarding/plan" ||
    pathname.startsWith("/onboarding/plan/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/platform" ||
    pathname.startsWith("/platform/") ||
    pathname === "/billing-admin" ||
    pathname.startsWith("/billing-admin/") ||
    pathname === "/logout" ||
    pathname.startsWith("/logout/")
  );
}

export function NavAccessGuard({ allowedNavPaths, enabled }: NavAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled || allowedNavPaths === null) return;
    // Never bounce users off billing / onboarding lockout screens.
    if (isBillingLockoutPath(pathname)) return;

    const allowed = new Set(allowedNavPaths);
    if (isHrefAllowedForNav(pathname, allowed)) return;
    router.replace(redirectPathWhenMenuForbidden(allowed));
  }, [pathname, allowedNavPaths, enabled, router]);

  return null;
}

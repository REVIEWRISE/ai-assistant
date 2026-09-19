"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type BillingAccessGuardProps = {
  billingStatus: string | null;
  enabled: boolean;
  isAdmin?: boolean;
};

function isBypassPath(pathname: string): boolean {
  return (
    pathname === "/onboarding/plan" ||
    pathname.startsWith("/onboarding/plan/") ||
    pathname === "/billing" ||
    pathname.startsWith("/billing/") ||
    pathname === "/logout" ||
    pathname.startsWith("/logout/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/platform" ||
    pathname.startsWith("/platform/") ||
    pathname === "/billing-admin" ||
    pathname.startsWith("/billing-admin/")
  );
}

function isExpiredBypassPath(pathname: string): boolean {
  return (
    pathname === "/billing" ||
    pathname.startsWith("/billing/") ||
    pathname === "/logout" ||
    pathname.startsWith("/logout/")
  );
}

export function BillingAccessGuard({
  billingStatus,
  enabled,
  isAdmin = false,
}: BillingAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !billingStatus || isAdmin) return;

    if (billingStatus === "expired") {
      if (!isExpiredBypassPath(pathname)) {
        router.replace("/billing/expired");
      }
      return;
    }

    if (isBypassPath(pathname)) return;

    if (billingStatus === "needs_plan") {
      router.replace("/onboarding/plan");
    }
  }, [billingStatus, enabled, isAdmin, pathname, router]);

  return null;
}

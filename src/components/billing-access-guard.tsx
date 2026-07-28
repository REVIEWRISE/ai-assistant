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

export function BillingAccessGuard({
  billingStatus,
  enabled,
  isAdmin = false,
}: BillingAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !billingStatus || isAdmin) return;
    if (isBypassPath(pathname)) return;

    if (billingStatus === "needs_plan") {
      router.replace("/onboarding/plan");
      return;
    }
    if (billingStatus === "expired") {
      router.replace("/billing?error=trial_expired");
    }
  }, [billingStatus, enabled, isAdmin, pathname, router]);

  return null;
}

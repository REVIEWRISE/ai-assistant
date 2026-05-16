"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isHrefAllowedForNav, redirectPathWhenMenuForbidden } from "@/lib/nav-access";

type NavAccessGuardProps = {
  allowedNavPaths: string[] | null;
  enabled: boolean;
};

export function NavAccessGuard({ allowedNavPaths, enabled }: NavAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled || allowedNavPaths === null) return;
    const allowed = new Set(allowedNavPaths);
    if (isHrefAllowedForNav(pathname, allowed)) return;
    router.replace(redirectPathWhenMenuForbidden(allowed));
  }, [pathname, allowedNavPaths, enabled, router]);

  return null;
}

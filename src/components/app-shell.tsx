"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppFooter } from "@/components/app-footer";
import { AppSidebar } from "@/components/app-sidebar";
import { TopHeader } from "@/components/top-header";
import { NavAccessGuard } from "@/components/nav-access-guard";
import { BillingAccessGuard } from "@/components/billing-access-guard";
import { APP_NAV_ITEMS } from "@/lib/nav-config";
import { filterNavItemsByPermissions, isHrefAllowedForNav } from "@/lib/nav-access";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/" || pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuStateReady, setMenuStateReady] = useState(false);
  const [submenuTick, setSubmenuTick] = useState(0);
  const [profileName, setProfileName] = useState("User");
  const [profileEmail, setProfileEmail] = useState("user@example.com");
  const [profileRole, setProfileRole] = useState("Member");
  const [profileOrg, setProfileOrg] = useState("Workspace");
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [switchingOrganization, setSwitchingOrganization] = useState(false);
  const [allowedNavPaths, setAllowedNavPaths] = useState<string[] | null>(null);
  const [billingStatus, setBillingStatus] = useState<string | null>(null);

  const authRoute = pathname === "/login" || pathname === "/register" || pathname === "/logout";
  const isPublicLanding = pathname === "/";
  const isEmbedRoute = pathname.startsWith("/embed");
  const isOnboardingPlan =
    pathname === "/onboarding/plan" || pathname.startsWith("/onboarding/plan/");
  const isBillingExpiredWall =
    pathname === "/billing/expired" || pathname.startsWith("/billing/expired/");
  const isBillingCheckoutReturn =
    pathname === "/billing/success" ||
    pathname.startsWith("/billing/success/") ||
    pathname === "/billing/canceled" ||
    pathname.startsWith("/billing/canceled/");
  const isChromeFreeBillingGate =
    isOnboardingPlan || isBillingExpiredWall || isBillingCheckoutReturn;

  const visibleNavItems = useMemo(() => {
    const set = allowedNavPaths === null ? new Set<string>() : new Set(allowedNavPaths);
    return filterNavItemsByPermissions(APP_NAV_ITEMS, set, profileRole === "Admin");
  }, [allowedNavPaths, profileRole]);

  const showProfilePageLink = useMemo(() => {
    if (allowedNavPaths === null) return false;
    return isHrefAllowedForNav("/profile", new Set(allowedNavPaths));
  }, [allowedNavPaths]);

  const navPermissionsReady = allowedNavPaths !== null;
  const hasNoMenuAccess = navPermissionsReady && visibleNavItems.length === 0;

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) {
          if (isMounted) setAllowedNavPaths([]);
          return;
        }
        const data = (await res.json()) as {
          user?: {
            fullName?: string;
            email?: string;
            role?: string;
            organization?: string;
            organizationId?: string | null;
          };
          organizations?: Array<{ id: string; name: string }>;
          allowedNavPaths?: string[];
          billing?: { billingStatus?: string } | null;
        };
        if (!isMounted || !data.user) return;
        if (data.user.fullName) setProfileName(data.user.fullName);
        if (data.user.email) setProfileEmail(data.user.email);
        if (data.user.role) setProfileRole(data.user.role);
        if (data.user.organization) setProfileOrg(data.user.organization);
        if (typeof data.user.organizationId !== "undefined") {
          setActiveOrganizationId(data.user.organizationId ?? null);
        }
        setOrganizations(Array.isArray(data.organizations) ? data.organizations : []);
        setAllowedNavPaths(Array.isArray(data.allowedNavPaths) ? data.allowedNavPaths : []);
        setBillingStatus(data.billing?.billingStatus ?? null);
      } catch {
        if (isMounted) setAllowedNavPaths([]);
      }
    }

    if (!authRoute && !isPublicLanding && !isEmbedRoute) {
      void loadSession();
    } else {
      setTimeout(() => {
        if (isMounted) setAllowedNavPaths(null);
      }, 0);
    }

    return () => {
      isMounted = false;
    };
  }, [authRoute, isPublicLanding, isEmbedRoute, isChromeFreeBillingGate, pathname, searchKey]);

  const handleSwitchOrganization = async (organizationId: string) => {
    if (!organizationId || organizationId === activeOrganizationId || switchingOrganization) return;
    setSwitchingOrganization(true);
    try {
      const res = await fetch("/api/me/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) return;
      const nextOrg = organizations.find((org) => org.id === organizationId);
      if (nextOrg) setProfileOrg(nextOrg.name);
      setActiveOrganizationId(organizationId);
      window.location.reload();
    } finally {
      setSwitchingOrganization(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => setMenuStateReady(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  const setSubmenuOpen = useCallback((parentHref: string, open: boolean) => {
    APP_NAV_ITEMS.forEach((navItem) => {
      if (!navItem.children?.length) return;
      sessionStorage.setItem(`submenu:${navItem.href}`, navItem.href === parentHref && open ? "1" : "0");
    });
    setSubmenuTick((prev) => prev + 1);
  }, []);

  const closeAllSubmenus = useCallback(() => {
    APP_NAV_ITEMS.forEach((navItem) => {
      if (!navItem.children?.length) return;
      sessionStorage.setItem(`submenu:${navItem.href}`, "0");
    });
    setSubmenuTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!menuStateReady) return;
    let opened = false;
    for (const item of visibleNavItems) {
      if (!item.children?.length) continue;
      if (item.children.some((child) => isActive(pathname, child.href))) {
        setSubmenuOpen(item.href, true);
        opened = true;
        break;
      }
    }
    if (!opened) return;
  }, [pathname, menuStateReady, visibleNavItems, setSubmenuOpen]);

  if (authRoute) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }

  if (isChromeFreeBillingGate) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <BillingAccessGuard
          billingStatus={billingStatus}
          enabled={billingStatus !== null}
          isAdmin={profileRole === "Admin"}
        />
        <main className="min-h-screen overflow-y-auto">{children}</main>
      </div>
    );
  }

  if (isPublicLanding || isEmbedRoute) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell relative h-dvh overflow-hidden">
      <div className="app-shell-mesh pointer-events-none absolute inset-0" aria-hidden />
      <div className="app-shell-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <NavAccessGuard allowedNavPaths={allowedNavPaths} enabled={allowedNavPaths !== null} />
      <BillingAccessGuard
        billingStatus={billingStatus}
        enabled={billingStatus !== null}
        isAdmin={profileRole === "Admin"}
      />
      <div className="relative flex h-dvh w-full">
        <AppSidebar
          pathname={pathname}
          items={visibleNavItems}
          ready={navPermissionsReady}
          hasNoMenuAccess={hasNoMenuAccess}
          menuStateReady={menuStateReady}
          submenuTick={submenuTick}
          onToggleSubmenu={setSubmenuOpen}
          onCloseSubmenus={closeAllSubmenus}
        />

        <div className="vr-app-surface min-w-0 flex h-dvh flex-1 flex-col overflow-hidden rounded-none border-0">
          <TopHeader
            pathname={pathname}
            navItems={visibleNavItems.map((item) => ({
              href: item.href,
              shortLabel: item.shortLabel,
            }))}
            showProfilePageLink={showProfilePageLink}
            profileOpen={profileOpen}
            onToggleProfile={() => setProfileOpen((prev) => !prev)}
            onCloseProfile={() => setProfileOpen(false)}
            profileAvatar={
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-[var(--color-primary-fg)]">
                {profileName
                  .split(" ")
                  .map((part: string) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "US"}
              </span>
            }
            profileName={profileName}
            profileEmail={profileEmail}
            profileRole={profileRole}
            profileOrg={profileOrg}
            organizations={organizations}
            activeOrganizationId={activeOrganizationId}
            onSwitchOrganization={handleSwitchOrganization}
            switchingOrganization={switchingOrganization}
          />
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin] lg:p-5">{children}</main>
          <AppFooter organization={profileOrg} role={profileRole} />
        </div>
      </div>
    </div>
  );
}

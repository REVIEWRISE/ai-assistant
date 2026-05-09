"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TopHeader } from "@/components/top-header";
import { NavAccessGuard } from "@/components/nav-access-guard";
import { APP_NAV_ITEMS, type NavItem } from "@/lib/nav-config";
import { filterNavItemsByPermissions } from "@/lib/nav-access";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/" || pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuStateReady, setMenuStateReady] = useState(false);
  const [submenuTick, setSubmenuTick] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileName, setProfileName] = useState("User");
  const [profileEmail, setProfileEmail] = useState("user@example.com");
  const [profileRole, setProfileRole] = useState("Member");
  const [profileOrg, setProfileOrg] = useState("Workspace");
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [switchingOrganization, setSwitchingOrganization] = useState(false);
  const [allowedNavPaths, setAllowedNavPaths] = useState<string[] | null>(null);

  const authRoute = pathname === "/login" || pathname === "/register" || pathname === "/logout";
  const isPublicLanding = pathname === "/";
  const isEmbedRoute = pathname.startsWith("/embed");

  const visibleNavItems = useMemo(() => {
    const set = allowedNavPaths === null ? new Set<string>() : new Set(allowedNavPaths);
    return filterNavItemsByPermissions(APP_NAV_ITEMS, set);
  }, [allowedNavPaths]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const res = await fetch("/api/me");
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
      } catch {
        if (isMounted) setAllowedNavPaths([]);
      }
    }

    if (!authRoute && !isPublicLanding && !isEmbedRoute) {
      void loadSession();
    } else {
      setAllowedNavPaths(null);
    }

    return () => {
      isMounted = false;
    };
  }, [authRoute, isPublicLanding, isEmbedRoute]);

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

  if (authRoute) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-zinc-900">
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }

  if (isPublicLanding || isEmbedRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f7f4ed,_#edf2f4_50%,_#f4f6f8)] text-slate-900">
      <NavAccessGuard allowedNavPaths={allowedNavPaths} enabled={allowedNavPaths !== null} />
      <div className="flex w-full gap-4 px-4 py-4 lg:gap-6 lg:px-6">
        <aside
          className={`hidden shrink-0 rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur transition-all lg:block ${sidebarCollapsed ? "w-20 p-3" : "w-68 p-5"
            }`}
        >
          <div className="mb-6 flex items-start justify-between">
            <div className={sidebarCollapsed ? "hidden" : ""}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                AI Assistant
              </p>
              <h1 className="mt-1 text-xl font-semibold">AI Assistant</h1>
              <p className="mt-2 text-sm text-slate-600">
                Appointment, reviews, and lead operations in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`group flex h-9 w-9 items-center justify-center rounded-xl border transition ${sidebarCollapsed
                  ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  : "border-white/15 bg-white/10 text-slate-600 hover:bg-slate-100"
                }`}
            >
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute h-0.5 w-4 rounded-full bg-slate-600 transition" />
                <span className="absolute h-0.5 w-4 translate-y-1.5 rounded-full bg-slate-600 transition" />
                <span className="absolute h-0.5 w-4 -translate-y-1.5 rounded-full bg-slate-600 transition" />
              </span>
            </button>
          </div>
          <div className={`mb-2 px-1 ${sidebarCollapsed ? "hidden" : ""}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workspaces
            </p>
          </div>
          <nav
            className={`space-y-2 transition-opacity ${allowedNavPaths === null ? "pointer-events-none opacity-40" : "opacity-100"}`}
            aria-busy={allowedNavPaths === null}
          >
            {visibleNavItems.map((item: NavItem) => {
              const active = isActive(pathname, item.href);
              const hasChildren = Boolean(item.children?.length);
              const submenuOpenKey = `submenu:${item.href}`;
              const isSubmenuOpen =
                menuStateReady &&
                submenuTick >= 0 &&
                (sessionStorage.getItem(submenuOpenKey) ?? "0") !== "0";
              const showChildren = hasChildren && isSubmenuOpen;
              return (
                <div key={item.href} className="space-y-1">
                  <div
                    className={`group flex items-center gap-3 rounded-2xl py-2.5 text-sm font-medium transition ${sidebarCollapsed ? "px-0 justify-center" : "px-3"
                      } ${active
                        ? "border border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (!hasChildren) {
                          APP_NAV_ITEMS.forEach((navItem) => {
                            if (!navItem.children?.length) return;
                            sessionStorage.setItem(`submenu:${navItem.href}`, "0");
                          });
                          setSubmenuTick((prev) => prev + 1);
                        }
                      }}
                      className={`flex items-center gap-3 ${sidebarCollapsed ? "flex-1 justify-center" : "flex-1"
                        }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${active
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700 group-hover:bg-slate-300"
                          }`}
                      >
                        {item.icon}
                      </span>
                      <span className={sidebarCollapsed ? "sr-only" : "leading-none"}>
                        {item.label}
                      </span>
                    </Link>
                    {hasChildren && !sidebarCollapsed ? (
                      <button
                        type="button"
                        aria-label={isSubmenuOpen ? "Collapse submenu" : "Expand submenu"}
                        onClick={() => {
                          const nextOpen = !isSubmenuOpen;
                          APP_NAV_ITEMS.forEach((navItem) => {
                            if (!navItem.children?.length) return;
                            const nextValue =
                              navItem.href === item.href && nextOpen ? "1" : "0";
                            sessionStorage.setItem(`submenu:${navItem.href}`, nextValue);
                          });
                          setSubmenuTick((prev) => prev + 1);
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${active
                          ? "text-white/80 hover:bg-white/10"
                          : "text-slate-500 hover:bg-slate-200"
                          }`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className={`h-4 w-4 transition ${isSubmenuOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                  {showChildren && !sidebarCollapsed ? (
                    <div className="ml-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-2">
                      {item.children?.map((child) => {
                        const childActive = isActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${childActive
                                ? "bg-slate-900 text-white shadow-sm"
                                : "text-slate-600 hover:bg-white"
                              }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${childActive ? "bg-white" : "bg-slate-300"
                                }`}
                            />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col rounded-3xl border border-slate-200/70 bg-white/85 shadow-sm backdrop-blur">
          <TopHeader
            pathname={pathname}
            navItems={visibleNavItems.map((item) => ({
              href: item.href,
              shortLabel: item.shortLabel,
            }))}
            profileOpen={profileOpen}
            onToggleProfile={() => setProfileOpen((prev) => !prev)}
            onCloseProfile={() => setProfileOpen(false)}
            profileAvatar={
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
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
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

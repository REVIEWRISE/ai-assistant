"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LandingLogoMark } from "@/components/landing/landing-logo-mark";
import { PRODUCT_NAME } from "@/lib/brand";
import type { NavItem } from "@/lib/nav-config";

const GROUPS = [
  { label: "Overview", paths: ["/dashboard"] },
  { label: "Customer operations", paths: ["/appointments", "/reviews", "/voice-agent"] },
  { label: "Billing", paths: ["/subscription"] },
  { label: "Administration", paths: ["/users", "/settings/access", "/billing-admin", "/platform"], admin: true },
  { label: "Account", paths: ["/support", "/profile"] },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLoading() {
  return (
    <div className="space-y-3" aria-label="Loading workspace navigation">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <span className="size-9 animate-pulse rounded-xl bg-white/[0.07]" />
          <span className="h-3.5 flex-1 animate-pulse rounded bg-white/[0.07]" />
        </div>
      ))}
    </div>
  );
}

function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 rounded-full">
      <LandingLogoMark className="h-7 w-auto shrink-0 text-white" />
      <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-white">{PRODUCT_NAME}</span>
    </Link>
  );
}

function SidebarNav({
  pathname,
  items,
  ready,
  hasNoMenuAccess,
  menuStateReady,
  submenuTick,
  onToggleSubmenu,
  onNavigate,
}: {
  pathname: string;
  items: NavItem[];
  ready: boolean;
  hasNoMenuAccess: boolean;
  menuStateReady: boolean;
  submenuTick: number;
  onToggleSubmenu: (href: string, open: boolean) => void;
  onNavigate: () => void;
}) {
  if (!ready) return <SidebarLoading />;

  if (hasNoMenuAccess) {
    return (
      <div className="mx-2 rounded-2xl border border-white/15 bg-white/[0.06] p-4">
        <p className="text-sm font-semibold text-white">No menu access</p>
        <p className="mt-1.5 text-xs leading-5 text-white/85">
          Ask an administrator to assign workspace menus to your role.
        </p>
      </div>
    );
  }

  return (
    <nav aria-label="Workspace navigation" className="space-y-5">
      {GROUPS.map((group) => {
        const groupItems = items.filter((item) => (group.paths as readonly string[]).includes(item.href));
        if (groupItems.length === 0) return null;

        return (
          <section key={group.label}>
            <div className="mb-2 px-3">
              <p className="text-xs font-medium text-white/75">{group.label}</p>
            </div>

            <div className="space-y-1.5">
              {groupItems.map((item) => {
                const hasChildren = Boolean(item.children?.length) && !item.childrenAsTabs;
                const childActive = item.children?.some((child) => isActive(pathname, child.href)) ?? false;
                const active = hasChildren ? childActive : isActive(pathname, item.href);
                const submenuOpen =
                  hasChildren &&
                  menuStateReady &&
                  submenuTick >= 0 &&
                  (sessionStorage.getItem(`submenu:${item.href}`) ?? "0") !== "0";
                const rowClass = `group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-white text-[#1d3a96] shadow-[0_8px_24px_-12px_rgba(8,20,66,0.55)] [[data-theme=dark]_&]:bg-[var(--color-primary)] [[data-theme=dark]_&]:text-white"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`;
                const iconClass = `flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 [&_svg]:size-4 ${
                  active
                    ? "bg-[#2a52be] text-white [[data-theme=dark]_&]:bg-white/15"
                    : "bg-white/10 text-white/85 group-hover:bg-white/15 group-hover:text-white"
                }`;

                return (
                  <div key={item.href}>
                    {hasChildren ? (
                      <button
                        type="button"
                        aria-expanded={submenuOpen}
                        onClick={() => onToggleSubmenu(item.href, !submenuOpen)}
                        className={rowClass}
                      >
                        <span className={iconClass}>{item.icon}</span>
                        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                        <svg
                          viewBox="0 0 24 24"
                          className={`size-4 shrink-0 transition ${submenuOpen ? "rotate-180" : ""} ${active ? "text-[#1d3a96] [[data-theme=dark]_&]:text-white" : "text-white/75"}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        prefetch
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={rowClass}
                      >
                        <span className={iconClass}>{item.icon}</span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    )}

                    {submenuOpen ? (
                      <div className="ml-5 mt-1.5 space-y-0.5 border-l border-white/25 pl-3">
                        {item.children?.map((child) => {
                          const activeChild = isActive(pathname, child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              prefetch
                              onClick={onNavigate}
                              aria-current={activeChild ? "page" : undefined}
                              className={`relative flex items-center rounded-lg py-2 pl-3 pr-2 text-[12px] font-medium transition ${
                                activeChild
                                  ? "bg-white/15 text-white before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-white"
                                  : "text-white/80 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span className="truncate">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
}

function SidebarPanel({
  pathname,
  items,
  ready,
  hasNoMenuAccess,
  menuStateReady,
  submenuTick,
  onToggleSubmenu,
  onNavigate,
  className,
  headerAccessory,
}: {
  pathname: string;
  items: NavItem[];
  ready: boolean;
  hasNoMenuAccess: boolean;
  menuStateReady: boolean;
  submenuTick: number;
  onToggleSubmenu: (href: string, open: boolean) => void;
  onNavigate: () => void;
  className?: string;
  headerAccessory?: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="relative border-b border-white/15 px-5 pb-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <SidebarBrand />
          {headerAccessory}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SidebarNav
          pathname={pathname}
          items={items}
          ready={ready}
          hasNoMenuAccess={hasNoMenuAccess}
          menuStateReady={menuStateReady}
          submenuTick={submenuTick}
          onToggleSubmenu={onToggleSubmenu}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

function MobileNavSheet({
  pathname,
  items,
  ready,
  hasNoMenuAccess,
  menuStateReady,
  submenuTick,
  onToggleSubmenu,
  onCloseSubmenus,
  onClose,
}: {
  pathname: string;
  items: NavItem[];
  ready: boolean;
  hasNoMenuAccess: boolean;
  menuStateReady: boolean;
  submenuTick: number;
  onToggleSubmenu: (href: string, open: boolean) => void;
  onCloseSubmenus: () => void;
  onClose: () => void;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const navProps = {
    pathname,
    items,
    ready,
    hasNoMenuAccess,
    menuStateReady,
    submenuTick,
    onToggleSubmenu,
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex justify-start lg:hidden transition-colors duration-200 ${
        entered ? "bg-[var(--color-overlay)]" : "bg-transparent"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close navigation"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Workspace navigation"
        className={`relative flex h-full w-[min(100%,17.5rem)] flex-col overflow-hidden border-r border-white/10 vr-app-sidebar shadow-[8px_0_30px_-20px_rgba(0,0,0,0.65)] transition-transform duration-300 ease-out ${
          entered ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarPanel
          {...navProps}
          onNavigate={() => {
            onCloseSubmenus();
            onClose();
          }}
          className="relative flex h-full w-full flex-col overflow-hidden"
          headerAccessory={
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-lg leading-none text-white/85 transition hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              ×
            </button>
          }
        />
      </aside>
    </div>,
    document.body,
  );
}

export function AppSidebar({
  pathname,
  items,
  ready,
  hasNoMenuAccess,
  menuStateReady,
  submenuTick,
  onToggleSubmenu,
  onCloseSubmenus,
  mobileOpen = false,
  onMobileClose,
}: {
  pathname: string;
  items: NavItem[];
  ready: boolean;
  hasNoMenuAccess: boolean;
  menuStateReady: boolean;
  submenuTick: number;
  onToggleSubmenu: (href: string, open: boolean) => void;
  onCloseSubmenus: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <>
      <aside className="relative hidden h-dvh w-[17rem] shrink-0 overflow-hidden border-r border-white/10 vr-app-sidebar shadow-[8px_0_30px_-20px_rgba(0,0,0,0.65)] lg:flex lg:flex-col">
        <SidebarPanel
          pathname={pathname}
          items={items}
          ready={ready}
          hasNoMenuAccess={hasNoMenuAccess}
          menuStateReady={menuStateReady}
          submenuTick={submenuTick}
          onToggleSubmenu={onToggleSubmenu}
          onNavigate={onCloseSubmenus}
          className="relative flex h-full w-full flex-col overflow-hidden"
        />
      </aside>

      {mounted && mobileOpen ? (
        <MobileNavSheet
          pathname={pathname}
          items={items}
          ready={ready}
          hasNoMenuAccess={hasNoMenuAccess}
          menuStateReady={menuStateReady}
          submenuTick={submenuTick}
          onToggleSubmenu={onToggleSubmenu}
          onCloseSubmenus={onCloseSubmenus}
          onClose={() => onMobileClose?.()}
        />
      ) : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME, PRODUCT_NAME } from "@/lib/brand";
import type { NavItem } from "@/lib/nav-config";

const GROUPS = [
  { label: "Overview", paths: ["/dashboard"] },
  { label: "Customer operations", paths: ["/appointments", "/reviews", "/voice-agent"] },
  { label: "Billing", paths: ["/subscription"] },
  { label: "Administration", paths: ["/users", "/settings/access", "/billing-admin", "/platform"], admin: true },
  { label: "Account", paths: ["/profile"] },
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
    <BrandLogo
      href="/dashboard"
      size="sm"
      primary={BRAND_NAME}
      secondary={PRODUCT_NAME}
      className="text-white [&_p:first-child]:text-[10px] [&_p:first-child]:font-semibold [&_p:first-child]:uppercase [&_p:first-child]:tracking-[0.2em] [&_p:first-child]:text-neutral-400 [&_p:last-child]:text-sm [&_p:last-child]:font-semibold [&_p:last-child]:text-white"
    />
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
        <p className="mt-1.5 text-xs leading-5 text-neutral-400">
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
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-neutral-500">{group.label}</p>
            </div>

            <div className="space-y-1.5">
              {groupItems.map((item) => {
                const hasChildren = Boolean(item.children?.length);
                const childActive = item.children?.some((child) => isActive(pathname, child.href)) ?? false;
                const active = hasChildren ? childActive : isActive(pathname, item.href);
                const submenuOpen =
                  hasChildren &&
                  menuStateReady &&
                  submenuTick >= 0 &&
                  (sessionStorage.getItem(`submenu:${item.href}`) ?? "0") !== "0";
                const rowClass = `group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-white text-neutral-950 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]"
                    : "text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                }`;
                const iconClass = `flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 [&_svg]:size-4 ${
                  active
                    ? "bg-neutral-950 text-white"
                    : "bg-white/[0.05] text-neutral-500 group-hover:bg-white/[0.08] group-hover:text-neutral-200"
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
                          className={`size-4 shrink-0 text-neutral-500 transition ${submenuOpen ? "rotate-180" : ""} ${active ? "text-neutral-600" : ""}`}
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
                      <div className="ml-5 mt-1.5 space-y-0.5 border-l border-white/10 pl-3">
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
                                  ? "bg-white/[0.1] text-white before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-white"
                                  : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200"
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
      <div className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full bg-white/[0.07] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 -right-24 size-64 rounded-full bg-white/[0.04] blur-3xl" aria-hidden />

      <div className="relative border-b border-white/[0.07] px-5 pb-5 pt-5">
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
  const [entered, setEntered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onMobileClose?.();
    }

    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [mobileOpen, onMobileClose]);

  const navProps = {
    pathname,
    items,
    ready,
    hasNoMenuAccess,
    menuStateReady,
    submenuTick,
    onToggleSubmenu,
  };

  return (
    <>
      <aside className="relative hidden h-dvh w-[17rem] shrink-0 overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#0c0c0c_0%,#141414_48%,#0c0c0c_100%)] text-white shadow-[8px_0_30px_-20px_rgba(0,0,0,0.65)] lg:flex lg:flex-col">
        <SidebarPanel
          {...navProps}
          onNavigate={onCloseSubmenus}
          className="relative flex h-full w-full flex-col overflow-hidden"
        />
      </aside>

      {mounted && mobileOpen
        ? createPortal(
            <div
              className={`fixed inset-0 z-[60] flex justify-start lg:hidden transition-colors duration-200 ${
                entered ? "bg-[var(--color-overlay)]" : "bg-transparent"
              }`}
            >
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Close navigation"
                onClick={onMobileClose}
              />
              <aside
                role="dialog"
                aria-modal="true"
                aria-label="Workspace navigation"
                className={`relative flex h-full w-[min(100%,17.5rem)] flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#0c0c0c_0%,#141414_48%,#0c0c0c_100%)] text-white shadow-[8px_0_30px_-20px_rgba(0,0,0,0.65)] transition-transform duration-300 ease-out ${
                  entered ? "translate-x-0" : "-translate-x-full"
                }`}
              >
                <SidebarPanel
                  {...navProps}
                  onNavigate={() => {
                    onCloseSubmenus();
                    onMobileClose?.();
                  }}
                  className="relative flex h-full w-full flex-col overflow-hidden"
                  headerAccessory={
                    <button
                      type="button"
                      onClick={onMobileClose}
                      className="rounded-lg px-2 py-1 text-lg leading-none text-neutral-400 transition hover:bg-white/10 hover:text-white"
                      aria-label="Close navigation"
                    >
                      ×
                    </button>
                  }
                />
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

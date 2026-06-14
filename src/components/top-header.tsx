"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CustomSelect } from "@/components/custom-select";

type MobileNavItem = {
  href: string;
  shortLabel: string;
};

type HeaderCopy = {
  eyebrow: string;
  title: string;
};

const headerByRoute: Record<string, HeaderCopy> = {
  "/dashboard": {
    eyebrow: "Command Center",
    title: "AI Operations Dashboard",
  },
  "/appointments": {
    eyebrow: "Appointment Agent",
    title: "Appointment Modules",
  },
  "/appointments/overview": {
    eyebrow: "Appointment Agent",
    title: "Scheduling and Booking Operations",
  },
  "/appointments/organization": {
    eyebrow: "Appointment Agent",
    title: "Organization Setup",
  },
  "/appointments/knowledge-base": {
    eyebrow: "Appointment Agent",
    title: "Knowledge Base",
  },
  "/appointments/chatbot": {
    eyebrow: "Appointment Agent",
    title: "Configure chatbot",
  },
  "/reviews": {
    eyebrow: "Review Response",
    title: "Reputation and Reply Operations",
  },
  "/profile": {
    eyebrow: "Account",
    title: "Profile Settings",
  },
  "/settings/access": {
    eyebrow: "Access Control",
    title: "Menus and Permissions",
  },
  "/settings/access/roles": {
    eyebrow: "Access Control",
    title: "Roles",
  },
  "/settings/access/menus": {
    eyebrow: "Access Control",
    title: "Menus",
  },
  "/settings/access/permissions": {
    eyebrow: "Access Control",
    title: "Permissions",
  },
  "/platform": {
    eyebrow: "Platform Settings",
    title: "System Configuration",
  },
  "/platform/providers": {
    eyebrow: "Platform Settings",
    title: "Providers",
  },
  "/users": {
    eyebrow: "User Management",
    title: "Users",
  },
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/" || pathname === "/dashboard";
  }

  return pathname === href;
}

function getHeaderCopy(pathname: string): HeaderCopy {
  if (pathname === "/") {
    return headerByRoute["/dashboard"];
  }

  if (pathname.startsWith("/settings/access/roles")) {
    return headerByRoute["/settings/access/roles"];
  }
  if (pathname.startsWith("/appointments/organization")) {
    return headerByRoute["/appointments/organization"];
  }
  if (pathname.startsWith("/appointments/knowledge-base")) {
    return headerByRoute["/appointments/knowledge-base"];
  }
  if (pathname.startsWith("/appointments/chatbot")) {
    return headerByRoute["/appointments/chatbot"];
  }
  if (pathname.startsWith("/appointments/overview")) {
    return headerByRoute["/appointments/overview"];
  }
  if (pathname.startsWith("/settings/access/menus")) {
    return headerByRoute["/settings/access/menus"];
  }
  if (pathname.startsWith("/settings/access/permissions")) {
    return headerByRoute["/settings/access/permissions"];
  }
  if (pathname.startsWith("/platform/providers")) {
    return headerByRoute["/platform/providers"];
  }
  if (pathname.startsWith("/platform")) {
    return headerByRoute["/platform"];
  }
  if (pathname.startsWith("/users")) {
    return headerByRoute["/users"];
  }

  return headerByRoute[pathname] ?? headerByRoute["/dashboard"];
}

type TopHeaderProps = {
  pathname: string;
  navItems: MobileNavItem[];
  /** When false, hides the sidebar-style /profile deep link only; Log out stays available. */
  showProfilePageLink?: boolean;
  profileOpen: boolean;
  onToggleProfile: () => void;
  onCloseProfile: () => void;
  profileAvatar: ReactNode;
  profileName: string;
  profileEmail?: string;
  profileRole?: string;
  profileOrg?: string;
  organizations?: Array<{ id: string; name: string }>;
  activeOrganizationId?: string | null;
  onSwitchOrganization?: (organizationId: string) => void;
  switchingOrganization?: boolean;
};

export function TopHeader({
  pathname,
  navItems,
  showProfilePageLink = false,
  profileOpen,
  onToggleProfile,
  onCloseProfile,
  profileAvatar,
  profileName,
  profileEmail,
  profileRole,
  profileOrg,
  organizations = [],
  activeOrganizationId,
  onSwitchOrganization,
  switchingOrganization = false,
}: TopHeaderProps) {
  const copy = getHeaderCopy(pathname);

  return (
    <header className="sticky top-0 z-10 rounded-t-3xl border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
            {copy.eyebrow}
          </p>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{copy.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {organizations.length > 0 ? (
            <CustomSelect
              value={activeOrganizationId ?? organizations[0]?.id ?? ""}
              onChange={(organizationId) => onSwitchOrganization?.(organizationId)}
              options={organizations.map((org) => ({ value: org.id, label: org.name }))}
              placeholder="Select organization"
              disabled={switchingOrganization}
              aria-label="Switch organization"
              className="w-[min(100%,220px)]"
              triggerClassName="rounded-xl py-1.5 font-medium hover:bg-[var(--color-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
              menuClassName="min-w-[220px]"
            />
          ) : null}
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M9 17a3 3 0 0 0 6 0" />
            </svg>
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--color-danger)]" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={onToggleProfile}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
            >
              {profileAvatar}
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold text-[var(--color-text)]">
                  {profileName}
                </span>
                <span className="block text-[11px] text-[var(--color-text-muted)]">
                  {profileRole ?? "Member"}
                  {profileOrg ? ` • ${profileOrg}` : ""}
                </span>
              </span>
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 text-[var(--color-text-muted)] transition ${
                  profileOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {profileOpen ? (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]">
                <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{profileName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{profileEmail ?? "user@example.com"}</p>
                </div>
                {showProfilePageLink ? (
                  <div className="p-1.5">
                    <Link
                      href="/profile"
                      onClick={onCloseProfile}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                    >
                      View Profile
                    </Link>
                  </div>
                ) : null}
                <div className="border-t border-[var(--color-border)] p-1.5">
                <Link
                  href="/logout"
                  onClick={onCloseProfile}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)]"
                >
                    Log out
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={`${item.href}-mobile`}
              href={item.href}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                active
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "bg-[var(--color-surface)] text-[var(--color-text)]"
              }`}
            >
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

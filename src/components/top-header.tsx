"use client";

import Link from "next/link";
import type { ReactNode } from "react";

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
  "/leads": {
    eyebrow: "Lead Capture",
    title: "Qualification and Handoff Operations",
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
    <header className="sticky top-0 z-10 rounded-t-3xl border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {copy.eyebrow}
          </p>
          <h2 className="text-lg font-semibold">{copy.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {organizations.length > 0 ? (
            <label className="sr-only" htmlFor="top-header-org-switch">
              Switch organization
            </label>
          ) : null}
          {organizations.length > 0 ? (
            <select
              id="top-header-org-switch"
              value={activeOrganizationId ?? ""}
              onChange={(e) => onSwitchOrganization?.(e.target.value)}
              disabled={switchingOrganization}
              className="max-w-[220px] rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
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
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={onToggleProfile}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {profileAvatar}
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold text-slate-900">
                  {profileName}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {profileRole ?? "Member"}
                  {profileOrg ? ` • ${profileOrg}` : ""}
                </span>
              </span>
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 text-slate-500 transition ${
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
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{profileName}</p>
                  <p className="text-xs text-slate-500">{profileEmail ?? "user@example.com"}</p>
                </div>
                <div className="p-1.5">
                <Link
                  href="/profile"
                  onClick={onCloseProfile}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  View Profile
                </Link>
                </div>
                <div className="border-t border-slate-200 p-1.5">
                <Link
                  href="/logout"
                  onClick={onCloseProfile}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
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
                active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
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

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CustomSelect } from "@/components/custom-select";
import { ThemeSwitch } from "@/components/theme-switch";

type HeaderCopy = {
  eyebrow: string;
  title: string;
};

const headerByRoute: Record<string, HeaderCopy> = {
  "/dashboard": {
    eyebrow: "Command Center",
    title: "Operations dashboard",
  },
  "/appointments": {
    eyebrow: "Appointment Agent",
    title: "Appointment modules",
  },
  "/appointments/overview": {
    eyebrow: "Appointment Agent",
    title: "Scheduling overview",
  },
  "/appointments/organization": {
    eyebrow: "Appointment Agent",
    title: "Organization setup",
  },
  "/appointments/knowledge-base": {
    eyebrow: "Appointment Agent",
    title: "Knowledge base",
  },
  "/appointments/chatbot": {
    eyebrow: "Appointment Agent",
    title: "Chatbot configuration",
  },
  "/reviews": {
    eyebrow: "Review Response",
    title: "Reputation operations",
  },
  "/voice-agent": {
    eyebrow: "Voice Support",
    title: "Voice agent",
  },
  "/subscription": {
    eyebrow: "Billing",
    title: "Subscription",
  },
  "/profile": {
    eyebrow: "Account Settings",
    title: "Your profile",
  },
  "/settings/access": {
    eyebrow: "Access Control",
    title: "Access governance",
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
    title: "System configuration",
  },
  "/platform/providers": {
    eyebrow: "Platform Settings",
    title: "Provider connections",
  },
  "/platform/audit": {
    eyebrow: "Platform Settings",
    title: "Audit log",
  },
  "/billing-admin": {
    eyebrow: "Billing",
    title: "Billing administration",
  },
  "/billing-admin/organizations": {
    eyebrow: "Billing",
    title: "Organizations",
  },
  "/billing-admin/plans": {
    eyebrow: "Billing",
    title: "Plans & modules",
  },
  "/users": {
    eyebrow: "User Management",
    title: "Team directory",
  },
};

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
  if (pathname.startsWith("/billing-admin/organizations")) {
    return headerByRoute["/billing-admin/organizations"];
  }
  if (pathname.startsWith("/billing-admin/plans")) {
    return headerByRoute["/billing-admin/plans"];
  }
  if (pathname.startsWith("/billing-admin")) {
    return headerByRoute["/billing-admin"];
  }
  if (pathname.startsWith("/platform/providers")) {
    return headerByRoute["/platform/providers"];
  }
  if (pathname.startsWith("/platform/audit")) {
    return headerByRoute["/platform/audit"];
  }
  if (pathname.startsWith("/platform")) {
    return headerByRoute["/platform"];
  }
  if (pathname.startsWith("/users")) {
    return headerByRoute["/users"];
  }
  if (pathname.startsWith("/profile")) {
    return headerByRoute["/profile"];
  }
  if (pathname.startsWith("/subscription")) {
    return headerByRoute["/subscription"];
  }
  if (pathname.startsWith("/voice-agent")) {
    return headerByRoute["/voice-agent"];
  }
  if (pathname.startsWith("/reviews")) {
    return headerByRoute["/reviews"];
  }
  if (pathname.startsWith("/appointments")) {
    return headerByRoute["/appointments"];
  }

  return headerByRoute[pathname] ?? headerByRoute["/dashboard"];
}

type TopHeaderProps = {
  pathname: string;
  /** When false, hides the sidebar-style /profile deep link only; Log out stays available. */
  showProfilePageLink?: boolean;
  onOpenMobileNav?: () => void;
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
  showProfilePageLink = false,
  onOpenMobileNav,
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
  const hasOrganizations = organizations.length > 0;

  const organizationSelect =
    hasOrganizations ? (
      <CustomSelect
        value={activeOrganizationId ?? ""}
        onChange={(organizationId) => onSwitchOrganization?.(organizationId)}
        options={organizations.map((org) => ({ value: org.id, label: org.name }))}
        placeholder="Select workspace"
        disabled={switchingOrganization}
        aria-label="Switch organization"
        className="mt-0 w-full"
        triggerClassName="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-2 text-xs shadow-[var(--shadow-sm)] hover:bg-[var(--color-raised)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
        menuClassName="min-w-[220px]"
      />
    ) : null;

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] backdrop-blur-xl">
      <div className="flex items-center gap-2 px-3 py-2.5 lg:gap-3 lg:px-5">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--color-raised)] lg:hidden"
          aria-label="Open navigation menu"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-[var(--color-text)] lg:text-base">
            {copy.title}
          </h2>
        </div>

        <div className="hidden min-w-0 shrink-0 lg:block lg:w-[12rem]">
          {organizationSelect}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeSwitch />
          <div className="relative">
            <button
              type="button"
              onClick={onToggleProfile}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-label={`Profile menu for ${profileName}`}
              className={`flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5 text-sm font-medium text-[var(--color-text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--color-raised)] sm:max-w-[13.5rem] sm:px-2 sm:py-1.5 ${
                profileOpen
                  ? "bg-[var(--color-raised)] ring-2 ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
                  : ""
              }`}
            >
              <span className="shrink-0">{profileAvatar}</span>
              <span className="hidden min-w-0 flex-1 overflow-hidden text-left sm:block">
                <span
                  className="block truncate text-[13px] font-semibold leading-tight text-[var(--color-text)]"
                  title={profileName}
                >
                  {profileName}
                </span>
                <span
                  className="block truncate text-[10px] leading-tight text-[var(--color-text-muted)]"
                  title={[profileRole ?? "Member", profileOrg].filter(Boolean).join(" · ")}
                >
                  {profileRole ?? "Member"}
                  {profileOrg ? ` · ${profileOrg}` : ""}
                </span>
              </span>
              <svg
                viewBox="0 0 24 24"
                className={`hidden h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)] transition sm:block ${
                  profileOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {profileOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-30 mt-2 w-[min(calc(100vw-1.5rem),16rem)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
              >
                <div className="border-b border-[var(--color-border)] bg-[linear-gradient(125deg,#0c0c0c_0%,#161616_52%,#222222_100%)] px-4 py-3.5 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                    Signed in
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold" title={profileName}>
                    {profileName}
                  </p>
                  <p
                    className="mt-0.5 truncate text-xs text-slate-300"
                    title={profileEmail ?? "user@example.com"}
                  >
                    {profileEmail ?? "user@example.com"}
                  </p>
                </div>
                {showProfilePageLink ? (
                  <div className="p-1.5">
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={onCloseProfile}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-bg)]"
                    >
                      View profile
                    </Link>
                  </div>
                ) : null}
                <div className="border-t border-[var(--color-border)] p-1.5">
                  <Link
                    href="/logout"
                    role="menuitem"
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

      {hasOrganizations ? (
        <div className="border-t border-[var(--color-border)] px-3 py-2 lg:hidden">
          {organizationSelect}
        </div>
      ) : null}
    </header>
  );
}

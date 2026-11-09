"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { CustomSelect } from "@/components/custom-select";
import { ThemeSwitch } from "@/components/theme-switch";
import { ADMIN_ALL_WORKSPACES } from "@/lib/admin-organization-scope";

const MANAGE_WORKSPACES = "__manage_workspaces__";

type HeaderCopy = {
  eyebrow: string;
  title: string;
};

const headerByRoute: Record<string, HeaderCopy> = {
  "/dashboard": {
    eyebrow: "Overview",
    title: "Dashboard",
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
    eyebrow: "Workspace",
    title: "Workspaces",
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
    title: "Plans",
  },
  "/users": {
    eyebrow: "User Management",
    title: "Team directory",
  },
};

function getHeaderCopy(pathname: string): HeaderCopy {
  if (pathname === "/" || pathname === "/dashboard") {
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
  const router = useRouter();
  const copy = getHeaderCopy(pathname);
  const isAdmin = profileRole === "Admin";
  const hasOrganizations = organizations.length > 0;
  const organizationOptions = [
    ...(isAdmin ? [{ value: ADMIN_ALL_WORKSPACES, label: "All workspaces" }] : []),
    ...organizations.map((org) => ({ value: org.id, label: org.name })),
    { value: MANAGE_WORKSPACES, label: "Manage workspaces…" },
  ];
  const organizationSelectValue =
    activeOrganizationId ?? (isAdmin && hasOrganizations ? ADMIN_ALL_WORKSPACES : "");
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const closeOnOutsidePress = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) onCloseProfile();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseProfile();
    };
    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen, onCloseProfile]);

  const organizationSelect =
    hasOrganizations || isAdmin ? (
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--color-primary-h)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 21V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15M15 10h3a2 2 0 0 1 2 2v9M2.5 21h19M8 8.5h3M8 12.5h3M8 16.5h3" />
        </svg>
        <CustomSelect
        value={organizationSelectValue}
        onChange={(organizationId) => {
          if (organizationId === MANAGE_WORKSPACES) {
            router.push("/appointments/organization");
            return;
          }
          onSwitchOrganization?.(organizationId);
        }}
        options={organizationOptions}
        placeholder="Select workspace"
        disabled={switchingOrganization}
        searchable
        searchPlaceholder="Search workspaces…"
        aria-label="Switch organization"
        className="mt-0 w-full min-w-0"
        triggerClassName="min-h-10 rounded-full! border border-[var(--color-border)] bg-transparent! py-2 pl-10! pr-3.5! text-sm shadow-none! hover:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
        menuClassName="min-w-[16rem]"
      />
      </div>
    ) : null;

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)] [[data-theme=dark]_&]:bg-[var(--color-surface)]">
      {/* Same height as the sidebar's logo row, so the two dividers line up */}
      <div className="flex h-[67px] items-center gap-3 px-4 lg:px-6">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text)] transition hover:border-[var(--color-primary)] lg:hidden"
          aria-label="Open navigation menu"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--color-text-muted)]">{copy.eyebrow}</p>
          <h2 className="truncate text-lg font-semibold leading-snug tracking-[-0.02em] text-[var(--color-text)]">
            {copy.title}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <div className="hidden w-64 min-w-0 lg:block">
            {organizationSelect}
          </div>
          <ThemeSwitch className="size-10! rounded-full! bg-transparent! shadow-none! hover:border-[var(--color-primary)]" />
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={onToggleProfile}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-label={`Profile menu for ${profileName}`}
              className={`flex min-h-10 items-center gap-2 rounded-full p-1 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-raised)] sm:max-w-[13.5rem] sm:pr-3 ${
                profileOpen ? "bg-[var(--color-raised)]" : ""
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
                  className="mt-0.5 block truncate text-xs leading-tight text-[var(--color-text-muted)]"
                  title={[profileRole ?? "Member", profileOrg].filter(Boolean).join(" · ")}
                >
                  {profileRole ?? "Member"}
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
                <div className="border-b border-[var(--color-border)] vr-app-blue px-4 py-3.5 text-white">
                  <p className="text-xs font-medium text-white/85">
                    Signed in
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold" title={profileName}>
                    {profileName}
                  </p>
                  <p
                    className="mt-0.5 truncate text-xs text-white/85"
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
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                    >
                      View profile
                    </Link>
                  </div>
                ) : null}
                <div className="border-t border-[var(--color-border)] p-1.5">
                  <form action="/logout" method="POST">
                    <button
                      type="submit"
                      role="menuitem"
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-danger-soft)]"
                    >
                      Log out
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {hasOrganizations ? (
        <div className="border-t border-[var(--color-border)] px-4 py-2 lg:hidden">
          {organizationSelect}
        </div>
      ) : null}
    </header>
  );
}

import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: ReactNode;
  children?: Array<{ href: string; label: string }>;
};

export const APP_NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 13h8V3H3zM13 21h8v-6h-8zM13 10h8V3h-8zM3 21h8v-4H3z" />
      </svg>
    ),
  },
  {
    href: "/users",
    label: "User Management",
    shortLabel: "Users",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="4" />
        <path d="M17 11a4 4 0 1 0-3-7" />
        <path d="M2 20c1.5-4 5-6 8-6s6.5 2 8 6" />
        <path d="M18 20c0-2.3-1.2-4.2-3-5.3" />
      </svg>
    ),
  },
  {
    href: "/appointments",
    label: "Appointment Agent",
    shortLabel: "Appointments",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    ),
    children: [
      { href: "/appointments/overview", label: "Overview" },
      { href: "/appointments/organization", label: "Organization" },
      { href: "/appointments/knowledge-base", label: "Knowledge Base" },
      { href: "/appointments/chatbot", label: "Configure chatbot" },
    ],
  },
  {
    href: "/reviews",
    label: "Review Response",
    shortLabel: "Reviews",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/voice-agent",
    label: "Voice Support",
    shortLabel: "Voice",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <path d="M12 18v4M8 22h8" />
      </svg>
    ),
  },
  {
    href: "/settings/access",
    label: "Access Control",
    shortLabel: "Access",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    children: [
      { href: "/settings/access/roles", label: "Roles" },
      { href: "/settings/access/menus", label: "Menus" },
      { href: "/settings/access/permissions", label: "Permissions" },
    ],
  },
  {
    href: "/platform",
    label: "Platform Settings",
    shortLabel: "Platform",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="6" rx="2" />
        <rect x="3" y="14" width="18" height="6" rx="2" />
        <path d="M7 7h.01M7 17h.01" />
      </svg>
    ),
    children: [{ href: "/platform/providers", label: "Providers" }],
  },
  {
    href: "/profile",
    label: "Profile",
    shortLabel: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
];

export function getAllStaticNavHrefs(): string[] {
  const hrefs: string[] = [];
  for (const item of APP_NAV_ITEMS) {
    hrefs.push(item.href);
    item.children?.forEach((c) => hrefs.push(c.href));
  }
  return hrefs;
}

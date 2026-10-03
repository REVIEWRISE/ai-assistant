"use client";

import Link from "next/link";
import { useState } from "react";

type IntegrationItem = {
  name: string;
  category: "reviews" | "calendar" | "messaging";
  type: string;
  badge: string;
  iconBg: string;
  iconSvg: React.ReactNode;
};

const INTEGRATION_LIST: IntegrationItem[] = [
  {
    name: "Google Business Profile",
    category: "reviews",
    type: "Review & Maps Sync",
    badge: "Native OAuth",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    iconSvg: (
      <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
      </svg>
    ),
  },
  {
    name: "Yelp for Business",
    category: "reviews",
    type: "Review & Reputation",
    badge: "Real-time Sync",
    iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
    iconSvg: (
      <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5v-3l3 2-1 2.5-2-1.5zm-3 0l-2 1.5-1-2.5 3-2v3zm4-7.5l2-3 2 1-1.5 3.5-2.5-1.5zm-8 1l-1.5-3.5 2-1 2 3-2.5 1.5zM12 6.5l1.5 3h-3l1.5-3z" />
      </svg>
    ),
  },
  {
    name: "Facebook & Meta Reviews",
    category: "reviews",
    type: "Social Reputation",
    badge: "Webhooks Active",
    iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    iconSvg: (
      <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Google Calendar",
    category: "calendar",
    type: "Real-time Availability",
    badge: "Bi-directional",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    iconSvg: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    name: "Microsoft Outlook 365",
    category: "calendar",
    type: "Enterprise Schedule",
    badge: "Exchange OAuth",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    iconSvg: (
      <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm1 14.93V15h-2v1.93A8.01 8.01 0 014.07 13H6v-2H4.07A8.01 8.01 0 0111 4.07V6h2V4.07A8.01 8.01 0 0119.93 11H18v2h1.93A8.01 8.01 0 0113 16.93z" />
      </svg>
    ),
  },
  {
    name: "Calendly",
    category: "calendar",
    type: "Booking Links",
    badge: "API v2 Ready",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    iconSvg: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    name: "WhatsApp Business & SMS",
    category: "messaging",
    type: "Inbound Messaging",
    badge: "Instant Trigger",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    iconSvg: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    name: "Webhooks & Zapier",
    category: "messaging",
    type: "Custom Automations",
    badge: "REST / JSON",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    iconSvg: (
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
];

export function LandingIntegrationsSection({
  registerHref,
  isLoggedIn,
}: {
  integrations?: readonly string[];
  registerHref: string;
  isLoggedIn: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "reviews" | "calendar" | "messaging">("all");

  const filteredItems = filter === "all"
    ? INTEGRATION_LIST
    : INTEGRATION_LIST.filter((i) => i.category === filter);

  return (
    <section id="integrations" className="relative overflow-hidden bg-[var(--color-surface)]/50 py-24 sm:py-32 border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="vr-landing-eyebrow">
              <span>Universal Connectivity</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Connects seamlessly with{" "}
              <span className="vr-gradient-text">the tools you already use.</span>
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
              Keep your existing Google listings, calendars, and customer channels. VyntRise adds the AI coordination layer without forcing a system replacement.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2 self-start md:self-end">
            {(
              [
                { id: "all", label: "All Integrations" },
                { id: "reviews", label: "Reviews & Maps" },
                { id: "calendar", label: "Calendars" },
                { id: "messaging", label: "Messaging & Leads" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === tab.id
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm"
                    : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Integration Cards Grid */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredItems.map((item) => (
            <div
              key={item.name}
              className="vr-glass-card group flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 transition hover:border-[var(--color-primary)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`flex size-11 items-center justify-center rounded-xl ${item.iconBg}`}>
                    {item.iconSvg}
                  </div>
                  <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">
                    {item.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-bold text-[var(--color-text)]">
                  {item.name}
                </h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {item.type}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)]/60 pt-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
                <span className="text-[11px] font-medium text-[var(--color-primary-h)] group-hover:translate-x-0.5 transition-transform">
                  Configure →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA bar */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔌</span>
            <div>
              <p className="text-sm font-bold text-[var(--color-text)]">Need a custom CRM or POS integration?</p>
              <p className="text-xs text-[var(--color-text-muted)]">We provide standard REST webhooks and custom connector setups for Enterprise teams.</p>
            </div>
          </div>

          <Link
            href={isLoggedIn ? "/dashboard" : registerHref}
            className="vr-landing-btn-primary inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold text-[var(--color-primary-fg)] shadow"
          >
            {isLoggedIn ? "Manage Integrations" : "Connect Your Channels"}
          </Link>
        </div>
      </div>
    </section>
  );
}

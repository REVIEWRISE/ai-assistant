"use client";

import Link from "next/link";
import { trackLandingCta } from "@/lib/analytics";

type IntegrationItem = {
  name: string;
  category: "reviews" | "calendar" | "messaging";
  type: string;
  iconSvg: React.ReactNode;
};

const CATEGORIES = [
  { id: "reviews", label: "Reviews & Maps" },
  { id: "calendar", label: "Calendars" },
  { id: "messaging", label: "Messaging & Leads" },
] as const;

const INTEGRATION_LIST: IntegrationItem[] = [
  {
    name: "Google Business Profile",
    category: "reviews",
    type: "Review & Maps Sync",
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
      </svg>
    ),
  },
  {
    name: "Yelp for Business",
    category: "reviews",
    type: "Review & Reputation",
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5v-3l3 2-1 2.5-2-1.5zm-3 0l-2 1.5-1-2.5 3-2v3zm4-7.5l2-3 2 1-1.5 3.5-2.5-1.5zm-8 1l-1.5-3.5 2-1 2 3-2.5 1.5zM12 6.5l1.5 3h-3l1.5-3z" />
      </svg>
    ),
  },
  {
    name: "Facebook & Meta Reviews",
    category: "reviews",
    type: "Social Reputation",
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Google Calendar",
    category: "calendar",
    type: "Real-time Availability",
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm1 14.93V15h-2v1.93A8.01 8.01 0 014.07 13H6v-2H4.07A8.01 8.01 0 0111 4.07V6h2V4.07A8.01 8.01 0 0119.93 11H18v2h1.93A8.01 8.01 0 0113 16.93z" />
      </svg>
    ),
  },
  {
    name: "Calendly",
    category: "calendar",
    type: "Booking Links",
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    name: "WhatsApp Business & SMS",
    category: "messaging",
    type: "Inbound Messaging",
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    name: "Webhooks & Zapier",
    category: "messaging",
    type: "Custom Automations",
    iconSvg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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
  const ctaHref = isLoggedIn ? "/dashboard" : registerHref;
  const ctaLabel = isLoggedIn ? "Manage integrations" : "Connect your channels";

  return (
    <section id="integrations" className="lp-section lp-tinted">
      <div className="lp-wrap">
        <div className="max-w-3xl">
          <h2 className="lp-h2">Connects seamlessly with the tools you already use.</h2>
          <p className="lp-lede mt-5 max-w-2xl">
            Keep your existing Google listings, calendars, and customer channels. VyntRise adds the AI coordination
            layer without forcing a system replacement.
          </p>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8 lg:mt-16 lg:gap-14">
          {CATEGORIES.map((category) => (
            <div key={category.id}>
              <h3 className="border-b border-[var(--lp-tint-line)] pb-3 text-sm font-semibold text-[var(--color-text)]">
                {category.label}
              </h3>
              <ul>
                {INTEGRATION_LIST.filter((item) => item.category === category.id).map((item) => (
                  <li key={item.name} className="flex items-center gap-3.5 border-b border-[var(--lp-tint-line)] py-4">
                    <span className="flex size-5 shrink-0 text-[var(--lp-accent)] [&_svg]:size-5">{item.iconSvg}</span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium text-[var(--color-text)]">{item.name}</span>
                      <span className="block text-sm text-[var(--color-text-muted)]">{item.type}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-[var(--color-text)]">Need a custom CRM or POS integration?</p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
              We provide standard REST webhooks and custom connector setups for Enterprise teams.
            </p>
          </div>
          <Link
            href={ctaHref}
            onClick={() => trackLandingCta(isLoggedIn ? "Manage Integrations" : "Connect Your Channels", "integrations_bar", ctaHref)}
            className="lp-btn lp-btn-solid shrink-0 self-start sm:self-auto"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

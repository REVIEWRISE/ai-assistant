"use client";

import Link from "next/link";
import { useState } from "react";

type AgentTab = "reviews" | "bookings" | "leads";

const TABS: { id: AgentTab; label: string }[] = [
  { id: "reviews", label: "Review Agent" },
  { id: "bookings", label: "Booking Agent" },
  { id: "leads", label: "Lead Agent" },
];

export function LandingHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [activeTab, setActiveTab] = useState<AgentTab>("reviews");
  const [approved, setApproved] = useState(false);

  return (
    <section className="relative px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-14 lg:pb-32">
      <div className="landing-spotlight mx-auto max-w-7xl">
        {/* Subtle grid and glows */}
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />
        <div className="landing-spotlight-glow -left-48 -top-48 h-[26rem] w-[26rem] opacity-60" aria-hidden />
        <div className="landing-spotlight-glow bottom-0 right-0 h-[22rem] w-[22rem] opacity-40" aria-hidden />

        <div className="relative grid gap-16 px-6 py-14 sm:px-10 sm:py-20 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-10 lg:px-14 lg:py-24 xl:px-20">

          {/* ── Left: Copy ─────────────────────────────── */}
          <div className="landing-animate-up max-w-xl">

            {/* Eyebrow */}
            <div className="vr-landing-eyebrow">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              AI Operations for Local Businesses
            </div>

            {/* Headline */}
            <h1 className="mt-7 text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.04em] text-[var(--color-text)] sm:text-[2.75rem] lg:text-[3.25rem]">
              Every customer message,
              <br />
              turned into{" "}
              <em className="vr-gradient-text not-italic">
                instant action.
              </em>
            </h1>

            {/* Subheading */}
            <p className="landing-animate-up landing-animate-delay-1 mt-6 text-[1.05rem] leading-[1.7] text-[var(--color-text-muted)]">
              VyntRise handles review replies, appointment requests, and inbound leads from a single intelligent workspace — so your team responds in seconds, not hours.
            </p>

            {/* CTAs */}
            <div className="landing-animate-up landing-animate-delay-2 mt-9 flex items-center gap-3">
              <Link
                href={isLoggedIn ? "/dashboard" : "/register"}
                className="vr-landing-btn-primary group inline-flex h-11 items-center gap-2 px-6 text-sm"
              >
                {isLoggedIn ? "Open dashboard" : "Start free trial"}
                <svg
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden
                >
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="#features"
                className="vr-landing-btn-secondary inline-flex h-11 items-center px-6 text-sm"
              >
                See how it works
              </a>
            </div>

            {/* Trust signals */}
            <div className="landing-animate-up landing-animate-delay-3 mt-8 flex flex-col gap-4 border-t border-[var(--color-border)] pt-7">
              <div className="flex items-center gap-4">
                {/* Avatar stack */}
                <div className="flex -space-x-2">
                  {[
                    "from-violet-600 to-indigo-500",
                    "from-amber-500 to-orange-500",
                    "from-emerald-500 to-teal-400",
                    "from-sky-500 to-blue-400",
                  ].map((g, i) => (
                    <span
                      key={i}
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${g} text-[10px] font-bold text-white ring-2 ring-[var(--color-bg)]`}
                    />
                  ))}
                  <span className="flex size-7 items-center justify-center rounded-full bg-[var(--color-surface)] text-[9px] font-bold text-[var(--color-text-muted)] ring-2 ring-[var(--color-bg)]">
                    150+
                  </span>
                </div>

                <div className="text-xs text-[var(--color-text-muted)]">
                  <span className="mr-1 font-semibold text-amber-500">★★★★★</span>
                  <span className="font-medium text-[var(--color-text)]">4.9 / 5</span>
                  {" "}from 150+ local businesses
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-[var(--color-text-subtle)]">
                <span className="flex items-center gap-1.5">
                  <svg className="size-3.5 text-emerald-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="size-3.5 text-emerald-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  15-minute setup
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="size-3.5 text-emerald-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Cancel anytime
                </span>
              </div>
            </div>
          </div>

          {/* ── Right: Live Operations Console ─────────── */}
          <div className="landing-animate-in landing-animate-delay-2 mx-auto w-full max-w-lg lg:max-w-none">
            <div className="landing-spotlight-glow -inset-6 rounded-3xl opacity-50 blur-3xl" aria-hidden />

            <div className="landing-spotlight-panel relative overflow-hidden rounded-2xl">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 bg-[var(--color-surface)]/60 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-xs font-semibold tracking-wide text-[var(--color-text)]">
                    VyntRise Live Hub
                  </span>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Live Syncing
                </span>
              </div>

              {/* Tab switcher */}
              <div className="border-b border-[var(--color-border)]/60 px-4 py-3">
                <div className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-1">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setActiveTab(tab.id); setApproved(false); }}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                        activeTab === tab.id
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel body */}
              <div className="space-y-3 p-4 sm:p-5">
                {activeTab === "reviews" && (
                  <>
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
                          <span className="flex size-5 items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-bold text-[10px]">G</span>
                          Helen T. · Google Review
                        </span>
                        <span className="text-amber-400">★★★★★</span>
                      </div>
                      <p className="mt-2.5 text-xs leading-[1.65] text-[var(--color-text-muted)] italic">
                        &ldquo;The catering for our corporate lunch was perfection — arrived hot and everyone loved the flavors!&rdquo;
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/40 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary-h)]">
                          AI Drafted Response
                        </span>
                        <span className="rounded-md bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-h)]">
                          Warm & Gracious
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs leading-[1.65] text-[var(--color-text)]">
                        &ldquo;Thank you so much, Helen! We&apos;re thrilled your team enjoyed every bite. Looking forward to catering your next event!&rdquo;
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)]/50 pt-3">
                        <span className="text-[10px] text-[var(--color-text-subtle)]">
                          Confidence: <span className="font-semibold text-emerald-500">99.2%</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setApproved(true)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                            approved
                              ? "bg-emerald-500 text-white"
                              : "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-h)]"
                          }`}
                        >
                          {approved ? "✓ Published" : "Approve & Publish"}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "bookings" && (
                  <>
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--color-text)]">Sarah J. · Consultation Request</span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          Tomorrow 2:30 PM
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--color-text-muted)]">Service: Business Strategy Session — 45 min</p>
                    </div>
                    <div className="rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/40 p-4 space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary-h)]">
                        Calendar Sync & Auto-routing
                      </span>
                      {["Synced with Google Calendar & Outlook", "0 conflicts detected — slot confirmed", "SMS reminder & Zoom link dispatched"].map(b => (
                        <div key={b} className="flex items-center gap-2 text-xs text-[var(--color-text)]">
                          <span className="text-emerald-500 font-bold text-sm">✓</span> {b}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === "leads" && (
                  <>
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--color-text)]">Inbound via Website Widget</span>
                        <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Intent: 98%
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs italic leading-relaxed text-[var(--color-text-muted)]">
                        &ldquo;Looking to book a recurring monthly service for our downtown office starting next week.&rdquo;
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/40 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary-h)]">
                          Instant Follow-up Sent
                        </span>
                        <span className="text-[10px] font-semibold text-[var(--color-primary-h)]">24s</span>
                      </div>
                      <p className="mt-2.5 text-xs leading-[1.65] text-[var(--color-text)]">
                        &ldquo;Hello! We&apos;d love to support your downtown office. Here&apos;s our service packages and booking link...&rdquo;
                      </p>
                      <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border)]/50 pt-3 text-[10px]">
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600">Lead Qualified</span>
                        <span className="text-[var(--color-text-subtle)]">SMS dispatched automatically</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Metrics bar */}
              <div className="grid grid-cols-3 divide-x divide-[var(--color-border)]/60 border-t border-[var(--color-border)]/60">
                {[
                  { value: "45s", label: "Avg Response", color: "text-[var(--color-text)]" },
                  { value: "99.4%", label: "Accuracy", color: "text-[var(--color-primary-h)]" },
                  { value: "14.5 hrs", label: "Saved / week", color: "text-emerald-600" },
                ].map(({ value, label, color }) => (
                  <div key={label} className="py-3.5 text-center">
                    <p className={`text-base font-bold tabular-nums ${color} sm:text-[1.1rem]`}>{value}</p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LandingLogoMark } from "@/components/landing/landing-logo-mark";
import { trackLandingCta, sendGAEvent } from "@/lib/analytics";

type AgentTab = "reviews" | "bookings" | "leads";

const TABS: { id: AgentTab; label: string; short: string }[] = [
  { id: "reviews", label: "Review Agent", short: "Reviews" },
  { id: "bookings", label: "Booking Agent", short: "Bookings" },
  { id: "leads", label: "Lead Agent", short: "Leads" },
];

const METRICS = [
  { value: "45s", label: "Avg response" },
  { value: "99.4%", label: "Accuracy" },
  { value: "14.5 hrs", label: "Saved / week" },
];

function Incoming({ title, aside, children }: { title: string; aside: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="font-semibold">{title}</span>
        <span className="shrink-0 text-xs font-medium text-[var(--color-text-muted)]">{aside}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{children}</p>
    </div>
  );
}

function AgentReply({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--lp-tint)] p-4">
      <div className="flex items-center justify-between gap-3 text-[13px] font-semibold text-[var(--lp-accent)]">
        <span>{title}</span>
        {aside ? <span className="shrink-0 text-xs font-medium">{aside}</span> : null}
      </div>
      <div className="mt-2 text-sm leading-6">{children}</div>
    </div>
  );
}

export function LandingHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [activeTab, setActiveTab] = useState<AgentTab>("reviews");
  const [approved, setApproved] = useState(false);
  const primaryHref = isLoggedIn ? "/dashboard" : "/register";
  const primaryLabel = isLoggedIn ? "Open dashboard" : "Start free trial";

  return (
    <section id="top" className="lp-blue">
      <LandingLogoMark className="lp-mark -left-24 -bottom-32 w-[46rem] max-w-none lg:-left-16 lg:-bottom-48 lg:w-[60rem]" />

      <div className="lp-wrap grid gap-14 pb-16 pt-32 sm:pb-20 sm:pt-38 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16 lg:pb-24">
        <div className="landing-animate-up">
          <p className="text-[15px] font-medium text-[var(--lp-on-blue-muted)]">AI operations for local businesses</p>

          <h1 className="lp-h1 mt-5">Never lose another customer to slow replies or missed calls.</h1>

          <p className="mt-6 max-w-xl text-lg leading-[1.65] text-[var(--lp-on-blue-muted)]">
            AI that responds to Google reviews, books appointments, and captures local leads 24/7, built for busy
            operators.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              onClick={() => trackLandingCta(primaryLabel, "hero_primary", primaryHref)}
              className="lp-btn lp-btn-white"
            >
              {primaryLabel}
            </Link>
            <a
              href="#features"
              onClick={() => trackLandingCta("See how it works", "hero_secondary", "#features")}
              className="lp-btn lp-btn-on-blue"
            >
              See how it works
            </a>
          </div>

          <p className="mt-8 text-sm leading-6 text-[var(--lp-on-blue-muted)]">
            <span className="font-semibold text-white">4.9 / 5</span> from 150+ local businesses · 15-minute setup ·
            Cancel anytime
          </p>
        </div>

        <div className="landing-animate-in landing-animate-delay-2 mx-auto w-full max-w-lg lg:max-w-none">
          <div className="lp-console">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 pt-4">
              <div className="flex gap-5" role="group" aria-label="Choose an agent">
                {TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setApproved(false);
                        sendGAEvent("hero_tab_switch", { tab_id: tab.id, tab_label: tab.label });
                      }}
                      className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${
                        active
                          ? "border-[var(--lp-accent)] text-[var(--color-text)]"
                          : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      {tab.short}
                    </button>
                  );
                })}
              </div>
              <span className="flex items-center gap-1.5 pb-3 text-xs font-medium text-[var(--color-text-muted)]">
                <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
                Live
              </span>
            </div>

            <div className="min-h-[17rem] space-y-4 p-5">
              {activeTab === "reviews" && (
                <>
                  <Incoming title="Helen T. · Google review" aside={<span className="text-amber-500">★★★★★</span>}>
                    &ldquo;The catering for our corporate lunch was perfection, arrived hot and everyone loved the
                    flavors!&rdquo;
                  </Incoming>
                  <AgentReply title="Drafted reply" aside="Warm & gracious">
                    <p>
                      &ldquo;Thank you so much, Helen! We&apos;re thrilled your team enjoyed every bite. Looking forward
                      to catering your next event!&rdquo;
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-[var(--color-text-muted)]">Confidence 99.2%</span>
                      <button
                        type="button"
                        onClick={() => setApproved(true)}
                        className={`lp-btn lp-btn-sm ${approved ? "pointer-events-none" : ""} lp-btn-solid`}
                      >
                        {approved ? "Published" : "Approve & publish"}
                      </button>
                    </div>
                  </AgentReply>
                </>
              )}

              {activeTab === "bookings" && (
                <>
                  <Incoming title="Sarah J. · Consultation request" aside="Tomorrow 2:30 PM">
                    Business Strategy Session, 45 minutes
                  </Incoming>
                  <AgentReply title="Calendar sync and routing">
                    <ul className="space-y-1.5">
                      {[
                        "Synced with Google Calendar & Outlook",
                        "0 conflicts detected, slot confirmed",
                        "SMS reminder & Zoom link dispatched",
                      ].map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="font-semibold text-[var(--lp-accent)]" aria-hidden>
                            ✓
                          </span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </AgentReply>
                </>
              )}

              {activeTab === "leads" && (
                <>
                  <Incoming title="Website widget" aside="Intent 98%">
                    &ldquo;Looking to book a recurring monthly service for our downtown office starting next
                    week.&rdquo;
                  </Incoming>
                  <AgentReply title="Follow-up sent" aside="24s">
                    <p>
                      &ldquo;Hello! We&apos;d love to support your downtown office. Here&apos;s our service packages and
                      booking link...&rdquo;
                    </p>
                    <p className="mt-3 text-xs text-[var(--color-text-muted)]">Lead qualified · SMS sent automatically</p>
                  </AgentReply>
                </>
              )}
            </div>

            <dl className="grid grid-cols-3 border-t border-[var(--color-border)]">
              {METRICS.map(({ value, label }) => (
                <div key={label} className="px-3 py-3.5 text-center">
                  <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
                  <dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

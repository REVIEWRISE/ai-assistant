"use client";

import Link from "next/link";
import { useState } from "react";

const STEPS = [
  {
    number: "01",
    tag: "One-Click Sync",
    title: "Connect your channels in under 5 minutes",
    body: "Link your Google Business profile, Yelp account, calendars (Google / Outlook / Calendly), and messaging touchpoints with secure native OAuth.",
    bullets: ["Zero coding required", "No migration or workflow disruption", "Keeps all your existing tools intact"],
  },
  {
    number: "02",
    tag: "Custom Guardrails",
    title: "Set brand tone, rules, and escalation thresholds",
    body: "Train the agent on your specific offerings, pricing, and voice. Set automatic human-in-the-loop approval triggers for low-star reviews or VIP leads.",
    bullets: ["Custom tone of voice tuning", "Smart negative feedback routing", "Manager review queue with 1-click approvals"],
  },
  {
    number: "03",
    tag: "Autonomous Ops",
    title: "Launch 24/7 automation with full visibility",
    body: "Agents immediately begin qualifying leads, answering reviews in seconds, and scheduling appointments while you monitor performance from one clean dashboard.",
    bullets: ["Instant sub-minute response times", "Live activity logs & audit trail", "Weekly ROI and hours saved reports"],
  },
] as const;

export function LandingPlaybookSection({
  registerHref,
  isLoggedIn,
}: {
  registerHref: string;
  isLoggedIn: boolean;
}) {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section id="playbook" className="relative overflow-hidden bg-[var(--color-bg)] py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:items-start">
          {/* Left Column: Heading & CTA */}
          <div className="lg:sticky lg:top-28">
            <div className="vr-landing-eyebrow">
              <span>Setup to Autopilot</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Live in 15 minutes.{" "}
              <span className="vr-gradient-text">Smarter every single week.</span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-[var(--color-text-muted)]">
              No complex migrations or software replacements. VyntRise sits quietly alongside your existing platforms and begins saving hours on day one.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={registerHref}
                className="vr-landing-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold text-[var(--color-primary-fg)] shadow-md transition"
              >
                <span>{isLoggedIn ? "Open dashboard" : "Build your first workflow"}</span>
                <span aria-hidden>→</span>
              </Link>
            </div>

            {/* Micro stats banner */}
            <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Average Operator Experience
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xl font-bold text-[var(--color-primary-h)]">12 Mins</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Initial onboarding time</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+42%</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Faster review turnaround</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Progressive Steps */}
          <div className="space-y-4">
            {STEPS.map((step, index) => {
              const isSelected = activeStep === index;
              return (
                <div
                  key={step.number}
                  onClick={() => setActiveStep(index)}
                  className={`cursor-pointer rounded-[1.75rem] border p-6 sm:p-7 transition-all duration-300 ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-surface)] shadow-lg shadow-[rgba(99,102,241,0.08)] -translate-y-1"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]"
                  }`}
                >
                  <div className="flex items-start gap-4 sm:gap-5">
                    <span
                      className={`flex size-12 shrink-0 items-center justify-center rounded-2xl font-mono text-sm font-bold shadow-sm transition ${
                        isSelected
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                          : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {step.number}
                    </span>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary-h)]">
                          {step.tag}
                        </span>
                        {isSelected && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            Active Step
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 text-lg font-bold text-[var(--color-text)] sm:text-xl">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                        {step.body}
                      </p>

                      <ul className="mt-4 space-y-1.5 border-t border-[var(--color-border)]/60 pt-3">
                        {step.bullets.map((b) => (
                          <li key={b} className="flex items-center gap-2 text-xs text-[var(--color-text)]">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

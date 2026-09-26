"use client";

import Link from "next/link";
import { useState } from "react";
import type { LandingPlan } from "@/lib/landing-data";

type BillingInterval = "monthly" | "yearly";

function PricingPlaceholder() {
  return (
    <div className="mt-10 lg:mt-14">
      <div className="rounded-[2rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center sm:px-12">
        <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-primary-h)]">
          Live Plans Loading
        </span>
        <h3 className="mt-4 text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl">
          Pricing plans load directly from our billing repository
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
          If you are evaluating VyntRise now, talk with our team and we will configure a tailored trial for your locations.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#contact"
            className="vr-landing-btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-[var(--color-primary-fg)] shadow"
          >
            Talk with our team
          </a>
          <Link
            href="/register"
            className="vr-landing-btn-secondary inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LandingPricingSection({
  plans,
  registerHref,
  isLoggedIn,
}: {
  plans: LandingPlan[];
  registerHref: string;
  isLoggedIn: boolean;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const hasPlans = plans.length > 0;

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-[var(--color-bg)] py-24 sm:py-32 border-b border-[var(--color-border)]"
    >
      {/* Background ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-96 w-full max-w-7xl bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-primary)_15%,transparent),transparent_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center">
          <div className="vr-landing-eyebrow">
            <span>Simple, Transparent Pricing</span>
          </div>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
            Start free. Scale as your{" "}
            <span className="vr-gradient-text">business expands.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base text-[var(--color-text-muted)] sm:text-lg">
            Every plan includes a 14-day free trial. No credit card required to start.
          </p>

          {/* Billing Switcher Toggle */}
          {hasPlans ? (
            <div className="mt-8 inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setInterval("monthly")}
                className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                  interval === "monthly"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setInterval("yearly")}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition ${
                  interval === "yearly"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <span>Annual Billing</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Save 20%
                </span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Pricing Cards */}
        {!hasPlans ? (
          <PricingPlaceholder />
        ) : (
          <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:items-stretch">
            {plans.map((plan) => {
              const isYearly = interval === "yearly";
              const intervalAvailable = isYearly
                ? Boolean(plan.yearlyPrice)
                : Boolean(plan.price);
              const displayedPrice = isYearly
                ? plan.yearlyPrice === "Custom"
                  ? "Custom"
                  : (plan.yearlyMonthlyPrice ?? plan.yearlyPrice)
                : plan.price;
              const hasPricedInterval =
                Boolean(displayedPrice) && displayedPrice !== "Custom";
              const href = isLoggedIn
                ? registerHref
                : hasPricedInterval
                  ? `${registerHref}?plan=${encodeURIComponent(plan.slug)}&interval=${interval}`
                  : "#contact";

              return (
                <article
                  key={plan.slug}
                  className={`vr-glass-card relative flex flex-col justify-between rounded-2xl p-7 sm:p-8 transition-all ${
                    plan.featured
                      ? "border-2 border-[var(--color-primary)] bg-[var(--color-bg)] shadow-[0_16px_48px_-12px_color-mix(in_srgb,var(--color-primary)_18%,transparent)] lg:-translate-y-2 z-10"
                      : "border border-[var(--color-border)] bg-[var(--color-bg)]"
                  }`}
                >
                  {plan.featured ? (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-grad-start)] px-4 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[var(--color-primary-fg)] shadow-md">
                      Most Popular Tier
                    </div>
                  ) : null}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
                        {plan.title}
                      </h3>
                      {plan.includedLocations > 1 ? (
                        <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                          {plan.includedLocations} Locations
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 min-h-10 text-xs leading-5 text-[var(--color-text-muted)]">
                      {plan.description}
                    </p>

                    {/* Price Block */}
                    <div className="mt-6 border-y border-[var(--color-border)] py-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-bold tracking-tight text-[var(--color-text)]">
                          {displayedPrice ?? "—"}
                        </span>
                        {hasPricedInterval ? (
                          <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                            /month
                          </span>
                        ) : null}
                      </div>

                      {displayedPrice === "Custom" ? (
                        <p className="mt-2 text-xs font-medium text-[var(--color-primary-h)]">
                          Tailored quote with dedicated SLA
                        </p>
                      ) : isYearly && plan.yearlyPrice ? (
                        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          Billed annually at {plan.yearlyPrice}/yr (Save {plan.yearlySavingsPercent ?? 20}%)
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                          Billed monthly · Cancel anytime
                        </p>
                      )}
                    </div>

                    {/* Features Checklist */}
                    <ul className="mt-6 space-y-3">
                      {plan.items.slice(0, 6).map((item) => (
                        <li key={`in-${item}`} className="flex items-start gap-2.5 text-xs text-[var(--color-text)]">
                          <svg className="size-4 shrink-0 text-emerald-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className={item.startsWith("Everything in") ? "font-bold text-[var(--color-text)]" : undefined}>
                            {item}
                          </span>
                        </li>
                      ))}

                      {plan.excludedItems.slice(0, 3).map((item) => (
                        <li key={`out-${item}`} className="flex items-start gap-2.5 text-xs text-[var(--color-text-subtle)] opacity-60">
                          <svg className="size-4 shrink-0 text-[var(--color-text-subtle)] mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-8 pt-4">
                    <Link
                      href={href}
                      className={`inline-flex min-h-12 w-full items-center justify-center rounded-full text-xs font-bold transition shadow-sm ${
                        plan.featured
                          ? "vr-landing-btn-primary text-[var(--color-primary-fg)]"
                          : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-h)]"
                      }`}
                    >
                      {isLoggedIn
                        ? "Open Workspace"
                        : hasPricedInterval
                          ? `Start 14-Day Free Trial`
                          : "Talk with our team"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Guarantee strip */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-12 border-t border-[var(--color-border)] pt-8 text-xs font-medium text-[var(--color-text-muted)]">
          <span className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-sm">✓</span> 14-Day Free Trial
          </span>
          <span className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-sm">✓</span> No Credit Card Required
          </span>
          <span className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-sm">✓</span> Cancel Anytime with 1-Click
          </span>
          <span className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-sm">✓</span> 99.9% Uptime SLA
          </span>
        </div>
      </div>
    </section>
  );
}

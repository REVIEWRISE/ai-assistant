"use client";

import Link from "next/link";
import { useState } from "react";
import type { LandingPlan } from "@/lib/landing-data";
import { trackLandingCta, trackPlanSelected } from "@/lib/analytics";

type BillingInterval = "monthly" | "yearly";

function PricingPlaceholder() {
  return (
    <div className="lp-tinted mt-12 rounded-3xl px-6 py-12 text-center sm:px-12">
      <h3 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text)] sm:text-3xl">
        Pricing plans load directly from our billing repository
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-[var(--color-text-muted)]">
        If you are evaluating VyntRise now, talk with our team and we will configure a tailored trial for your locations.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <a
          href="#contact"
          onClick={() => trackLandingCta("Talk with our team", "pricing_placeholder", "#contact")}
          className="lp-btn lp-btn-solid"
        >
          Talk with our team
        </a>
        <Link
          href="/register"
          onClick={() => trackLandingCta("Start free trial", "pricing_placeholder", "/register")}
          className="lp-btn lp-btn-outline"
        >
          Start free trial
        </Link>
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

  const intervalClass = (selected: boolean) =>
    `flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors ${
      selected ? "bg-[var(--lp-solid)] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
    }`;

  return (
    <section id="pricing" className="lp-section">
      <div className="lp-wrap">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="lp-h2 max-w-2xl">Start free. Scale as your business expands.</h2>
            <p className="lp-lede mt-4">Every plan includes a 14-day free trial.</p>
          </div>

          {hasPlans ? (
            <div className="inline-flex shrink-0 self-start rounded-full border border-[var(--color-border)] p-1 lg:self-auto">
              <button
                type="button"
                aria-pressed={interval === "monthly"}
                onClick={() => {
                  setInterval("monthly");
                  trackPlanSelected("all", "monthly");
                }}
                className={intervalClass(interval === "monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                aria-pressed={interval === "yearly"}
                onClick={() => {
                  setInterval("yearly");
                  trackPlanSelected("all", "yearly");
                }}
                className={intervalClass(interval === "yearly")}
              >
                Annual
                <span className="text-xs font-semibold">Save 20%</span>
              </button>
            </div>
          ) : null}
        </div>

        {!hasPlans ? (
          <PricingPlaceholder />
        ) : (
          <div className="mt-12 grid gap-5 lg:mt-14 lg:grid-cols-3">
            {plans.map((plan) => {
              const isYearly = interval === "yearly";
              const displayedPrice = isYearly
                ? plan.yearlyPrice === "Custom"
                  ? "Custom"
                  : (plan.yearlyMonthlyPrice ?? plan.yearlyPrice)
                : plan.price;
              const hasPricedInterval = Boolean(displayedPrice) && displayedPrice !== "Custom";
              const href = isLoggedIn
                ? registerHref
                : hasPricedInterval
                  ? `${registerHref}?plan=${encodeURIComponent(plan.slug)}&interval=${interval}`
                  : "#contact";

              const featured = Boolean(plan.featured);
              const muted = featured ? "text-[var(--lp-on-blue-muted)]" : "text-[var(--color-text-muted)]";
              const strong = featured ? "text-white" : "text-[var(--color-text)]";
              const mark = featured ? "text-white" : "text-[var(--lp-accent)]";

              return (
                <article
                  key={plan.slug}
                  className={`flex flex-col rounded-3xl border p-7 sm:p-8 ${
                    featured
                      ? "border-[var(--lp-solid)] bg-[var(--lp-solid)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`text-xl font-semibold tracking-[-0.02em] ${strong}`}>{plan.title}</h3>
                    {featured ? <span className="text-sm font-semibold text-white">Most popular</span> : null}
                    {!featured && plan.includedLocations > 1 ? (
                      <span className={`text-sm ${muted}`}>{plan.includedLocations} locations</span>
                    ) : null}
                  </div>

                  <p className={`mt-2 min-h-12 text-sm leading-6 ${muted}`}>{plan.description}</p>

                  <div className="mt-6">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-[2.75rem] font-semibold leading-none tracking-[-0.03em] ${strong}`}>
                        {displayedPrice ?? "—"}
                      </span>
                      {hasPricedInterval ? <span className={`text-sm font-medium ${muted}`}>/month</span> : null}
                    </div>
                    <p className={`mt-2.5 text-sm ${muted}`}>
                      {displayedPrice === "Custom"
                        ? "Tailored quote with dedicated SLA"
                        : isYearly && plan.yearlyPrice
                          ? `Billed annually at ${plan.yearlyPrice}/yr (Save ${plan.yearlySavingsPercent ?? 20}%)`
                          : "Billed monthly · Cancel anytime"}
                    </p>
                  </div>

                  <Link
                    href={href}
                    onClick={() => {
                      trackPlanSelected(plan.title, interval);
                      trackLandingCta(`plan_${plan.slug}`, "pricing_cards", href);
                    }}
                    className={`lp-btn mt-7 w-full ${featured ? "lp-btn-white" : "lp-btn-outline"}`}
                  >
                    {isLoggedIn ? "Open workspace" : hasPricedInterval ? "Start 14-day free trial" : "Talk with our team"}
                  </Link>

                  <ul className="mt-7 space-y-3">
                    {plan.items.slice(0, 6).map((item) => (
                      <li key={`in-${item}`} className={`flex items-start gap-2.5 text-sm leading-6 ${strong}`}>
                        <svg className={`mt-1 size-4 shrink-0 ${mark}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className={item.startsWith("Everything in") ? "font-semibold" : undefined}>{item}</span>
                      </li>
                    ))}

                    {plan.excludedItems.slice(0, 3).map((item) => (
                      <li key={`out-${item}`} className={`flex items-start gap-2.5 text-sm leading-6 ${muted}`}>
                        <svg className="mt-1 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Not included">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
          14-day free trial · Cancel anytime with 1 click · 99.9% uptime SLA
        </p>
      </div>
    </section>
  );
}

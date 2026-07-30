"use client";

import Link from "next/link";
import { useState } from "react";
import type { LandingPlan } from "@/lib/landing-data";

type BillingInterval = "monthly" | "yearly";

function PricingPlaceholder() {
  return (
    <div className="mt-10 space-y-6 lg:mt-14">
      <div className="rounded-[1.6rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8 text-center sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
          Plans unavailable
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--color-text)] sm:text-2xl">
          Pricing will appear here once billing is connected
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
          Live plans load from our billing service. If you&apos;re evaluating VyntRise Agent now,
          talk with our team and we&apos;ll walk you through options and a trial.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#contact"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
          >
            Talk with our team
          </a>
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)]"
          >
            Start free trial
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-bg)] p-6 sm:p-7 ${
              index === 1 ? "lg:-translate-y-2" : ""
            }`}
          >
            <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-skeleton)]" />
            <div className="mt-4 h-4 w-full max-w-[14rem] animate-pulse rounded bg-[var(--color-skeleton)]" />
            <div className="mt-6 border-y border-[var(--color-border)] py-6">
              <div className="h-12 w-28 animate-pulse rounded-lg bg-[var(--color-skeleton)]" />
              <div className="mt-3 h-3 w-40 animate-pulse rounded bg-[var(--color-skeleton)]" />
            </div>
            <div className="space-y-3 pt-5">
              <div className="h-3 w-full animate-pulse rounded bg-[var(--color-skeleton)]" />
              <div className="h-3 w-[90%] animate-pulse rounded bg-[var(--color-skeleton)]" />
              <div className="h-3 w-[80%] animate-pulse rounded bg-[var(--color-skeleton)]" />
            </div>
            <div className="mt-7 h-12 animate-pulse rounded-full bg-[var(--color-skeleton)]" />
          </div>
        ))}
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
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const hasPlans = plans.length > 0;

  return (
    <section
      id="pricing"
      className="relative overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-bg)] py-16 sm:py-20 lg:py-24"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
              Simple pricing
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Start with what you need. Scale when it works.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">
              {hasPlans
                ? `Every plan includes a ${plans[0]?.trialDays ?? 14}-day trial with no credit card required.`
                : "Choose a plan that fits your locations, team, and automation needs."}
            </p>
          </div>

          {hasPlans ? (
            <div
              className="inline-flex w-fit rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm"
              aria-label="Billing interval"
            >
              {(["yearly", "monthly"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setInterval(option)}
                  aria-pressed={interval === option}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    interval === option
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {option === "monthly" ? "Monthly" : "Yearly"}
                  {option === "yearly" ? (
                    <span
                      className={`ml-2 text-[10px] font-bold uppercase tracking-[0.08em] ${
                        interval === "yearly"
                          ? "text-[var(--color-primary-fg)]/75"
                          : "text-emerald-600"
                      }`}
                    >
                      Save
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {!hasPlans ? (
          <PricingPlaceholder />
        ) : (
          <div className="mt-10 grid gap-5 lg:mt-14 lg:grid-cols-3 lg:items-stretch">
            {plans.map((plan) => {
              const displayedPrice =
                interval === "yearly" ? plan.yearlyMonthlyPrice : plan.price;
              const href = isLoggedIn
                ? registerHref
                : `${registerHref}?plan=${encodeURIComponent(plan.slug)}&interval=yearly`;

              return (
                <article
                  key={plan.slug}
                  className={`relative flex flex-col rounded-[1.6rem] border bg-[var(--color-bg)] p-6 shadow-[var(--shadow-sm)] sm:p-7 ${
                    plan.featured
                      ? "border-[var(--color-primary)] shadow-[0_24px_70px_-35px_color-mix(in_srgb,var(--color-primary)_55%,transparent)] lg:-translate-y-3"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  {plan.featured ? (
                    <span className="absolute right-5 top-5 rounded-full bg-[var(--color-primary)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-primary-fg)]">
                      Most popular
                    </span>
                  ) : null}

                  <div className="pr-24">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
                      {plan.title}
                    </p>
                    <p className="mt-3 min-h-12 text-sm leading-6 text-[var(--color-text-muted)]">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mt-6 border-y border-[var(--color-border)] py-6">
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-semibold tracking-[-0.045em] text-[var(--color-text)]">
                        {displayedPrice}
                      </span>
                      <span className="pb-1 text-sm font-medium text-[var(--color-text-muted)]">
                        /month
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                      {interval === "yearly"
                        ? `Billed once yearly at ${plan.yearlyPrice}`
                        : `Or ${plan.yearlyMonthlyPrice}/month billed yearly`}
                    </p>
                  </div>

                  <dl className="grid grid-cols-3 divide-x divide-[var(--color-border)] py-5 text-center">
                    <div className="px-1">
                      <dt className="text-[9px] uppercase tracking-wide text-[var(--color-text-subtle)]">
                        Locations
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                        {plan.includedLocations || "—"}
                      </dd>
                    </div>
                    <div className="px-1">
                      <dt className="text-[9px] uppercase tracking-wide text-[var(--color-text-subtle)]">
                        Members
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                        {plan.teamMemberLimit || "—"}
                      </dd>
                    </div>
                    <div className="px-1">
                      <dt className="text-[9px] uppercase tracking-wide text-[var(--color-text-subtle)]">
                        Voice min
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                        {plan.includedVoiceMinutes || "—"}
                      </dd>
                    </div>
                  </dl>

                  <ul className="flex-1 space-y-3 border-t border-[var(--color-border)] pt-5">
                    {plan.items.slice(0, 6).map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm leading-5 text-[var(--color-text-muted)]"
                      >
                        <svg
                          className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m5 12 4 4L19 6"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={href}
                    className={`mt-7 inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                      plan.featured
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-h)]"
                        : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    {isLoggedIn ? "Open dashboard" : `Choose ${plan.title}`}
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-9 text-center text-sm text-[var(--color-text-muted)]">
          Need help choosing?{" "}
          <a
            href="#contact"
            className="font-semibold text-[var(--color-primary-h)] hover:underline"
          >
            Talk with our team
          </a>
          .
        </p>
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { selectPlanAction } from "@/app/(protected)/onboarding/plan/actions";
import type { PlanSlug } from "@/lib/pricing-plans";

export type OnboardingPlanCard = {
  slug: PlanSlug;
  title: string;
  description: string;
  monthlyPrice: string;
  yearlyTotal: string;
  featured: boolean;
  highlights: string[];
  includedLocations: number;
  teamMemberLimit: number;
  includedVoiceMinutes: number;
};

function planDisplayPrice(
  plan: OnboardingPlanCard,
  interval: "monthly" | "yearly",
): { amount: string; suffix: string } {
  const amount = interval === "yearly" ? plan.yearlyTotal : plan.monthlyPrice;
  if (amount === "Custom" || amount === "—") {
    return { amount, suffix: "" };
  }
  return {
    amount,
    suffix: interval === "yearly" ? "/year" : "/month",
  };
}

export function OnboardingPlanPicker({
  plans,
  preselect,
  intervalDefault,
  trialDays,
  trialAvailable,
}: {
  plans: OnboardingPlanCard[];
  preselect: string;
  intervalDefault: "monthly" | "yearly";
  trialDays: number;
  trialAvailable: boolean;
}) {
  const [interval, setInterval] = useState<"monthly" | "yearly">(intervalDefault);
  const [selected, setSelected] = useState<PlanSlug>(
    (plans.find((plan) => plan.slug === preselect)?.slug ??
      plans.find((plan) => plan.featured)?.slug ??
      plans[0]?.slug) as PlanSlug,
  );
  const [pending, startTransition] = useTransition();

  const active = useMemo(
    () => plans.find((plan) => plan.slug === selected) ?? plans[0],
    [plans, selected],
  );

  if (!active) return null;

  const price = planDisplayPrice(active, interval);

  function submit() {
    if (!active) return;
    const formData = new FormData();
    formData.set("plan_slug", active.slug);
    formData.set("billing_interval", interval);
    startTransition(() => {
      void selectPlanAction(formData);
    });
  }

  return (
    <div className="space-y-6">
      <div
        className="flex rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1"
        role="group"
        aria-label="Billing interval"
      >
        {(["yearly", "monthly"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setInterval(value)}
            aria-pressed={interval === value}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition ${
              interval === value
                ? "bg-[var(--color-raised)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {value}
            {value === "yearly" ? (
              <span className="ml-1.5 text-[11px] font-medium text-[var(--color-primary-h)]">
                Save
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="space-y-3" role="radiogroup" aria-label="Plans">
        {plans.map((plan) => {
          const isSelected = selected === plan.slug;
          const planPrice = planDisplayPrice(plan, interval);

          return (
            <button
              key={plan.slug}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(plan.slug)}
              className={`group w-full rounded-[1.35rem] border px-5 py-5 text-left transition duration-200 sm:px-6 ${
                isSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[var(--shadow-md)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] hover:bg-[var(--color-raised)]"
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                      : "border-[var(--color-border-hover)] bg-transparent"
                  }`}
                  aria-hidden
                >
                  {isSelected ? (
                    <span className="size-1.5 rounded-full bg-[var(--color-primary-fg)]" />
                  ) : null}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-[var(--color-text)]">{plan.title}</p>
                    {plan.featured ? (
                      <span className="rounded-md bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary-fg)]">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                    {plan.description}
                  </p>

                  {isSelected ? (
                    <div className="mt-4 space-y-3 border-t border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] pt-4">
                      {plan.highlights.length ? (
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {plan.highlights.slice(0, 6).map((item) => (
                            <li
                              key={`${plan.slug}-${item}`}
                              className="flex gap-2 text-sm leading-5 text-[var(--color-text-muted)]"
                            >
                              <span
                                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                                aria-hidden
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Module details for this plan will appear once they are attached in Billing.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 whitespace-nowrap text-right">
                  <p className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                    {planPrice.amount}
                    {planPrice.suffix ? (
                      <span className="ml-1 text-xs font-medium text-[var(--color-text-muted)]">
                        {planPrice.suffix}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-4 z-10 rounded-[1.35rem] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {active.title}
              {price.amount !== "—" ? ` · ${price.amount}${price.suffix}` : ""}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
              {trialAvailable
                ? interval === "yearly"
                  ? `${active.yearlyTotal === "Custom" ? "Custom yearly pricing" : `${active.yearlyTotal}/year after trial`} · ${trialDays}-day free trial`
                  : `${trialDays}-day free trial · no card required`
                : "A free trial is not available after canceling. You’ll subscribe next."}
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? trialAvailable
                ? "Starting trial…"
                : "Continuing…"
              : trialAvailable
                ? `Start ${trialDays}-day trial`
                : "Continue to subscribe"}
          </button>
        </div>
      </div>
    </div>
  );
}

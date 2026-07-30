"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createBillingCheckoutSession } from "@/app/(protected)/billing/actions";
import type { CheckoutPlanOption } from "@/lib/billing-checkout-types";
import { formatUsd, type PlanSlug } from "@/lib/pricing-plans";
import { toast } from "@/lib/toast";

type BillingExpiredPlanPickerProps = {
  plans: CheckoutPlanOption[];
  initialPlanSlug: PlanSlug | null;
  initialInterval: "monthly" | "yearly";
  billingConfigured: boolean;
};

function displayPriceCents(
  plan: CheckoutPlanOption,
  interval: "monthly" | "yearly",
): number | null {
  return interval === "yearly" ? plan.yearlyPriceCents : plan.monthlyPriceCents;
}

export function BillingExpiredPlanPicker({
  plans,
  initialPlanSlug,
  initialInterval,
  billingConfigured,
}: BillingExpiredPlanPickerProps) {
  const defaultSlug =
    (initialPlanSlug && plans.some((plan) => plan.slug === initialPlanSlug)
      ? initialPlanSlug
      : plans.find((plan) => plan.featured)?.slug) ??
    plans[0]?.slug ??
    null;

  const [interval, setInterval] = useState<"monthly" | "yearly">(initialInterval);
  const [selected, setSelected] = useState<PlanSlug | null>(defaultSlug);
  const [pending, startTransition] = useTransition();
  const configToastShown = useRef(false);

  useEffect(() => {
    if (billingConfigured) return;
    if (configToastShown.current) return;
    configToastShown.current = true;

    toast.warning("Self-serve checkout is not configured yet", {
      description: "Billing API is missing. Complete billing setup before customers can subscribe.",
    });
  }, [billingConfigured]);

  const active = useMemo(
    () => plans.find((plan) => plan.slug === selected) ?? plans[0] ?? null,
    [plans, selected],
  );

  const priceCents = active ? displayPriceCents(active, interval) : null;
  const priceSuffix = interval === "yearly" ? "/yr" : "/mo";
  const hasPlanId = Boolean(
    active && (interval === "yearly" ? active.yearlyPlanId : active.monthlyPlanId),
  );
  const canCheckout = billingConfigured && Boolean(active) && hasPlanId;

  function startCheckout() {
    if (!active) return;
    startTransition(async () => {
      const result = await createBillingCheckoutSession({
        planSlug: active.slug,
        billingInterval: interval,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      window.location.assign(result.checkoutUrl);
    });
  }

  if (!plans.length) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-raised)] px-4 py-4 text-sm text-[var(--color-text-muted)]">
        No paid plans are available from Billing yet. Ask a platform admin to configure prices in
        Billing → Plans.
      </div>
    );
  }

  const highlights = active?.contents ?? [];

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
          const planPriceCents = displayPriceCents(plan, interval);
          const planAvailable = Boolean(
            interval === "yearly" ? plan.yearlyPlanId : plan.monthlyPlanId,
          );

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
                    <p className="text-base font-semibold text-[var(--color-text)]">{plan.name}</p>
                    {plan.featured ? (
                      <span className="rounded-md bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary-fg)]">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                    {plan.description}
                  </p>
                  {!planAvailable ? (
                    <p className="mt-2 text-[11px] font-medium text-amber-700 [[data-theme=dark]_&]:text-amber-300">
                      Not available for checkout
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                    {planPriceCents != null ? formatUsd(planPriceCents) : "Custom"}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {interval === "yearly" ? "/yr" : "/mo"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {active ? (
        <div
          key={active.slug}
          className="onboarding-panel-in overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-bg)]"
        >
          <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              Included with {active.name}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                {Number.isFinite(active.includedLocations)
                  ? `${active.includedLocations} location${active.includedLocations === 1 ? "" : "s"}`
                  : "Unlimited locations"}
              </span>
              <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                {Number.isFinite(active.teamMemberLimit)
                  ? `${active.teamMemberLimit} team seat${active.teamMemberLimit === 1 ? "" : "s"}`
                  : "Unlimited team seats"}
              </span>
              {active.includedVoiceMinutes > 0 ? (
                <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                  {Number.isFinite(active.includedVoiceMinutes)
                    ? `${active.includedVoiceMinutes} voice minutes`
                    : "Unlimited voice minutes"}
                </span>
              ) : (
                <span className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                  No voice minutes
                </span>
              )}
            </div>
          </div>
          {highlights.length ? (
            <ul className="grid gap-0 sm:grid-cols-2">
              {highlights.slice(0, 6).map((item) => (
                <li
                  key={`${active.slug}-${item}`}
                  className="flex gap-3 border-b border-[var(--color-border)] px-5 py-3.5 text-sm leading-6 text-[var(--color-text-muted)] last:border-b-0 sm:odd:border-r sm:px-6 sm:[&:nth-last-child(-n+2)]:border-b-0"
                >
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-[var(--color-text-muted)] sm:px-6">
              Module details for this plan will appear once they are attached in Billing.
            </p>
          )}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-10 rounded-[1.35rem] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {active?.name ?? "Plan"}
              {priceCents != null ? ` · ${formatUsd(priceCents)}${priceSuffix}` : ""}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
              {interval === "yearly"
                ? "Billed annually · access restores after payment"
                : "Billed monthly · access restores after payment"}
            </p>
          </div>
          <button
            type="button"
            disabled={!canCheckout || pending}
            onClick={startCheckout}
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? "Redirecting…"
              : priceCents != null
                ? `Subscribe · ${formatUsd(priceCents)}${priceSuffix}`
                : "Subscribe"}
          </button>
        </div>
      </div>
    </div>
  );
}

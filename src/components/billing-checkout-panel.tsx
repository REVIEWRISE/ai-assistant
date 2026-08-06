"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createBillingCheckoutSession } from "@/app/(protected)/billing/actions";
import type { CheckoutPlanOption } from "@/lib/billing-checkout-types";
import { formatUsd, type PlanSlug } from "@/lib/pricing-plans";
import { toast } from "@/lib/toast";

type BillingCheckoutPanelProps = {
  plans: CheckoutPlanOption[];
  initialPlanSlug: PlanSlug | null;
  initialInterval: "monthly" | "yearly";
  billingConfigured: boolean;
  mode?: "upgrade" | "subscribe";
};

export function BillingCheckoutPanel({
  plans,
  initialPlanSlug,
  initialInterval,
  billingConfigured,
  mode = "subscribe",
}: BillingCheckoutPanelProps) {
  const defaultSlug =
    (initialPlanSlug && plans.some((plan) => plan.slug === initialPlanSlug)
      ? initialPlanSlug
      : plans.find((plan) => plan.featured)?.slug) ??
    plans[0]?.slug ??
    null;

  const [planSlug, setPlanSlug] = useState<PlanSlug | null>(defaultSlug);
  const [interval, setInterval] = useState<"monthly" | "yearly">(initialInterval);
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

  const selected = plans.find((plan) => plan.slug === planSlug) ?? null;
  const priceCents =
    interval === "yearly" ? selected?.yearlyPriceCents : selected?.monthlyPriceCents;
  const hasPlanId = Boolean(
    selected && (interval === "yearly" ? selected.yearlyPlanId : selected.monthlyPlanId),
  );
  const canCheckout = billingConfigured && Boolean(selected) && hasPlanId;

  function startCheckout() {
    if (!planSlug) return;
    startTransition(async () => {
      const result = await createBillingCheckoutSession({
        planSlug,
        billingInterval: interval,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.alreadyActive) {
        toast.success("Subscription is already active.");
        window.location.assign("/dashboard?success=subscription_active");
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {mode === "upgrade" ? "Select your next plan" : "Select a plan to continue"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Billing is handled securely through Stripe checkout.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
          {(["monthly", "yearly"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setInterval(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                interval === value
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => {
          const selectedPlan = plan.slug === planSlug;
          const amount =
            interval === "yearly" ? plan.yearlyPriceCents : plan.monthlyPriceCents;
          const planAvailable = Boolean(
            interval === "yearly" ? plan.yearlyPlanId : plan.monthlyPlanId,
          );
          const isCurrent = plan.slug === initialPlanSlug;
          return (
            <button
              key={plan.slug}
              type="button"
              onClick={() => setPlanSlug(plan.slug)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                selectedPlan
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] ring-1 ring-[var(--color-primary)] shadow-[var(--shadow-sm)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-raised)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">{plan.name}</p>
                <div className="flex flex-wrap justify-end gap-1">
                  {isCurrent ? (
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                      Current
                    </span>
                  ) : null}
                  {plan.featured ? (
                    <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary-h)]">
                      Popular
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                {amount != null ? formatUsd(amount) : "Custom"}
                <span className="ml-1 text-xs font-medium text-[var(--color-text-muted)]">
                  {interval === "yearly" ? "/yr" : "/mo"}
                </span>
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                {plan.description}
              </p>
              {!planAvailable ? (
                <p className="mt-3 text-[11px] font-medium text-amber-700 [[data-theme=dark]_&]:text-amber-300">
                  Not available for checkout
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {selected?.name ?? "Select a plan"}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {interval === "yearly" ? "Billed annually" : "Billed monthly"}
            {priceCents != null ? ` · ${formatUsd(priceCents)}` : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={!canCheckout || pending}
          onClick={startCheckout}
          className="inline-flex min-h-11 items-center justify-center rounded-xl vr-btn-primary px-5 text-sm font-semibold shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-primary)_85%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Redirecting"
            : priceCents != null
              ? `${mode === "upgrade" ? "Upgrade" : "Subscribe"} · ${formatUsd(priceCents)}`
              : mode === "upgrade"
                ? "Upgrade"
                : "Subscribe"}
        </button>
      </div>
    </div>
  );
}

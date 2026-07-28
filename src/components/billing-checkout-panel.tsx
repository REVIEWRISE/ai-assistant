"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { createEmbeddedCheckoutSession } from "@/app/(protected)/billing/actions";
import type { CheckoutPlanOption } from "@/lib/billing-checkout-types";
import { formatUsd, type PlanSlug } from "@/lib/pricing-plans";
import { toast } from "@/lib/toast";

type BillingCheckoutPanelProps = {
  plans: CheckoutPlanOption[];
  initialPlanSlug: PlanSlug | null;
  initialInterval: "monthly" | "yearly";
  publishableKey: string | null;
  stripeConfigured: boolean;
  billingConfigured: boolean;
};

export function BillingCheckoutPanel({
  plans,
  initialPlanSlug,
  initialInterval,
  publishableKey,
  stripeConfigured,
  billingConfigured,
}: BillingCheckoutPanelProps) {
  const defaultSlug =
    (initialPlanSlug && plans.some((plan) => plan.slug === initialPlanSlug)
      ? initialPlanSlug
      : plans.find((plan) => plan.featured)?.slug) ??
    plans[0]?.slug ??
    null;

  const [planSlug, setPlanSlug] = useState<PlanSlug | null>(defaultSlug);
  const [interval, setInterval] = useState<"monthly" | "yearly">(initialInterval);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const configToastShown = useRef(false);

  useEffect(() => {
    if (stripeConfigured && billingConfigured) return;
    if (configToastShown.current) return;
    configToastShown.current = true;

    const missing = [
      !billingConfigured ? "Billing API" : null,
      !stripeConfigured ? "Stripe keys" : null,
    ].filter(Boolean);

    toast.warning("Self-serve checkout is not fully configured yet", {
      description: `${missing.join(" and ")} missing. Complete billing setup before customers can subscribe.`,
    });
  }, [stripeConfigured, billingConfigured]);

  const selected = plans.find((plan) => plan.slug === planSlug) ?? null;
  const priceCents =
    interval === "yearly" ? selected?.yearlyPriceCents : selected?.monthlyPriceCents;
  const canCheckout =
    stripeConfigured &&
    billingConfigured &&
    Boolean(publishableKey) &&
    Boolean(selected) &&
    Boolean(
      interval === "yearly" ? selected?.yearlyStripePriceId : selected?.monthlyStripePriceId,
    );

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  function startCheckout() {
    if (!planSlug) return;
    setError(null);
    startTransition(async () => {
      const result = await createEmbeddedCheckoutSession({
        planSlug,
        billingInterval: interval,
      });
      if (!result.ok) {
        setClientSecret(null);
        setError(result.error);
        return;
      }
      setClientSecret(result.clientSecret);
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

  if (clientSecret && stripePromise) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Complete payment</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {selected?.name} · {interval === "yearly" ? "Yearly" : "Monthly"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setClientSecret(null);
              setError(null);
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
          >
            Change plan
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-2">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">Subscribe to restore access</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Pay here without leaving your workspace. Card details are handled by Stripe.
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
          const hasStripe =
            interval === "yearly" ? plan.yearlyStripePriceId : plan.monthlyStripePriceId;
          return (
            <button
              key={plan.slug}
              type="button"
              onClick={() => setPlanSlug(plan.slug)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                selectedPlan
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-[var(--shadow-sm)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)]/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">{plan.name}</p>
                {plan.featured ? (
                  <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                {amount != null ? formatUsd(amount) : "Custom"}
                <span className="ml-1 text-xs font-medium text-[var(--color-text-muted)]">
                  {interval === "yearly" ? "/yr" : "/mo"}
                </span>
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">
                {plan.description}
              </p>
              {!hasStripe ? (
                <p className="mt-3 text-[11px] font-medium text-amber-700">Stripe price not linked</p>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canCheckout || pending}
          onClick={startCheckout}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Starting checkout…"
            : priceCents != null
              ? `Subscribe · ${formatUsd(priceCents)}`
              : "Subscribe"}
        </button>
      </div>
    </div>
  );
}

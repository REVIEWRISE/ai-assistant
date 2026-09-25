"use client";

import { useState } from "react";
import { CustomerRefundSheet } from "@/components/customer-refund-sheet";
import {
  REFUND_TYPES,
  formatCents,
  labelForRefundReason,
} from "@/lib/refund-reasons";

export type SubscriptionRefundView = {
  canRequest: boolean;
  paidAt?: string | null;
  planPriceCents?: number | null;
  credits?: {
    totalBalanceCents: number;
    expiring?: string | null;
  } | null;
  latest: {
    id: string;
    status: string;
    reason: string;
    notes: string;
    amountCents?: number | null;
    currency?: string | null;
    adminNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
};

export type SubscriptionViewModel = {
  workspaceName: string;
  planName: string;
  planPositioning?: string | null;
  billingStatus: string;
  billingInterval: string | null;
  trialEndsAt: string | null;
  paidAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  canCancel: boolean;
  canUpgrade: boolean;
  isOwner: boolean;
  refund: SubscriptionRefundView;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusMeta(status: string): {
  label: string;
  badge: string;
  dot: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        badge:
          "border-emerald-200 bg-emerald-50 text-emerald-800 [[data-theme=dark]_&]:border-emerald-500/30 [[data-theme=dark]_&]:bg-emerald-500/15 [[data-theme=dark]_&]:text-emerald-200",
        dot: "bg-emerald-600 [[data-theme=dark]_&]:bg-emerald-400",
      };
    case "trialing":
      return {
        label: "Trialing",
        badge:
          "border-sky-200 bg-sky-50 text-sky-800 [[data-theme=dark]_&]:border-sky-500/30 [[data-theme=dark]_&]:bg-sky-500/15 [[data-theme=dark]_&]:text-sky-200",
        dot: "bg-sky-600 [[data-theme=dark]_&]:bg-sky-400",
      };
    case "past_due":
      return {
        label: "Past due",
        badge:
          "border-amber-200 bg-amber-50 text-amber-900 [[data-theme=dark]_&]:border-amber-500/30 [[data-theme=dark]_&]:bg-amber-500/15 [[data-theme=dark]_&]:text-amber-200",
        dot: "bg-amber-600 [[data-theme=dark]_&]:bg-amber-400",
      };
    case "expired":
      return {
        label: "Expired",
        badge:
          "border-rose-200 bg-rose-50 text-rose-800 [[data-theme=dark]_&]:border-rose-500/30 [[data-theme=dark]_&]:bg-rose-500/15 [[data-theme=dark]_&]:text-rose-200",
        dot: "bg-rose-600 [[data-theme=dark]_&]:bg-rose-400",
      };
    default:
      return {
        label: status ? status.replace(/_/g, " ") : "No plan",
        badge:
          "border-neutral-200 bg-neutral-100 text-neutral-800 [[data-theme=dark]_&]:border-neutral-700 [[data-theme=dark]_&]:bg-neutral-800 [[data-theme=dark]_&]:text-neutral-200",
        dot: "bg-neutral-500",
      };
  }
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-[var(--color-text)]">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{hint}</p> : null}
    </div>
  );
}

export function SubscriptionPanel({ subscription }: { subscription: SubscriptionViewModel }) {
  const [isRefundSheetOpen, setIsRefundSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "view">("create");

  const tone = statusMeta(subscription.billingStatus);
  const isTrialing = subscription.billingStatus === "trialing";
  const intervalLabel = subscription.billingInterval
    ? subscription.billingInterval.charAt(0).toUpperCase() + subscription.billingInterval.slice(1)
    : null;

  const latestRefund = subscription.refund.latest;
  const refundUnderReview = latestRefund?.status === "pending";
  const creditsBalance = subscription.refund.credits?.totalBalanceCents ?? 0;

  const facts = [
    {
      label: "Paid at",
      value: formatDate(subscription.paidAt),
      hint: subscription.paidAt ? "Last payment" : "No payment yet",
    },
    {
      label: isTrialing ? "Trial ends" : "Period ends",
      value: formatDate(isTrialing ? subscription.trialEndsAt : subscription.currentPeriodEndsAt),
      hint: subscription.cancelAtPeriodEnd
        ? "Access ends · won’t renew"
        : isTrialing
          ? "Free trial window"
          : subscription.currentPeriodEndsAt
            ? "Renewal or cutoff"
            : "No billing period",
    },
    {
      label: isTrialing ? "Bills as" : "Interval",
      value: intervalLabel
        ? isTrialing
          ? `${intervalLabel} after trial`
          : intervalLabel
        : "—",
      hint: isTrialing ? "When you subscribe" : "Billing cadence",
    },
    {
      label: "Workspace",
      value: subscription.workspaceName,
      hint: "Active organization",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Store Credit Balance Banner */}
      {creditsBalance > 0 ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[1.35rem] border border-emerald-500/30 bg-emerald-500/10 p-5 [[data-theme=dark]_&]:bg-emerald-950/30">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 [[data-theme=dark]_&]:text-emerald-400">
              Account Store Credit
            </p>
            <p className="text-xl font-extrabold text-[var(--color-text)]">
              {formatCents(creditsBalance)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Your available store credit will be applied automatically toward renewals or invoices.
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 [[data-theme=dark]_&]:text-emerald-300">
            Active credit
          </span>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Subscription
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--color-text)]">
              {subscription.planName}
            </h2>
            {subscription.planPositioning ? (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {subscription.planPositioning}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}
            >
              <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
              {tone.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
          {facts.map((fact) => (
            <MetricCard key={fact.label} label={fact.label} value={fact.value} hint={fact.hint} />
          ))}
        </div>
      </section>

      {/* Refunds and Credits Section */}
      <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Refunds & Store Credit Guarantee
            </p>
            <h3 className="mt-1 text-base font-semibold tracking-tight text-[var(--color-text)]">
              Money-back guarantee & credit options
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              Full refunds within 30 days of purchase · Flexible partial refunds and store credit anytime
            </p>
          </div>

          <div>
            {refundUnderReview ? (
              <button
                type="button"
                onClick={() => {
                  setSheetMode("view");
                  setIsRefundSheetOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/25 [[data-theme=dark]_&]:text-amber-300"
              >
                <span>⏳</span>
                <span>Request Under Review · View Details</span>
              </button>
            ) : subscription.refund.canRequest && subscription.isOwner ? (
              <button
                type="button"
                onClick={() => {
                  setSheetMode("create");
                  setIsRefundSheetOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--color-primary-h)]"
              >
                <span>↺</span>
                <span>Request a refund or credit</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {/* Policy summary table */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {REFUND_TYPES.map((t) => (
              <div
                key={t.value}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-text)]">{t.label}</span>
                  {t.windowDays ? (
                    <span className="rounded-full bg-[var(--color-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
                      {t.windowDays}d window
                    </span>
                  ) : (
                    <span className="rounded-full bg-[var(--color-raised)] px-2 py-0.5 text-[10px] font-medium text-emerald-600 [[data-theme=dark]_&]:text-emerald-400">
                      Anytime
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                  {t.description}
                </p>
              </div>
            ))}
          </div>

          {/* Active / Latest Refund Request Card */}
          {latestRefund ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      latestRefund.status === "pending"
                        ? "bg-amber-500/15 text-amber-600 [[data-theme=dark]_&]:text-amber-400"
                        : latestRefund.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-600 [[data-theme=dark]_&]:text-emerald-400"
                          : "bg-rose-500/15 text-rose-600 [[data-theme=dark]_&]:text-rose-400"
                    }`}
                  >
                    {latestRefund.status === "pending"
                      ? "Under review"
                      : latestRefund.status === "approved"
                        ? "Approved"
                        : "Rejected"}
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-text)]">
                    {labelForRefundReason(latestRefund.reason.replace(/^\[[^\]]+\]\s*/, ""))}
                  </span>
                  {latestRefund.amountCents != null && latestRefund.amountCents > 0 ? (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      ({formatCents(latestRefund.amountCents, latestRefund.currency ?? "USD")})
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Submitted {formatDate(latestRefund.createdAt)}
                  {latestRefund.reviewedAt ? ` · Reviewed ${formatDate(latestRefund.reviewedAt)}` : ""}
                </p>
                {latestRefund.adminNote ? (
                  <p className="mt-1 text-xs text-[var(--color-text)]">
                    <span className="font-semibold text-[var(--color-text-muted)]">Admin note: </span>
                    {latestRefund.adminNote}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSheetMode("view");
                  setIsRefundSheetOpen(true);
                }}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] hover:shadow-sm"
              >
                View full status ➔
              </button>
            </div>
          ) : null}

          {!subscription.refund.canRequest && !latestRefund ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-xs leading-relaxed text-[var(--color-text-muted)]">
              💡 <span className="font-semibold text-[var(--color-text)]">Trial Active:</span> Refunds are available after a paid billing cycle. Because this workspace is on a free trial, no payment has occurred yet. You can cancel anytime without being charged.
            </div>
          ) : null}

          {!subscription.isOwner && subscription.refund.canRequest && !latestRefund ? (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
              Ask a workspace owner if you need to submit a refund request.
            </p>
          ) : null}
        </div>
      </section>

      {/* Customer Refund Slide-over Sheet */}
      <CustomerRefundSheet
        key={`${isRefundSheetOpen}-${sheetMode}`}
        isOpen={isRefundSheetOpen}
        onClose={() => setIsRefundSheetOpen(false)}
        initialMode={sheetMode}
        workspaceName={subscription.workspaceName}
        planName={subscription.planName}
        billingInterval={subscription.billingInterval}
        paidAt={subscription.paidAt}
        planPriceCents={subscription.refund.planPriceCents}
        creditsBalance={creditsBalance}
        existingRequest={latestRefund}
      />
    </div>
  );
}

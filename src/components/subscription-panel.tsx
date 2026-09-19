"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestWorkspaceRefund } from "@/app/(protected)/subscription/refund-actions";
import { REFUND_REASON_OPTIONS, labelForRefundReason } from "@/lib/refund-reasons";
import { toast } from "@/lib/toast";

export type SubscriptionRefundView = {
  canRequest: boolean;
  latest: {
    id: string;
    status: string;
    reason: string;
    notes: string;
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
        dot: "bg-sky-600 [[data-theme=dark]_&]:bg-sky-300",
      };
    case "expired":
      return {
        label: "Expired",
        badge:
          "border-red-200 bg-red-50 text-red-800 [[data-theme=dark]_&]:border-red-500/30 [[data-theme=dark]_&]:bg-red-500/15 [[data-theme=dark]_&]:text-red-200",
        dot: "bg-red-600 [[data-theme=dark]_&]:bg-red-400",
      };
    default:
      return {
        label: "Needs plan",
        badge:
          "border-amber-200 bg-amber-50 text-amber-900 [[data-theme=dark]_&]:border-amber-500/30 [[data-theme=dark]_&]:bg-amber-500/15 [[data-theme=dark]_&]:text-amber-200",
        dot: "bg-amber-600 [[data-theme=dark]_&]:bg-amber-400",
      };
  }
}

function Fact({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-[var(--color-text)]">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{hint}</p> : null}
    </div>
  );
}

export function SubscriptionPanel({ subscription }: { subscription: SubscriptionViewModel }) {
  const router = useRouter();
  const [refundPending, startRefundTransition] = useTransition();
  const [refundReason, setRefundReason] = useState<(typeof REFUND_REASON_OPTIONS)[number]["value"]>(
    "accidental_purchase",
  );
  const [refundNotes, setRefundNotes] = useState("");
  const tone = statusMeta(subscription.billingStatus);
  const isTrialing = subscription.billingStatus === "trialing";
  const accessEndsAt = subscription.currentPeriodEndsAt ?? subscription.trialEndsAt;
  const intervalLabel = subscription.billingInterval
    ? subscription.billingInterval.charAt(0).toUpperCase() + subscription.billingInterval.slice(1)
    : null;

  const latestRefund = subscription.refund.latest;
  const refundUnderReview = latestRefund?.status === "pending";
  const showRefundForm =
    subscription.refund.canRequest &&
    subscription.isOwner &&
    !refundUnderReview &&
    latestRefund?.status !== "approved";

  function onRequestRefund() {
    startRefundTransition(async () => {
      const result = await requestWorkspaceRefund({
        reason: refundReason,
        notes: refundNotes,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Refund request submitted. We’ll review it shortly.");
      setRefundNotes("");
      router.refresh();
    });
  }

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
      <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              Current plan
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
                {subscription.planName}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}
              >
                <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
                {tone.label}
              </span>
              {subscription.cancelAtPeriodEnd ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 [[data-theme=dark]_&]:border-amber-500/30 [[data-theme=dark]_&]:bg-amber-500/15 [[data-theme=dark]_&]:text-amber-200">
                  Cancels {formatDate(accessEndsAt)}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
              {subscription.planPositioning?.trim() || `Plan for ${subscription.workspaceName}.`}
            </p>
          </div>
          {subscription.billingStatus === "expired" ? (
            <Link
              href="/billing/expired"
              className="rounded-xl vr-btn-primary px-4 py-2.5 text-sm font-semibold"
            >
              View plans
            </Link>
          ) : subscription.canUpgrade ? (
            <Link
              href="/billing?error=upgrade_required"
              className="rounded-xl vr-btn-primary px-4 py-2.5 text-sm font-semibold"
            >
              Upgrade plan
            </Link>
          ) : null}
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {facts.map((fact) => (
            <Fact key={fact.label} {...fact} />
          ))}
        </div>
      </section>

      {subscription.canCancel ? (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--color-border)] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Refunds
              </p>
              <h3 className="mt-1.5 text-base font-semibold tracking-tight text-[var(--color-text)]">
                Request a refund
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                Reviewed by our team.
              </p>
            </div>

            <div className="space-y-3 p-5">
              {latestRefund ? (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    Latest request
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {latestRefund.status === "pending"
                      ? "Under review"
                      : latestRefund.status === "approved"
                        ? "Approved"
                        : "Rejected"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    {labelForRefundReason(latestRefund.reason)}
                    {" · "}
                    Submitted {formatDate(latestRefund.createdAt)}
                    {latestRefund.reviewedAt
                      ? ` · Reviewed ${formatDate(latestRefund.reviewedAt)}`
                      : ""}
                  </p>
                  {latestRefund.status === "rejected" && latestRefund.adminNote ? (
                    <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                      Note: {latestRefund.adminNote}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {showRefundForm ? (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Reason</span>
                    <select
                      value={refundReason}
                      onChange={(e) =>
                        setRefundReason(e.target.value as (typeof REFUND_REASON_OPTIONS)[number]["value"])
                      }
                      disabled={refundPending}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                    >
                      {REFUND_REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text)]">
                      Details <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                    </span>
                    <textarea
                      value={refundNotes}
                      onChange={(e) => setRefundNotes(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      disabled={refundPending}
                      placeholder="Anything that helps us review your request"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={refundPending}
                    onClick={onRequestRefund}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:opacity-50"
                  >
                    {refundPending ? "Submitting…" : "Submit refund request"}
                  </button>
                </>
              ) : null}

              {!subscription.refund.canRequest && !latestRefund ? (
                <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Refunds are available after a paid subscription. This workspace is still on a free trial, so there is no charge to refund yet.
                </p>
              ) : null}

              {!subscription.isOwner && subscription.refund.canRequest && !latestRefund ? (
                <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Ask a workspace owner if you need to request a refund.
                </p>
              ) : null}

              {refundUnderReview ? (
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  We’ll notify you after review.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Manage
          </p>
          <h3 className="mt-1.5 text-base font-semibold text-[var(--color-text)]">No active billing</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
            Choose a plan when you are ready to subscribe.
          </p>
          <Link
            href="/billing?error=upgrade_required"
            className="mt-4 inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
          >
            View plans
          </Link>
        </section>
      )}
    </div>
  );
}

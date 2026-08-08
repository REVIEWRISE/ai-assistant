"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelActiveWorkspaceSubscription } from "@/app/(protected)/subscription/actions";
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
  canCancel: boolean;
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

function CancelConfirmModal({
  open,
  pending,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, pending, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close confirmation"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-confirm-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-danger)]">
              Confirm cancel
            </p>
            <h2
              id="cancel-confirm-title"
              className="mt-1 text-lg font-semibold text-[var(--color-text)]"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)] disabled:opacity-50"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 p-5">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:opacity-50"
          >
            Keep plan
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Canceling…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function SubscriptionPanel({ subscription }: { subscription: SubscriptionViewModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [refundPending, startRefundTransition] = useTransition();
  const [cancelMode, setCancelMode] = useState<"period_end" | "now">("period_end");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [refundReason, setRefundReason] = useState<(typeof REFUND_REASON_OPTIONS)[number]["value"]>(
    "accidental_purchase",
  );
  const [refundNotes, setRefundNotes] = useState("");
  const tone = statusMeta(subscription.billingStatus);
  const isTrialing = subscription.billingStatus === "trialing";
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

  function onCancel() {
    startTransition(async () => {
      const result = await cancelActiveWorkspaceSubscription({ mode: cancelMode });
      setConfirmCancel(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.mode === "now"
          ? "Subscription canceled. Access has been revoked."
          : "Subscription will end after the current period.",
      );
      if (result.mode === "now") {
        window.location.assign("/onboarding/plan?success=subscription_canceled");
        return;
      }
      window.location.assign("/subscription?success=cancel_scheduled");
    });
  }

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
      value: formatDate(
        isTrialing ? subscription.trialEndsAt : subscription.currentPeriodEndsAt,
      ),
      hint: isTrialing
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
            </div>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
              {subscription.planPositioning?.trim() || `Plan for ${subscription.workspaceName}.`}
            </p>
          </div>
          <Link
            href="/billing?error=upgrade_required"
            className="rounded-xl vr-btn-primary px-4 py-2.5 text-sm font-semibold"
          >
            Upgrade plan
          </Link>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {facts.map((fact) => (
            <Fact key={fact.label} {...fact} />
          ))}
        </div>
      </section>

      {subscription.canCancel ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Manage
              </p>
              <h3 className="mt-1.5 text-base font-semibold tracking-tight text-[var(--color-text)]">
                Cancel subscription
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                {subscription.isOwner
                  ? "Pick when access should end."
                  : "Only workspace owners can cancel billing."}
              </p>
            </div>

            {subscription.isOwner ? (
              <div className="space-y-3 p-5">
                <fieldset className="space-y-2" disabled={pending}>
                  <legend className="sr-only">When to cancel</legend>
                  {(
                    [
                      {
                        value: "period_end" as const,
                        title: "At period end",
                        body: subscription.currentPeriodEndsAt
                          ? `Keep access until ${formatDate(subscription.currentPeriodEndsAt)}.`
                          : "Keep access until the current period finishes.",
                        badge: "Recommended",
                      },
                      {
                        value: "now" as const,
                        title: "Cancel immediately",
                        body: "Revoke access as soon as you confirm.",
                        badge: null,
                      },
                    ] as const
                  ).map((option) => {
                    const selected = cancelMode === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer gap-3 rounded-xl border px-3.5 py-3 transition ${
                          selected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                            : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]"
                        } ${pending ? "pointer-events-none opacity-60" : ""}`}
                      >
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                          <span
                            className={`flex size-4 items-center justify-center rounded-full border-2 ${
                              selected
                                ? "border-[var(--color-primary)]"
                                : "border-[var(--color-border-hover)]"
                            }`}
                            aria-hidden
                          >
                            {selected ? (
                              <span className="size-2 rounded-full bg-[var(--color-primary)]" />
                            ) : null}
                          </span>
                          <input
                            type="radio"
                            name="cancel_mode"
                            value={option.value}
                            checked={selected}
                            onChange={() => {
                              setCancelMode(option.value);
                              setConfirmCancel(false);
                            }}
                            className="sr-only"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--color-text)]">
                              {option.title}
                            </span>
                            {option.badge ? (
                              <span className="rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary-h)]">
                                {option.badge}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-text-muted)]">
                            {option.body}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmCancel(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:opacity-50"
                >
                  Continue to cancel
                  <span aria-hidden>→</span>
                </button>
              </div>
            ) : (
              <div className="p-5">
                <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Ask a workspace owner if you need this subscription ended.
                </p>
              </div>
            )}
          </section>

          <CancelConfirmModal
            open={confirmCancel}
            pending={pending}
            title={
              cancelMode === "now"
                ? "Cancel now and end access?"
                : "Schedule end of subscription?"
            }
            description={
              cancelMode === "now"
                ? `${subscription.workspaceName} will lose paid features immediately.`
                : subscription.currentPeriodEndsAt
                  ? `Access continues until ${formatDate(subscription.currentPeriodEndsAt)}. You can resubscribe later.`
                  : "Access continues until the current period ends. You can resubscribe later."
            }
            confirmLabel={
              cancelMode === "now" ? "Yes, cancel now" : "Yes, cancel at period end"
            }
            onClose={() => setConfirmCancel(false)}
            onConfirm={onCancel}
          />

          <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--color-border)] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Refunds
              </p>
              <h3 className="mt-1.5 text-base font-semibold tracking-tight text-[var(--color-text)]">
                Request a refund
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                Reviewed by our team. Separate from canceling.
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
                  We’ll notify you after review. You can still cancel separately if you want access to end.
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
            There is nothing to cancel right now. Choose a plan when you are ready to subscribe.
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

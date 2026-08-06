"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelActiveWorkspaceSubscription } from "@/app/(protected)/subscription/actions";
import { toast } from "@/lib/toast";

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

function TimelineItem({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="relative pl-6">
      <span
        className={`absolute left-0 top-1.5 size-2.5 rounded-full ring-4 ring-[var(--color-surface)] ${
          accent
            ? "bg-[var(--color-primary)]"
            : "bg-[var(--color-border)]"
        }`}
        aria-hidden
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-semibold tracking-tight ${
          accent ? "text-[var(--color-text)]" : "text-[var(--color-text)]"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{hint}</p> : null}
    </div>
  );
}

export function SubscriptionPanel({ subscription }: { subscription: SubscriptionViewModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelMode, setCancelMode] = useState<"period_end" | "now">("period_end");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const tone = statusMeta(subscription.billingStatus);
  const intervalLabel = subscription.billingInterval
    ? subscription.billingInterval.charAt(0).toUpperCase() + subscription.billingInterval.slice(1)
    : null;

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
          ? "Subscription canceled. Access will update shortly."
          : "Subscription will end after the current period.",
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_8%,var(--color-bg)),var(--color-surface)_55%)] px-5 py-6 sm:px-6">
          <div
            className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
                Current plan
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)]">
                {subscription.planName}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--color-text-muted)]">
                {subscription.planPositioning?.trim() ||
                  `Plan for ${subscription.workspaceName}.`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}
                >
                  <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
                  {tone.label}
                </span>
                {intervalLabel ? (
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                    {intervalLabel} billing
                  </span>
                ) : null}
              </div>
            </div>

            <Link
              href="/billing?error=upgrade_required"
              className="rounded-xl vr-btn-primary px-4 py-2.5 text-sm font-semibold shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-primary)_85%,transparent)]"
            >
              Upgrade plan
            </Link>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-6 sm:grid-cols-2 sm:px-6">
          <div className="space-y-5 border-l border-[var(--color-border)]">
            <TimelineItem
              label="Paid at"
              value={formatDate(subscription.paidAt)}
              hint={subscription.paidAt ? "Last successful payment" : "No payment on file"}
              accent={Boolean(subscription.paidAt)}
            />
            <TimelineItem
              label="Period ends"
              value={formatDate(subscription.currentPeriodEndsAt)}
              hint={
                subscription.currentPeriodEndsAt
                  ? "Renewal or access cutoff"
                  : "No active billing period"
              }
              accent={Boolean(subscription.currentPeriodEndsAt)}
            />
          </div>
          <div className="space-y-5 border-l border-[var(--color-border)]">
            <TimelineItem
              label="Trial ends"
              value={formatDate(subscription.trialEndsAt)}
              hint={subscription.trialEndsAt ? "Trial window" : "No trial on this workspace"}
            />
            <TimelineItem
              label="Workspace"
              value={subscription.workspaceName}
              hint="Active organization"
            />
          </div>
        </div>
      </section>

      <div className="space-y-5">
        <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            At a glance
          </p>
          <dl className="mt-4 space-y-0">
            {[
              { label: "Plan", value: subscription.planName },
              { label: "Status", value: tone.label },
              { label: "Interval", value: intervalLabel ?? "—" },
              {
                label: "Next date",
                value: formatDate(
                  subscription.currentPeriodEndsAt ?? subscription.trialEndsAt,
                ),
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-3 last:border-0"
              >
                <dt className="text-xs font-semibold text-[var(--color-text-muted)]">{row.label}</dt>
                <dd className="text-right text-sm font-semibold capitalize text-[var(--color-text)]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {subscription.canCancel ? (
          <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Manage
            </p>
            <h3 className="mt-2 text-base font-semibold text-[var(--color-text)]">
              Cancel subscription
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-[var(--color-text-muted)]">
              {subscription.isOwner
                ? "Choose when access should end. Period-end keeps features until your current cycle finishes."
                : "Only workspace owners can cancel billing for this organization."}
            </p>

            {subscription.isOwner ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-2">
                  {(
                    [
                      {
                        value: "period_end" as const,
                        title: "Cancel at period end",
                        body: "Keep access until the current period ends.",
                      },
                      {
                        value: "now" as const,
                        title: "Cancel now",
                        body: "Revoke access immediately after confirmation.",
                      },
                    ] as const
                  ).map((option) => {
                    const selected = cancelMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setCancelMode(option.value);
                          setConfirmCancel(false);
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          selected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] ring-1 ring-[var(--color-primary)]"
                            : "border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-raised)]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[var(--color-text)]">{option.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-[var(--color-text-muted)]">
                          {option.body}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {!confirmCancel ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmCancel(true)}
                    className="w-full rounded-xl border border-red-300/80 bg-transparent px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50 [[data-theme=dark]_&]:border-red-500/40 [[data-theme=dark]_&]:text-red-300 [[data-theme=dark]_&]:hover:bg-red-500/10"
                  >
                    Continue to cancel
                  </button>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 [[data-theme=dark]_&]:border-red-500/30 [[data-theme=dark]_&]:bg-red-500/10">
                    <p className="text-sm font-medium text-red-800 [[data-theme=dark]_&]:text-red-200">
                      {cancelMode === "now"
                        ? "Cancel now and revoke access for this workspace?"
                        : "Schedule cancellation for the end of the current period?"}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirmCancel(false)}
                        className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text)]"
                      >
                        Keep plan
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={onCancel}
                        className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {pending ? "Canceling…" : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        ) : (
          <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Manage
            </p>
            <h3 className="mt-2 text-base font-semibold text-[var(--color-text)]">No active billing</h3>
            <p className="mt-1.5 text-sm leading-6 text-[var(--color-text-muted)]">
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
    </div>
  );
}

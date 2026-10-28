"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DataTablePagination } from "@/components/data-table";
import { CustomSelect } from "@/components/custom-select";
import {
  adminUpdateOrganizationPlan,
  adminCancelOrganizationSubscription,
  adminRestoreOrganizationSubscription,
  adminPauseOrganizationSubscription,
  adminSuspendOrganizationBilling,
} from "@/app/(protected)/billing-admin/organizations/actions";
import { toast } from "@/lib/toast";
import { PLAN_SLUGS, getPlanBySlug, type PlanSlug } from "@/lib/pricing-plans";

export type BillingOrganizationRow = {
  id: string;
  name: string;
  planSlug: string | null;
  billingStatus: string | null;
  billingInterval: string | null;
  trialEndsAt: string | null;
  paidAt: string | null;
  currentPeriodEndsAt: string | null;
  createdAt: string;
  memberCount: number;
  cancelAtPeriodEnd: boolean;
  billingAdminOverride: boolean;
};

type StatusFilter = "all" | "needs_plan" | "trialing" | "active" | "expired";
type IntervalOption = "monthly" | "yearly";

type BillingOrganizationsManagerProps = {
  organizations: BillingOrganizationRow[];
};

const PLAN_OPTIONS = PLAN_SLUGS.map((slug) => ({
  value: slug,
  label: getPlanBySlug(slug).name,
}));

const INTERVAL_OPTIONS: Array<{ value: IntervalOption; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function normalizeStatus(status: string | null): StatusFilter {
  const value = (status || "needs_plan").toLowerCase();
  if (value === "trialing" || value === "active" || value === "expired") return value;
  return "needs_plan";
}

function planLabel(slug: string | null): string {
  if (!slug) return "No plan";
  if ((PLAN_SLUGS as readonly string[]).includes(slug)) {
    return getPlanBySlug(slug as PlanSlug).name;
  }
  return slug.replace(/_/g, " ");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusTone(status: StatusFilter): {
  label: string;
  className: string;
  dot: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-800 [[data-theme=dark]_&]:border-emerald-500/30 [[data-theme=dark]_&]:bg-emerald-500/15 [[data-theme=dark]_&]:text-emerald-200",
        dot: "bg-emerald-600 [[data-theme=dark]_&]:bg-emerald-400",
      };
    case "trialing":
      return {
        label: "Trialing",
        className:
          "border-sky-200 bg-sky-50 text-sky-800 [[data-theme=dark]_&]:border-sky-500/30 [[data-theme=dark]_&]:bg-sky-500/15 [[data-theme=dark]_&]:text-sky-200",
        dot: "bg-sky-600 [[data-theme=dark]_&]:bg-sky-400",
      };
    case "expired":
      return {
        label: "Expired",
        className:
          "border-red-200 bg-red-50 text-red-800 [[data-theme=dark]_&]:border-red-500/30 [[data-theme=dark]_&]:bg-red-500/15 [[data-theme=dark]_&]:text-red-200",
        dot: "bg-red-600 [[data-theme=dark]_&]:bg-red-400",
      };
    default:
      return {
        label: "Needs plan",
        className:
          "border-amber-200 bg-amber-50 text-amber-900 [[data-theme=dark]_&]:border-amber-500/30 [[data-theme=dark]_&]:bg-amber-500/15 [[data-theme=dark]_&]:text-amber-200",
        dot: "bg-amber-600 [[data-theme=dark]_&]:bg-amber-400",
      };
  }
}

function timelineCopy(org: BillingOrganizationRow): { primary: string; secondary: string } {
  const status = normalizeStatus(org.billingStatus);
  if (org.cancelAtPeriodEnd) {
    return {
      primary: org.currentPeriodEndsAt
        ? `Cancels ${formatDate(org.currentPeriodEndsAt)}`
        : "Cancel scheduled",
      secondary: org.paidAt
        ? `Paid ${formatDate(org.paidAt)}`
        : `Created ${formatDate(org.createdAt)}`,
    };
  }
  if (org.paidAt) {
    return {
      primary: `Paid ${formatDate(org.paidAt)}`,
      secondary: org.currentPeriodEndsAt
        ? `Period ends ${formatDate(org.currentPeriodEndsAt)}`
        : `Created ${formatDate(org.createdAt)}`,
    };
  }
  if (status === "trialing" && org.trialEndsAt) {
    return {
      primary: `Trial ends ${formatDate(org.trialEndsAt)}`,
      secondary: `Created ${formatDate(org.createdAt)}`,
    };
  }
  if (status === "expired" && org.trialEndsAt) {
    return {
      primary: `Trial ended ${formatDate(org.trialEndsAt)}`,
      secondary: "Not paid",
    };
  }
  return {
    primary: "Not paid",
    secondary: `Created ${formatDate(org.createdAt)}`,
  };
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "needs_plan", label: "Needs plan" },
  { id: "trialing", label: "Trialing" },
  { id: "active", label: "Active" },
  { id: "expired", label: "Expired" },
];

type BillingSheetAction =
  | "change_plan"
  | "resume"
  | "pause"
  | "cancel"
  | "suspend";

type ActionTone = "default" | "success" | "warn" | "danger";

function MetaChip({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[12px] font-medium text-white/90">{value}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-muted)]">
      {children}
    </span>
  );
}

function OrganizationBillingSheet({
  organization,
  onClose,
}: {
  organization: BillingOrganizationRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [entered, setEntered] = useState(false);
  const status = normalizeStatus(organization.billingStatus);
  const tone = statusTone(status);
  const timeline = timelineCopy(organization);
  const initials = organization.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const intervalLabel = organization.billingInterval
    ? organization.billingInterval.charAt(0).toUpperCase() + organization.billingInterval.slice(1)
    : "—";

  const initialPlan =
    organization.planSlug && (PLAN_SLUGS as readonly string[]).includes(organization.planSlug)
      ? (organization.planSlug as PlanSlug)
      : "starter";
  const initialInterval: IntervalOption =
    organization.billingInterval === "yearly" ? "yearly" : "monthly";

  const [planSlug, setPlanSlug] = useState<PlanSlug>(initialPlan);
  const [billingInterval, setBillingInterval] = useState<IntervalOption>(initialInterval);
  const [resetPeriod, setResetPeriod] = useState(false);
  const [cancelMode, setCancelMode] = useState<"period_end" | "now">("period_end");
  const [suspendMode, setSuspendMode] = useState<"period_end" | "now">("period_end");
  const [action, setAction] = useState<BillingSheetAction>("change_plan");

  const dirty =
    planSlug !== initialPlan ||
    billingInterval !== initialInterval ||
    status !== "active" ||
    resetPeriod;

  const isLive = status === "active" || status === "trialing";
  const canChangePlan = true;
  const canRestore = organization.cancelAtPeriodEnd || status === "expired";
  const canPause = isLive && !organization.cancelAtPeriodEnd;
  const canCancel = isLive && !organization.cancelAtPeriodEnd;
  const canSuspend = isLive;

  const actionOptions: Array<{
    value: BillingSheetAction;
    label: string;
    hint: string;
    tone: ActionTone;
  }> = [];

  if (canChangePlan) {
    actionOptions.push({
      value: "change_plan",
      label: status === "needs_plan" ? "Assign plan" : "Change plan",
      hint:
        status === "needs_plan" || status === "expired"
          ? "Pick a plan and continue to Stripe checkout"
          : "Upgrade now or schedule a downgrade on the live subscription",
      tone: "default",
    });
  }
  if (canRestore) {
    actionOptions.push({
      value: "resume",
      label: status === "expired" ? "Restore via checkout" : "Resume / restore",
      hint:
        status === "expired"
          ? "Open checkout for the current plan"
          : "Clear scheduled cancel or unpause",
      tone: "success",
    });
  }
  if (canPause) {
    actionOptions.push({
      value: "pause",
      label: "Pause",
      hint: "Revoke access until resumed",
      tone: "warn",
    });
  }
  if (canCancel) {
    actionOptions.push({
      value: "cancel",
      label: "Cancel",
      hint: "At period end or immediately",
      tone: "danger",
    });
  }
  if (canSuspend) {
    actionOptions.push({
      value: "suspend",
      label: "Suspend customer",
      hint: "At period end or immediately",
      tone: "danger",
    });
  }

  const defaultAction: BillingSheetAction =
    status === "expired" || organization.cancelAtPeriodEnd ? "resume" : "change_plan";

  const resolvedAction = actionOptions.some((option) => option.value === action)
    ? action
    : actionOptions.some((option) => option.value === defaultAction)
      ? defaultAction
      : (actionOptions[0]?.value ?? "change_plan");
  const selectedAction =
    actionOptions.find((option) => option.value === resolvedAction) ?? actionOptions[0]!;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  function savePlan() {
    startTransition(async () => {
      const result = await adminUpdateOrganizationPlan({
        organizationId: organization.id,
        planSlug,
        billingInterval,
        billingStatus: "active",
        resetPeriod: resetPeriod || billingInterval !== initialInterval,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.mode === "checkout" && result.checkoutUrl) {
        toast.success("Opening checkout for the selected plan…");
        window.location.assign(result.checkoutUrl);
        return;
      }
      if (result.change === "downgrade") {
        const when = result.effectiveAt
          ? new Date(result.effectiveAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "period end";
        toast.success(
          `Downgrade scheduled for ${when}. Current plan stays active until then.`,
        );
      } else if (result.change === "upgrade") {
        toast.success("Upgrade applied now. Any prorated difference was charged.");
      } else if (result.change === "cancel_downgrade") {
        toast.success("Pending downgrade canceled. Subscription stays on the current plan.");
      } else if (result.billingSynced) {
        toast.success("Workspace plan updated in Billing.");
      } else {
        toast.success("Workspace plan updated.");
      }
      onClose();
      router.refresh();
    });
  }

  function cancelSubscription() {
    startTransition(async () => {
      const result = await adminCancelOrganizationSubscription({
        organizationId: organization.id,
        mode: cancelMode,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.mode === "now"
          ? "Subscription canceled. Access revoked."
          : "Subscription set to cancel at period end.",
      );
      onClose();
      router.refresh();
    });
  }

  function pauseSubscription() {
    startTransition(async () => {
      const result = await adminPauseOrganizationSubscription({
        organizationId: organization.id,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Subscription paused. Access revoked.");
      onClose();
      router.refresh();
    });
  }

  function restoreSubscription() {
    startTransition(async () => {
      const result = await adminRestoreOrganizationSubscription({
        organizationId: organization.id,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.mode === "checkout" && result.checkoutUrl) {
        toast.success("Opening checkout for the current plan…");
        window.location.assign(result.checkoutUrl);
        return;
      }
      toast.success("Subscription resumed. Scheduled cancel cleared when present.");
      onClose();
      router.refresh();
    });
  }

  function suspendBilling() {
    startTransition(async () => {
      const result = await adminSuspendOrganizationBilling({
        organizationId: organization.id,
        mode: suspendMode,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.mode === "now"
          ? "Customer suspended. Access revoked."
          : "Customer set to suspend at period end.",
      );
      onClose();
      router.refresh();
    });
  }

  function runSelectedAction() {
    switch (resolvedAction) {
      case "change_plan":
        savePlan();
        break;
      case "resume":
        restoreSubscription();
        break;
      case "pause":
        pauseSubscription();
        break;
      case "cancel":
        cancelSubscription();
        break;
      case "suspend":
        suspendBilling();
        break;
    }
  }

  const footerCta = (() => {
    switch (resolvedAction) {
      case "change_plan":
        return {
          label: pending
            ? status === "expired" || status === "needs_plan"
              ? "Opening checkout…"
              : "Saving…"
            : status === "expired" || status === "needs_plan"
              ? dirty
                ? "Continue to checkout"
                : "No changes"
              : dirty
                ? "Save plan changes"
                : "No changes",
          disabled: !dirty || pending,
          className: "vr-btn-primary",
        };
      case "resume":
        return {
          label: pending
            ? "Working…"
            : status === "expired"
              ? "Open checkout"
              : "Resume subscription",
          disabled: pending,
          className: "bg-emerald-700 text-white hover:bg-emerald-600",
        };
      case "pause":
        return {
          label: pending ? "Pausing…" : "Pause subscription",
          disabled: pending,
          className: "bg-amber-700 text-white hover:bg-amber-600",
        };
      case "cancel":
        return {
          label: pending ? "Canceling…" : "Cancel subscription",
          disabled: pending,
          className: "bg-red-600 text-white hover:bg-red-700",
        };
      case "suspend":
        return {
          label: pending ? "Suspending…" : "Suspend customer",
          disabled: pending,
          className: "bg-red-600 text-white hover:bg-red-700",
        };
    }
  })();

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-200 ${
        entered ? "bg-black/55 backdrop-blur-[2px]" : "bg-transparent"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-billing-title"
        className={`relative flex h-full w-full max-w-[24rem] flex-col border-l border-white/10 bg-[var(--color-bg)] shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.55)] transition-transform duration-300 ease-out sm:max-w-[26rem] ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="relative shrink-0 overflow-hidden bg-[#0c0c0c] px-5 pb-4 pt-4 text-white">
          <div
            className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-white/[0.06] blur-2xl"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[11px] font-semibold tracking-wide text-white">
                {initials || "WS"}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  Workspace billing
                </p>
                <h3
                  id="org-billing-title"
                  className="mt-0.5 truncate text-[17px] font-semibold tracking-tight text-white"
                >
                  {organization.name}
                </h3>
                <p className="mt-1 truncate text-[12px] text-white/55">
                  {planLabel(organization.planSlug)} · {intervalLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[13px] text-white/70 transition hover:bg-white/15 hover:text-white"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          <div className="relative mt-3.5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tone.className}`}
            >
              <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
              {tone.label}
            </span>
            <span className="text-[11px] text-white/50">
              {organization.memberCount} member{organization.memberCount === 1 ? "" : "s"}
            </span>
            {organization.cancelAtPeriodEnd ? (
              <span className="rounded-md border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-100">
                Cancels at period end
              </span>
            ) : null}
            {organization.billingAdminOverride ? (
              <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70">
                Admin grant
              </span>
            ) : null}
          </div>

          <div className="relative mt-4 flex flex-wrap gap-x-6 gap-y-2.5 border-t border-white/10 pt-3.5">
            <MetaChip label="Trial ends" value={formatDate(organization.trialEndsAt)} />
            <MetaChip label="Paid at" value={formatDate(organization.paidAt)} />
            <MetaChip label="Period ends" value={formatDate(organization.currentPeriodEndsAt)} />
            <MetaChip label="Created" value={formatDate(organization.createdAt)} />
          </div>
          <p className="relative mt-2 text-[11px] text-white/45">{timeline.primary}</p>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {actionOptions.length > 1 ? (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Choose action
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                Available for {tone.label.toLowerCase()} workspaces
                {organization.cancelAtPeriodEnd ? " with a scheduled cancel" : ""}.
              </p>
              <div
                className="mt-2.5 space-y-1.5"
                role="radiogroup"
                aria-label="Billing action"
              >
                {actionOptions.map((option) => {
                  const selected = resolvedAction === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAction(option.value)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                        selected
                          ? "border-[var(--color-text)]/25 bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
                          : "border-transparent bg-transparent hover:bg-[var(--color-raised)]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? "border-[var(--color-text)] bg-[var(--color-text)]"
                            : "border-[var(--color-border)]"
                        }`}
                        aria-hidden
                      >
                        {selected ? (
                          <span className="size-1.5 rounded-full bg-[var(--color-bg)]" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[var(--color-text)]">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-text-muted)]">
                          {option.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {resolvedAction === "change_plan" ? (
            <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                {status === "expired" || status === "needs_plan"
                  ? "This opens Stripe checkout for the selected plan. Access restores after payment."
                  : "Live subscriptions upgrade now or schedule a downgrade at period end."}
              </p>
              <label className="block">
                <FieldLabel>Plan</FieldLabel>
                <CustomSelect
                  value={planSlug}
                  onChange={setPlanSlug}
                  options={PLAN_OPTIONS}
                  aria-label="Select plan"
                />
              </label>
              <label className="block">
                <FieldLabel>Interval</FieldLabel>
                <CustomSelect
                  value={billingInterval}
                  onChange={setBillingInterval}
                  options={INTERVAL_OPTIONS}
                  aria-label="Select billing interval"
                />
              </label>
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={resetPeriod || billingInterval !== initialInterval}
                  disabled={billingInterval !== initialInterval}
                  onChange={(event) => setResetPeriod(event.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                  Reset period from paid date
                  {billingInterval !== initialInterval ? " (required for interval change)" : ""}
                </span>
              </label>
            </section>
          ) : null}

          {resolvedAction === "cancel" ? (
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <FieldLabel>Cancel when</FieldLabel>
              <CustomSelect
                value={cancelMode}
                onChange={setCancelMode}
                options={[
                  { value: "period_end", label: "At period end" },
                  { value: "now", label: "Cancel immediately" },
                ]}
                aria-label="Cancel mode"
              />
            </section>
          ) : null}

          {resolvedAction === "suspend" ? (
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
              <FieldLabel>Suspend when</FieldLabel>
              <CustomSelect
                value={suspendMode}
                onChange={setSuspendMode}
                options={[
                  { value: "period_end", label: "At period end" },
                  { value: "now", label: "Suspend immediately" },
                ]}
                aria-label="Suspend mode"
              />
            </section>
          ) : null}

          {resolvedAction !== "change_plan" ? (
            <p
              className={`rounded-xl border px-3.5 py-3 text-[12px] leading-relaxed ${
                selectedAction.tone === "danger"
                  ? "border-red-200/80 bg-red-50/70 text-red-800 [[data-theme=dark]_&]:border-red-500/25 [[data-theme=dark]_&]:bg-red-500/[0.08] [[data-theme=dark]_&]:text-red-200"
                  : selectedAction.tone === "warn"
                    ? "border-amber-200/80 bg-amber-50/70 text-amber-950 [[data-theme=dark]_&]:border-amber-500/25 [[data-theme=dark]_&]:bg-amber-500/[0.08] [[data-theme=dark]_&]:text-amber-100"
                    : selectedAction.tone === "success"
                      ? "border-emerald-200/80 bg-emerald-50/70 text-emerald-900 [[data-theme=dark]_&]:border-emerald-500/25 [[data-theme=dark]_&]:bg-emerald-500/[0.08] [[data-theme=dark]_&]:text-emerald-200"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
              }`}
            >
              {resolvedAction === "resume"
                ? status === "expired"
                  ? "This opens Stripe checkout for the current plan. Access restores after payment."
                  : "This resumes the live Billing subscription and clears a scheduled cancel if present."
                : resolvedAction === "pause"
                  ? "This pauses Billing and revokes access for this workspace until you resume."
                  : resolvedAction === "cancel"
                    ? cancelMode === "now"
                      ? "Access ends immediately. This cannot be undone from here."
                      : "Access continues until the current period ends, then Billing cancels."
                    : resolvedAction === "suspend"
                      ? suspendMode === "now"
                        ? "Every Billing subscription for this customer will be suspended and access revoked now."
                        : "Access continues until the current period ends, then Billing suspends the customer."
                      : null}
            </p>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={footerCta.disabled}
              onClick={runSelectedAction}
              className={`flex-1 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${footerCta.className}`}
            >
              {footerCta.label}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}


export function BillingOrganizationsManager({
  organizations,
}: BillingOrganizationsManagerProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [viewOrgId, setViewOrgId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const next = {
      all: organizations.length,
      needs_plan: 0,
      trialing: 0,
      active: 0,
      expired: 0,
    };
    for (const org of organizations) {
      next[normalizeStatus(org.billingStatus)] += 1;
    }
    return next;
  }, [organizations]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return organizations.filter((org) => {
      const status = normalizeStatus(org.billingStatus);
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      return (
        org.name.toLowerCase().includes(q) ||
        (org.planSlug ?? "").toLowerCase().includes(q)
      );
    });
  }, [organizations, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const safePage = Math.min(currentPage, totalPages);

  const rows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, safePage, perPage]);

  const viewOrg = organizations.find((org) => org.id === viewOrgId) ?? null;

  return (
    <div>
      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
        <div className="border-b border-[var(--color-border)] px-4 py-4 lg:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Directory
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Workspace subscriptions</h2>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
              {filteredRows.length}
              {filteredRows.length !== organizations.length ? ` of ${organizations.length}` : ""} shown
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
            Filter by billing status and open a workspace to review or change plan, trial, and payment
            timeline.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">
          <div
            className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
            role="tablist"
            aria-label="Filter by billing status"
          >
            {FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setFilter(item.id);
                    setCurrentPage(1);
                  }}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[var(--color-bg)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 text-[10px] tabular-nums opacity-70">{counts[item.id]}</span>
                </button>
              );
            })}
          </div>

          <label className="relative block min-w-0 sm:w-72">
            <span className="sr-only">Search workspaces</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search workspaces…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-3 pr-3 text-sm text-[var(--color-text)] outline-none ring-[var(--color-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2"
            />
          </label>
        </div>

        <div className="overflow-x-auto bg-[var(--color-bg)]">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-raised)] text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Workspace</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Billing timeline</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    No workspaces match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((org) => {
                  const status = normalizeStatus(org.billingStatus);
                  const tone = statusTone(status);
                  const timeline = timelineCopy(org);

                  return (
                    <tr
                      key={org.id}
                      className="border-b border-[var(--color-border)] align-middle last:border-0"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[var(--color-text)]">{org.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                          {org.memberCount} member{org.memberCount === 1 ? "" : "s"} ·{" "}
                          {formatDate(org.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[var(--color-text)]">{planLabel(org.planSlug)}</p>
                        <p className="mt-0.5 text-xs capitalize text-[var(--color-text-muted)]">
                          {org.billingInterval ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.className}`}
                        >
                          <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
                          {tone.label}
                        </span>
                        {org.cancelAtPeriodEnd ? (
                          <p className="mt-1.5 text-[11px] font-semibold text-amber-800 [[data-theme=dark]_&]:text-amber-300">
                            Cancels at period end
                          </p>
                        ) : null}
                        {org.billingAdminOverride ? (
                          <p className="mt-1.5 text-[11px] font-semibold text-violet-800 [[data-theme=dark]_&]:text-violet-300">
                            Admin grant
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <p
                          className={`text-sm font-medium ${
                            org.paidAt
                              ? "text-emerald-800 [[data-theme=dark]_&]:text-emerald-300"
                              : "text-[var(--color-text)]"
                          }`}
                        >
                          {timeline.primary}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{timeline.secondary}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setViewOrgId(org.id)}
                          aria-label={`View billing for ${org.name}`}
                          title="View billing"
                          className="inline-flex size-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                        >
                          <EyeIcon className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          totalItems={filteredRows.length}
          currentPage={safePage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={setCurrentPage}
          onPerPageChange={(size) => {
            setPerPage(size);
            setCurrentPage(1);
          }}
          itemLabel="workspaces"
        />
      </section>

      {viewOrg
        ? createPortal(
            <OrganizationBillingSheet
              key={viewOrg.id}
              organization={viewOrg}
              onClose={() => setViewOrgId(null)}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

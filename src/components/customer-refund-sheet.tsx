"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestWorkspaceRefund } from "@/app/(protected)/subscription/refund-actions";
import { CustomSelect } from "@/components/custom-select";
import {
  CUSTOMER_REFUND_REASONS,
  formatCents,
  labelForRefundReason,
  type CustomerRefundReason,
} from "@/lib/refund-reasons";
import { toast } from "@/lib/toast";

export type CustomerRefundSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
  planName: string;
  billingInterval: string | null;
  paidAt: string | null;
  planPriceCents?: number | null;
  creditsBalance?: number;
  initialMode?: "create" | "view";
  existingRequest?: {
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

function getDaysRemaining(paidAtIso?: string | null): number | null {
  if (!paidAtIso) return null;
  const paidTime = new Date(paidAtIso).getTime();
  if (Number.isNaN(paidTime)) return null;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const msRemaining = paidTime + thirtyDaysMs - Date.now();
  return Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
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

export function CustomerRefundSheet({
  isOpen,
  onClose,
  workspaceName,
  planName,
  billingInterval,
  paidAt,
  planPriceCents,
  creditsBalance = 0,
  initialMode = "create",
  existingRequest,
}: CustomerRefundSheetProps) {
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [pending, startTransition] = useTransition();

  const [mode, setMode] = useState<"create" | "view">(initialMode);
  const [selectedType, setSelectedType] = useState<"full" | "partial">("full");
  const [amountDollars, setAmountDollars] = useState("25.00");
  const [refundReason, setRefundReason] = useState<CustomerRefundReason>("not_using_service");
  const [refundNotes, setRefundNotes] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);

  const daysRemaining = getDaysRemaining(paidAt);
  const fullEligible = daysRemaining === null || daysRemaining > 0;
  const refundType = fullEligible ? selectedType : "partial";

  // Handle slide-in animation on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Handle ESC key and scroll lock
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Quick preset chips calculation
  const presets: Array<{ label: string; dollars: string }> = [];
  if (planPriceCents && planPriceCents > 0) {
    const p25 = (planPriceCents * 0.25) / 100;
    const p50 = (planPriceCents * 0.5) / 100;
    const p75 = (planPriceCents * 0.75) / 100;
    presets.push(
      { label: `25% ($${p25.toFixed(2)})`, dollars: p25.toFixed(2) },
      { label: `50% ($${p50.toFixed(2)})`, dollars: p50.toFixed(2) },
      { label: `75% ($${p75.toFixed(2)})`, dollars: p75.toFixed(2) },
    );
  } else {
    presets.push(
      { label: "$15.00", dollars: "15.00" },
      { label: "$25.00", dollars: "25.00" },
      { label: "$50.00", dollars: "50.00" },
      { label: "$100.00", dollars: "100.00" },
    );
  }

  function handleSubmit() {
    let amountCents: number | undefined;
    if (refundType === "partial") {
      const parsed = parseFloat(amountDollars);
      if (Number.isNaN(parsed) || parsed <= 0) {
        toast.error("Please enter a valid partial refund amount greater than $0.00");
        return;
      }
      amountCents = Math.round(parsed * 100);
    }

    startTransition(async () => {
      const res = await requestWorkspaceRefund({
        type: refundType,
        amountCents,
        reason: refundReason,
        notes: refundNotes,
      });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      setSubmittedRequestId(res.requestId);
      setIsSuccess(true);
      toast.success("Refund request submitted successfully!");
      router.refresh();
    });
  }

  function handleCloseDone() {
    onClose();
    router.refresh();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-refund-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />

      {/* Slide-over panel */}
      <div
        className={`relative flex w-full max-w-xl flex-col bg-[var(--color-bg)] shadow-2xl transition-transform duration-300 ease-out ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="relative border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[11px] font-bold text-[var(--color-primary-fg)]">
                  ↺
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  Customer Support · Billing
                </span>
              </div>
              <h2
                id="customer-refund-title"
                className="text-lg font-bold tracking-tight text-[var(--color-text)]"
              >
                {mode === "view" && existingRequest
                  ? "Your Refund Request"
                  : "Request a Refund or Credit"}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {workspaceName} · {planName}
                {billingInterval ? ` (${billingInterval})` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] hover:shadow-sm"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Mode Switcher Tabs if there is a previous request */}
          {existingRequest && !isSuccess ? (
            <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
              <button
                type="button"
                onClick={() => setMode("create")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === "create"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                + Request a Refund
              </button>
              <button
                type="button"
                onClick={() => setMode("view")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === "view"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                Previous Request (
                {existingRequest.status === "pending"
                  ? "In Review"
                  : existingRequest.status === "approved"
                    ? "Approved"
                    : "Rejected"}
                )
              </button>
            </div>
          ) : null}

          {/* SUCCESS SCREEN */}
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-600 ring-8 ring-emerald-500/10 [[data-theme=dark]_&]:text-emerald-400">
                ✓
              </div>
              <h3 className="mt-4 text-xl font-bold text-[var(--color-text)]">
                Refund Request Received!
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--color-text-muted)]">
                Thank you for letting us know. Our billing team will review your request and process
                your refund or store credit promptly.
              </p>

              {submittedRequestId ? (
                <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs">
                  <span className="text-[var(--color-text-muted)]">Reference Ticket ID: </span>
                  <code className="font-mono font-semibold text-[var(--color-text)]">
                    {submittedRequestId}
                  </code>
                </div>
              ) : null}

              <div className="mt-6 w-full max-w-md space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left text-xs [[data-theme=dark]_&]:bg-emerald-950/20">
                <p className="font-semibold text-emerald-700 [[data-theme=dark]_&]:text-emerald-300">
                  What happens next?
                </p>
                <ul className="list-inside list-disc space-y-1 text-[11px] text-[var(--color-text-muted)]">
                  <li>Our team reviews requests within 24–48 business hours.</li>
                  <li>You will receive an email confirmation as soon as a decision is made.</li>
                  <li>
                    Approved store credits are credited instantly to your account; card refunds take
                    5–10 business days.
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleCloseDone}
                className="mt-8 inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
              >
                Back to Subscription
              </button>
            </div>
          ) : mode === "view" && existingRequest ? (
            /* VIEW EXISTING REQUEST SCREEN */
            <div className="space-y-5">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    Status Tracker
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      existingRequest.status === "pending"
                        ? "bg-amber-500/15 text-amber-600 [[data-theme=dark]_&]:text-amber-400"
                        : existingRequest.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-600 [[data-theme=dark]_&]:text-emerald-400"
                          : "bg-rose-500/15 text-rose-600 [[data-theme=dark]_&]:text-rose-400"
                    }`}
                  >
                    {existingRequest.status === "pending"
                      ? "⏳ Under Review"
                      : existingRequest.status === "approved"
                        ? "✓ Approved"
                        : "✕ Rejected"}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-y border-[var(--color-border)] py-4">
                  <div className="text-center">
                    <div className="mx-auto flex size-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs text-[var(--color-primary-fg)] font-bold">
                      1
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-[var(--color-text)]">
                      Submitted
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {formatDate(existingRequest.createdAt)}
                    </p>
                  </div>
                  <div className="h-0.5 flex-1 bg-[var(--color-border)]" />
                  <div className="text-center">
                    <div
                      className={`mx-auto flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                        existingRequest.status === "pending"
                          ? "animate-pulse bg-amber-500 text-white"
                          : "bg-[var(--color-raised)] text-[var(--color-text)]"
                      }`}
                    >
                      2
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-[var(--color-text)]">
                      Under Review
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {existingRequest.status === "pending" ? "In progress" : "Completed"}
                    </p>
                  </div>
                  <div className="h-0.5 flex-1 bg-[var(--color-border)]" />
                  <div className="text-center">
                    <div
                      className={`mx-auto flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                        existingRequest.status === "approved"
                          ? "bg-emerald-500 text-white"
                          : existingRequest.status === "rejected"
                            ? "bg-rose-500 text-white"
                            : "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      3
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-[var(--color-text)]">
                      Decision
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {existingRequest.reviewedAt
                        ? formatDate(existingRequest.reviewedAt)
                        : "Pending"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <span className="text-[var(--color-text-muted)]">Reason: </span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {labelForRefundReason(existingRequest.reason.replace(/^\[[^\]]+\]\s*/, ""))}
                    </span>
                  </div>
                  {existingRequest.amountCents != null && existingRequest.amountCents > 0 ? (
                    <div>
                      <span className="text-[var(--color-text-muted)]">Requested Amount: </span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {formatCents(existingRequest.amountCents, existingRequest.currency ?? "USD")}
                      </span>
                    </div>
                  ) : null}
                  {existingRequest.notes ? (
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Your notes
                      </p>
                      <p className="mt-1 leading-relaxed text-[var(--color-text)]">
                        {existingRequest.notes}
                      </p>
                    </div>
                  ) : null}

                  {existingRequest.adminNote ? (
                    <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sky-900 [[data-theme=dark]_&]:text-sky-200">
                      <p className="text-[10px] font-bold uppercase tracking-wider">
                        Response from Admin
                      </p>
                      <p className="mt-1 leading-relaxed text-xs">
                        {existingRequest.adminNote}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {creditsBalance > 0 ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
                  <p className="font-bold text-emerald-700 [[data-theme=dark]_&]:text-emerald-300">
                    Active Store Credit: {formatCents(creditsBalance)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                    This balance will automatically apply toward your upcoming renewal or invoice.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            /* CREATE REFUND REQUEST SCREEN */
            <div className="space-y-6">
              {/* Policy Banner with 30-day countdown */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      Refund Policy & Window
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text)]">
                      30-Day Money-Back Guarantee on full subscriptions. Partial refunds or store
                      credits can be requested anytime for service downtime.
                    </p>
                  </div>
                  {fullEligible && daysRemaining != null ? (
                    <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 [[data-theme=dark]_&]:text-emerald-300">
                      {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-700 [[data-theme=dark]_&]:text-amber-300">
                      Partial / credit only
                    </span>
                  )}
                </div>
              </div>

              {/* Step 1: Refund Type Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text)]">
                  Step 1: Select refund type
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Full Refund Card */}
                  <button
                    type="button"
                    disabled={!fullEligible}
                    onClick={() => setSelectedType("full")}
                    className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                      refundType === "full"
                        ? "border-[var(--color-primary)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] ring-2 ring-[var(--color-primary)]/20"
                        : "border-[var(--color-border)] bg-[var(--color-bg)] opacity-90 hover:border-[var(--color-text-muted)] hover:opacity-100"
                    } ${!fullEligible ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex size-7 items-center justify-center rounded-xl bg-[var(--color-raised)] text-sm">
                          🛡️
                        </span>
                        <span
                          className={`size-4 rounded-full border flex items-center justify-center ${
                            refundType === "full"
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                              : "border-[var(--color-border)]"
                          }`}
                        >
                          {refundType === "full" ? (
                            <span className="size-1.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-[var(--color-text)]">
                        Full Refund
                      </h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                        Return the entire subscription charge. Access ends upon approval.
                      </p>
                    </div>

                    <div className="mt-3 border-t border-[var(--color-border)] pt-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 [[data-theme=dark]_&]:text-emerald-400">
                        {fullEligible ? "Within 30-day window" : "30-day window expired"}
                      </span>
                    </div>
                  </button>

                  {/* Partial Refund Card */}
                  <button
                    type="button"
                    onClick={() => setSelectedType("partial")}
                    className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                      refundType === "partial"
                        ? "border-[var(--color-primary)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] ring-2 ring-[var(--color-primary)]/20"
                        : "border-[var(--color-border)] bg-[var(--color-bg)] opacity-90 hover:border-[var(--color-text-muted)] hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex size-7 items-center justify-center rounded-xl bg-[var(--color-raised)] text-sm">
                          🪙
                        </span>
                        <span
                          className={`size-4 rounded-full border flex items-center justify-center ${
                            refundType === "partial"
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                              : "border-[var(--color-border)]"
                          }`}
                        >
                          {refundType === "partial" ? (
                            <span className="size-1.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-[var(--color-text)]">
                        Partial / Store Credit
                      </h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                        Request a custom amount or credit for downtime while keeping active access.
                      </p>
                    </div>

                    <div className="mt-3 border-t border-[var(--color-border)] pt-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 [[data-theme=dark]_&]:text-sky-400">
                        Available Anytime
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Amount Inputs for Partial Refund */}
              {refundType === "partial" ? (
                <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--color-text)]">
                      Partial Amount (USD)
                    </label>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      Quick presets:
                    </span>
                  </div>

                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setAmountDollars(p.dollars)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                          amountDollars === p.dollars
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                            : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-text-muted)]"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom dollar input */}
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-muted)]">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amountDollars}
                      onChange={(e) => setAmountDollars(e.target.value)}
                      disabled={pending}
                      placeholder="25.00"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-8 pr-3 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    />
                  </div>
                </div>
              ) : null}

              {/* Step 2: Reason Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--color-text)]">
                  Step 2: Tell us why
                </label>
                <CustomSelect
                  value={refundReason}
                  onChange={(val) => setRefundReason(val as CustomerRefundReason)}
                  options={CUSTOMER_REFUND_REASONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  aria-label="Reason for refund"
                  disabled={pending}
                  className="mt-1"
                />
              </div>

              {/* Step 3: Message / Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--color-text)]">
                    Step 3: Additional details{" "}
                    <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                  </label>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {refundNotes.length} / 1000
                  </span>
                </div>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  disabled={pending}
                  placeholder="Tell us what happened so we can assist or improve the service..."
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-xs text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)]/60 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>

              {/* Summary / Reassurance Box */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-raised)] p-4 text-xs">
                <p className="font-bold text-[var(--color-text)]">Summary Preview</p>
                <div className="mt-2 space-y-1.5 text-[11px] text-[var(--color-text-muted)]">
                  <div className="flex justify-between">
                    <span>Requested Type:</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {refundType === "full" ? "Full Refund (100%)" : `Partial Refund ($${amountDollars})`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target method:</span>
                    <span className="font-semibold text-[var(--color-text)]">
                      Original Card or Instant Store Credit
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expected Review:</span>
                    <span className="font-semibold text-emerald-600 [[data-theme=dark]_&]:text-emerald-400">
                      ⚡ 24–48 Business Hours
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isSuccess && mode === "create" ? (
          <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:opacity-50"
              >
                {pending ? (
                  <>
                    <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting…
                  </>
                ) : (
                  "Submit Refund Request"
                )}
              </button>
            </div>
          </footer>
        ) : !isSuccess && mode === "view" ? (
          <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setMode("create")}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
              >
                + Request Another Refund or Credit
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

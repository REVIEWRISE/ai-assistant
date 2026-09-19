"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { cancelActiveWorkspaceSubscription } from "@/app/(protected)/subscription/actions";
import { CONTACT_EMAIL } from "@/lib/brand";
import { toast } from "@/lib/toast";

export type WorkspaceBillingCloseView = {
  workspaceName: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
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

function ConfirmModal({
  open,
  pending,
  title,
  description,
  confirmLabel,
  workspaceName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  workspaceName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [typedName, setTypedName] = useState("");
  const nameMatches = typedName.trim() === workspaceName.trim();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    if (pending) return;
    setTypedName("");
    onClose();
  }, [pending, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close confirmation"
        disabled={pending}
        onClick={() => {
          close();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-billing-confirm-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-danger)]">
              Confirm
            </p>
            <h2
              id="close-billing-confirm-title"
              className="mt-1 text-lg font-semibold text-[var(--color-text)]"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)] disabled:opacity-50"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="space-y-3 p-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[var(--color-text)]">
              Type <span className="font-mono">{workspaceName}</span> to confirm
            </span>
            <input
              type="text"
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              placeholder={workspaceName}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
            />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={close}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:opacity-50"
            >
              Keep plan
            </button>
            <button
              type="button"
              disabled={pending || !nameMatches}
              onClick={onConfirm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function WorkspaceBillingClosePanel({ billing }: { billing: WorkspaceBillingCloseView }) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"period_end" | "now">(
    billing.cancelAtPeriodEnd ? "now" : "period_end",
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const accessEndsAt = billing.currentPeriodEndsAt ?? billing.trialEndsAt;

  function onConfirm() {
    startTransition(async () => {
      const result = await cancelActiveWorkspaceSubscription({ mode });
      setConfirmOpen(false);
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
        window.location.assign("/billing/expired?success=subscription_canceled");
        return;
      }
      window.location.assign("/profile");
    });
  }

  const options = [
    ...(!billing.cancelAtPeriodEnd
      ? [
          {
            value: "period_end" as const,
            title: "At period end",
            body: accessEndsAt
              ? `Keep access until ${formatDate(accessEndsAt)}.`
              : "Keep access until the current period finishes.",
          },
        ]
      : []),
    {
      value: "now" as const,
      title: "End immediately",
      body: "Revoke access as soon as you confirm.",
    },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center gap-1.5 text-left text-[11px] font-medium text-[var(--color-text-subtle)]"
      >
        <span aria-hidden className={`transition ${expanded ? "rotate-90" : ""}`}>
          ›
        </span>
        Advanced
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            End billing for {billing.workspaceName}. Most teams email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                `Help with ${billing.workspaceName} subscription`,
              )}`}
              className="font-semibold text-[var(--color-primary-h)] underline-offset-2 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            instead.
          </p>

          {billing.cancelAtPeriodEnd ? (
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              End of access is already scheduled for {formatDate(accessEndsAt)}.
            </p>
          ) : null}

          <div className="space-y-2" role="radiogroup" aria-label="When access should end">
            {options.map((option) => {
              const selected = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={pending}
                  onClick={() => {
                    setMode(option.value);
                    setConfirmOpen(false);
                  }}
                  className={`flex w-full gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                    selected
                      ? "border-[var(--color-border-hover)] bg-[var(--color-raised)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]"
                  } disabled:opacity-60`}
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center" aria-hidden>
                    <span
                      className={`flex size-4 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-[var(--color-text-muted)]"
                          : "border-[var(--color-border-hover)]"
                      }`}
                    >
                      {selected ? (
                        <span className="size-2 rounded-full bg-[var(--color-text-muted)]" />
                      ) : null}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--color-text)]">
                      {option.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-text-muted)]">
                      {option.body}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)] disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      ) : null}

      <ConfirmModal
        key={confirmOpen ? "open" : "closed"}
        open={confirmOpen}
        pending={pending}
        workspaceName={billing.workspaceName}
        title={
          mode === "now" ? "End access now?" : "Schedule the end of this subscription?"
        }
        description={
          mode === "now"
            ? `${billing.workspaceName} will lose paid features immediately.`
            : accessEndsAt
              ? `Access continues until ${formatDate(accessEndsAt)}.`
              : "Access continues until the current period ends."
        }
        confirmLabel={mode === "now" ? "End access now" : "Schedule end"}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirm}
      />
    </div>
  );
}

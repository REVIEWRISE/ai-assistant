"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DashboardSetupStep } from "@/lib/dashboard-data";

const OPEN_TRIGGERS = new Set(["login", "trial_started", "register", "subscription_active"]);

function storageKey(organizationId: string | null) {
  return `getting-started-dismissed:${organizationId ?? "none"}`;
}

function sessionOpenedKey(organizationId: string | null, success: string) {
  return `getting-started-opened:${organizationId ?? "none"}:${success}`;
}

function isDismissed(organizationId: string | null) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey(organizationId)) === "1";
  } catch {
    return false;
  }
}

function markDismissed(organizationId: string | null) {
  try {
    window.localStorage.setItem(storageKey(organizationId), "1");
  } catch {
    // ignore quota / private mode
  }
}

function clearDismissed(organizationId: string | null) {
  try {
    window.localStorage.removeItem(storageKey(organizationId));
  } catch {
    // ignore
  }
}

export function GettingStartedStepper({
  organizationId,
  organizationName,
  steps,
}: {
  organizationId: string | null;
  organizationName: string | null;
  steps: DashboardSetupStep[];
}) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  const remaining = useMemo(() => steps.filter((step) => !step.complete), [steps]);
  const done = useMemo(() => steps.filter((step) => step.complete), [steps]);
  const nextStep = remaining[0] ?? null;
  const incompleteCount = remaining.length;

  useEffect(() => {
    setHydrated(true);
    setBannerVisible(incompleteCount > 0 && !isDismissed(organizationId));
    if (!steps.length || incompleteCount === 0) return;

    const success = searchParams.get("success");
    if (!success || !OPEN_TRIGGERS.has(success)) return;
    if (isDismissed(organizationId)) return;

    try {
      const openedKey = sessionOpenedKey(organizationId, success);
      if (window.sessionStorage.getItem(openedKey) === "1") return;
      window.sessionStorage.setItem(openedKey, "1");
    } catch {
      // still open once if sessionStorage is unavailable
    }

    setOpen(true);
  }, [incompleteCount, organizationId, searchParams, steps.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!steps.length) return null;

  function closeForNow() {
    setOpen(false);
  }

  function dismissForever() {
    markDismissed(organizationId);
    setBannerVisible(false);
    setOpen(false);
  }

  function reopen() {
    clearDismissed(organizationId);
    setBannerVisible(true);
    setOpen(true);
  }

  return (
    <>
      {hydrated && bannerVisible ? (
        <button
          type="button"
          onClick={reopen}
          className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-left shadow-[var(--shadow-sm)] transition hover:border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]"
        >
          <span className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Getting started
            </span>
            <span className="mt-1 block truncate text-sm font-semibold text-[var(--color-text)]">
              {incompleteCount === 1
                ? "1 setup step left"
                : `${incompleteCount} setup steps left`}
              {nextStep ? (
                <span className="font-normal text-[var(--color-text-muted)]"> · {nextStep.label}</span>
              ) : null}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white">
            Continue
          </span>
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="getting-started-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[color-mix(in_srgb,#0a0a0a_48%,transparent)] backdrop-blur-[3px]"
            aria-label="Close getting started helper"
            onClick={closeForNow}
          />

          <div className="onboarding-panel-in relative z-10 flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
            <header className="shrink-0 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    Getting started
                  </p>
                  <h2
                    id="getting-started-title"
                    className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--color-text)]"
                  >
                    {incompleteCount === 0
                      ? "You're all set"
                      : organizationName
                        ? `Finish setting up ${organizationName}`
                        : "Finish setting up"}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {incompleteCount === 0
                      ? "Your workspace essentials are complete."
                      : incompleteCount === 1
                        ? "One step left to get the basics running."
                        : `${incompleteCount} steps left · ${done.length} already done.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForNow}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 sm:px-6">
              {remaining.length > 0 ? (
                <ul className="space-y-2">
                  {remaining.map((step, index) => {
                    const isNext = index === 0;
                    return (
                      <li key={step.id}>
                        <Link
                          href={step.href}
                          className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3.5 transition ${
                            isNext
                              ? "border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-primary-soft)] shadow-[var(--shadow-sm)]"
                              : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[color-mix(in_srgb,var(--color-primary)_20%,var(--color-border))]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                              isNext
                                ? "bg-[var(--color-primary)] text-white"
                                : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                            }`}
                            aria-hidden
                          >
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[var(--color-text)]">{step.label}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-text-muted)]">
                              {step.description}
                            </span>
                          </span>
                          <span
                            className={`mt-1 shrink-0 text-xs font-semibold ${
                              isNext ? "text-[var(--color-primary-h)]" : "text-[var(--color-text-subtle)]"
                            }`}
                            aria-hidden
                          >
                            →
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {done.length > 0 ? (
                <div className={`${remaining.length > 0 ? "mt-5" : ""}`}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
                    Completed
                  </p>
                  <ul className="space-y-1">
                    {done.map((step) => (
                      <li
                        key={step.id}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-[var(--color-text-muted)]"
                      >
                        <span
                          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600"
                          aria-hidden
                        >
                          ✓
                        </span>
                        <span className="line-through decoration-[var(--color-border)]">{step.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-[var(--color-border)] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={dismissForever}
                  className="text-xs font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                >
                  Don&apos;t show again
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeForNow}
                    className="rounded-xl px-3.5 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                  >
                    {incompleteCount === 0 ? "Close" : "Later"}
                  </button>
                  {nextStep ? (
                    <Link
                      href={nextStep.href}
                      className="inline-flex items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                    >
                      Continue
                    </Link>
                  ) : null}
                </div>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

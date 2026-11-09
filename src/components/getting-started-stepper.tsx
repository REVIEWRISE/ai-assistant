"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { LandingLogoMark } from "@/components/landing/landing-logo-mark";
import type { DashboardSetupStep } from "@/lib/dashboard-data";

const OPEN_TRIGGERS = new Set(["login", "trial_started", "register", "subscription_active"]);
const DISMISS_EVENT = "getting-started-dismissed";

function storageKey(organizationId: string | null) {
  return `getting-started-dismissed:${organizationId ?? "none"}`;
}

function sessionOpenedKey(organizationId: string | null, success: string) {
  return `getting-started-opened:${organizationId ?? "none"}:${success}`;
}

function readDismissed(organizationId: string | null) {
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
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

function clearDismissed(organizationId: string | null) {
  try {
    window.localStorage.removeItem(storageKey(organizationId));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

function markSessionOpened(organizationId: string | null, success: string) {
  try {
    window.sessionStorage.setItem(sessionOpenedKey(organizationId, success), "1");
  } catch {
    // ignore
  }
}

function subscribeDismissed(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(DISMISS_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(DISMISS_EVENT, onStoreChange);
  };
}

function useDismissed(organizationId: string | null) {
  return useSyncExternalStore(
    subscribeDismissed,
    () => readDismissed(organizationId),
    () => true,
  );
}

function useSessionAlreadyOpened(organizationId: string | null, success: string | null) {
  return useSyncExternalStore(
    () => () => {},
    () => {
      if (!success) return true;
      try {
        return window.sessionStorage.getItem(sessionOpenedKey(organizationId, success)) === "1";
      } catch {
        return false;
      }
    },
    () => true,
  );
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
  const successParam = searchParams.get("success");
  const autoOpenSuccess =
    successParam && OPEN_TRIGGERS.has(successParam) ? successParam : null;

  const dismissed = useDismissed(organizationId);
  const sessionAlreadyOpened = useSessionAlreadyOpened(organizationId, autoOpenSuccess);

  const [closedByUser, setClosedByUser] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalReady(true);
  }, []);

  const remaining = useMemo(() => steps.filter((step) => !step.complete), [steps]);
  const done = useMemo(() => steps.filter((step) => step.complete), [steps]);
  const nextStep = remaining[0] ?? null;
  const incompleteCount = remaining.length;

  const autoOpen =
    Boolean(autoOpenSuccess) &&
    steps.length > 0 &&
    incompleteCount > 0 &&
    !dismissed &&
    !sessionAlreadyOpened &&
    !closedByUser;

  const open = manualOpen || autoOpen;
  const bannerVisible = incompleteCount > 0 && !dismissed;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (autoOpenSuccess) markSessionOpened(organizationId, autoOpenSuccess);
      setManualOpen(false);
      setClosedByUser(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, autoOpenSuccess, organizationId]);

  if (!steps.length) return null;

  const progressPercent = Math.round((done.length / steps.length) * 100);

  function closeForNow() {
    if (autoOpenSuccess) markSessionOpened(organizationId, autoOpenSuccess);
    setManualOpen(false);
    setClosedByUser(true);
  }

  function dismissForever() {
    if (autoOpenSuccess) markSessionOpened(organizationId, autoOpenSuccess);
    markDismissed(organizationId);
    setManualOpen(false);
    setClosedByUser(true);
  }

  function reopen() {
    clearDismissed(organizationId);
    setClosedByUser(false);
    setManualOpen(true);
  }

  return (
    <>
      {bannerVisible ? (
        <button
          type="button"
          onClick={reopen}
          className="group flex w-full items-center justify-between gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-left shadow-[var(--shadow-sm)] transition hover:border-[var(--color-primary)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]"
        >
          <span className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-[var(--color-primary-h)]">Getting started</span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--color-text)]">
              {incompleteCount === 1
                ? "1 setup step left"
                : `${incompleteCount} setup steps left`}
              {nextStep ? (
                <span className="font-normal text-[var(--color-text-muted)]"> · {nextStep.label}</span>
              ) : null}
            </span>
            <span className="mt-2 block h-1.5 max-w-sm overflow-hidden rounded-full bg-[var(--color-raised)]" aria-hidden>
              <span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${progressPercent}%` }} />
            </span>
          </span>
          <span className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-fg)] transition group-hover:bg-[var(--color-primary-fill-h)]">
            Continue
          </span>
        </button>
      ) : null}

      {open && portalReady
        ? createPortal(
            <div
              className="fixed inset-0 z-[9998] flex items-end justify-center p-3 sm:items-center sm:p-6"
              style={{ top: 0, right: 0, bottom: 0, left: 0, width: "100vw", height: "100dvh" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="getting-started-title"
            >
              <button
                type="button"
                className="absolute inset-0 h-full w-full bg-[var(--color-overlay)] backdrop-blur-[3px]"
                aria-label="Close getting started helper"
                onClick={closeForNow}
              />

              <div className="onboarding-panel-in relative z-10 flex max-h-[min(92dvh,42rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[0_32px_80px_-24px_rgb(8_20_66/0.65)] [[data-theme=dark]_&]:bg-[var(--color-surface)]">
                <header className="vr-app-blue relative isolate shrink-0 overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
                  <LandingLogoMark className="lp-mark -right-10 -top-20 w-72 max-w-none" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/85">Getting started</p>
                      <h2
                        id="getting-started-title"
                        className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.025em] text-white"
                      >
                        {incompleteCount === 0
                          ? "You're all set"
                          : organizationName
                            ? `Finish setting up ${organizationName}`
                            : "Finish setting up"}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={closeForNow}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      aria-label="Close"
                    >
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div
                      className="h-2 flex-1 overflow-hidden rounded-full bg-white/25"
                      role="progressbar"
                      aria-label="Setup progress"
                      aria-valuemin={0}
                      aria-valuemax={steps.length}
                      aria-valuenow={done.length}
                    >
                      <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums text-white">
                      {done.length} of {steps.length} done
                    </p>
                  </div>
                </header>

                <ol className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
                  {steps.map((step, index) => {
                    const isNext = step.id === nextStep?.id;
                    const isLast = index === steps.length - 1;
                    const marker = (
                      <span
                        className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          step.complete || isNext
                            ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                            : "border border-[var(--color-border-hover)] bg-[var(--color-bg)] text-[var(--color-text-muted)] [[data-theme=dark]_&]:bg-[var(--color-surface)]"
                        }`}
                        aria-hidden
                      >
                        {step.complete ? (
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>
                    );
                    const text = (
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[15px] font-semibold leading-snug ${
                            step.complete ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"
                          }`}
                        >
                          {step.label}
                          {step.complete ? <span className="sr-only"> (done)</span> : null}
                        </span>
                        {step.complete ? null : (
                          <span className="mt-0.5 block text-sm leading-relaxed text-[var(--color-text-muted)]">
                            {step.description}
                          </span>
                        )}
                      </span>
                    );

                    return (
                      <li key={step.id} className="relative">
                        {isLast ? null : (
                          <span
                            className={`absolute bottom-[-0.25rem] left-[1.75rem] top-8 w-0.5 ${
                              step.complete ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
                            }`}
                            aria-hidden
                          />
                        )}
                        {step.complete ? (
                          <div className="flex items-center gap-3 p-3">
                            {marker}
                            {text}
                          </div>
                        ) : (
                          <Link
                            href={step.href}
                            aria-current={isNext ? "step" : undefined}
                            className={`group flex items-start gap-3 rounded-2xl p-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                              isNext ? "bg-[var(--color-primary-soft)]" : "hover:bg-[var(--color-raised)]"
                            }`}
                          >
                            {marker}
                            {text}
                            <span
                              className="mt-1 shrink-0 text-sm font-semibold text-[var(--color-primary-h)] transition-transform group-hover:translate-x-0.5"
                              aria-hidden
                            >
                              →
                            </span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>

                <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={dismissForever}
                    className="text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                  >
                    Don&apos;t show again
                  </button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={closeForNow}
                      className="min-h-10 rounded-full px-4 text-sm font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                    >
                      {incompleteCount === 0 ? "Close" : "Later"}
                    </button>
                    {nextStep ? (
                      <Link
                        href={nextStep.href}
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-fill-h)]"
                      >
                        Continue
                      </Link>
                    ) : null}
                  </div>
                </footer>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

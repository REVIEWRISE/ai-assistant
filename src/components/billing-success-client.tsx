"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBillingStatusForActiveOrg } from "@/app/(protected)/billing/actions";

function StatusGlyph({ status }: { status: "waiting" | "active" | "timeout" }) {
  if (status === "active") {
    return (
      <span className="relative flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 ring-4 ring-emerald-500/10 sm:size-16 sm:ring-8 [[data-theme=dark]_&]:text-emerald-300">
        <svg viewBox="0 0 24 24" className="size-7 sm:size-8" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (status === "timeout") {
    return (
      <span className="relative flex size-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 ring-4 ring-amber-500/10 sm:size-16 sm:ring-8 [[data-theme=dark]_&]:text-amber-300">
        <svg viewBox="0 0 24 24" className="size-7 sm:size-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 7v5l3 2" />
        </svg>
      </span>
    );
  }

  return (
    <span className="relative flex size-14 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-h)] ring-4 ring-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] sm:size-16 sm:ring-8">
      <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-primary)] opacity-20" aria-hidden />
      <svg viewBox="0 0 24 24" className="relative size-7 animate-spin sm:size-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" d="M12 3a9 9 0 1 1-9 9" />
      </svg>
    </span>
  );
}

const STEPS = [
  "Payment confirmed",
  "Activating workspace",
  "Unlocking features",
] as const;

export function BillingSuccessClient({
  sessionId,
  workspaceName,
}: {
  sessionId: string | null;
  workspaceName?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"waiting" | "active" | "timeout">("waiting");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll(nextAttempt: number) {
      if (cancelled) return;
      setAttempts(nextAttempt);
      try {
        const result = await getBillingStatusForActiveOrg();
        if (result.billingStatus === "active") {
          setStatus("active");
          timer = setTimeout(() => router.replace("/dashboard?success=subscription_active"), 1200);
          return;
        }
      } catch {
        // Keep polling — webhook may still be in flight.
      }

      if (nextAttempt >= 20) {
        setStatus("timeout");
        return;
      }

      timer = setTimeout(() => {
        void poll(nextAttempt + 1);
      }, 1500);
    }

    void poll(1);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router, sessionId]);

  const activeStep =
    status === "active" ? 2 : status === "timeout" ? 1 : Math.min(1, Math.floor((attempts - 1) / 4));

  const title =
    status === "active"
      ? "You're subscribed"
      : status === "timeout"
        ? "Payment received"
        : "Finishing setup";

  const description =
    status === "active"
      ? `${workspaceName ? `${workspaceName} is` : "Your workspace is"} unlocked. Redirecting to the dashboard…`
      : status === "timeout"
        ? "Checkout completed, but activation is still catching up. You can continue to the dashboard or wait a moment and refresh."
        : "We're confirming your payment and turning your plan on. This usually takes a few seconds.";

  return (
    <section className="landing-animate-up mx-auto w-full max-w-lg overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_30px_80px_-48px_rgba(15,23,42,0.45)] sm:rounded-[1.75rem]">
      <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--color-primary)_10%,var(--color-bg)),var(--color-surface))] px-4 pb-7 pt-8 text-center sm:px-8 sm:pb-8 sm:pt-10">
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] blur-3xl sm:size-40"
          aria-hidden
        />
        <div className="relative flex flex-col items-center">
          <StatusGlyph status={status} />
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)] sm:mt-6 sm:text-[11px]">
            {status === "waiting" ? "Almost ready" : status === "active" ? "Success" : "Syncing"}
          </p>
          <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-[-0.035em] text-[var(--color-text)] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-sm text-[13px] leading-6 text-[var(--color-text-muted)] sm:text-sm">
            {description}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-8 sm:py-6">
        <ol className="space-y-2.5 sm:space-y-3" aria-label="Activation progress">
          {STEPS.map((step, index) => {
            const done = status === "active" || index < activeStep;
            const current =
              (status === "waiting" && index === activeStep) ||
              (status === "timeout" && index === activeStep);
            return (
              <li key={step} className="flex items-center gap-2.5 sm:gap-3">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition sm:size-7 sm:text-[11px] ${
                    done
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                      : current
                        ? "border border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
                        : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-subtle)]"
                  }`}
                  aria-hidden
                >
                  {done ? (
                    <svg viewBox="0 0 24 24" className="size-3 sm:size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                    </svg>
                  ) : current && status === "timeout" ? (
                    <svg viewBox="0 0 24 24" className="size-3 sm:size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" d="M12 7v5l3 2" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`min-w-0 flex-1 text-[13px] font-medium sm:text-sm ${
                    done || current ? "text-[var(--color-text)]" : "text-[var(--color-text-subtle)]"
                  }`}
                >
                  {step}
                </span>
                {current ? (
                  <span className="hidden shrink-0 text-[11px] font-medium text-[var(--color-text-muted)] sm:inline">
                    {status === "timeout" ? "Still syncing…" : "In progress…"}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>

        {status === "waiting" ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 sm:rounded-2xl sm:px-4">
            <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--color-text-muted)] sm:text-xs">
              <span className="min-w-0 truncate">Confirming with billing</span>
              <span className="shrink-0 tabular-nums">Check {attempts}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-raised)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min(95, attempts * 5)}%` }}
              />
            </div>
          </div>
        ) : null}

        {status !== "waiting" ? (
          <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] sm:min-h-12 sm:flex-1"
            >
              Open dashboard
            </Link>
            {status === "timeout" ? (
              <Link
                href="/billing"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] sm:min-h-12 sm:flex-1"
              >
                View billing
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="text-center text-[11px] leading-5 text-[var(--color-text-subtle)]">
            Keep this tab open while we finish activating your plan.
          </p>
        )}
      </div>
    </section>
  );
}

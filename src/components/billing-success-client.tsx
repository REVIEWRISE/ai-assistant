"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBillingStatusForActiveOrg } from "@/app/(protected)/billing/actions";

export function BillingSuccessClient({ sessionId }: { sessionId: string | null }) {
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
          timer = setTimeout(() => router.replace("/dashboard?success=subscription_active"), 800);
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

  return (
    <section className="mx-auto max-w-xl rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center shadow-[var(--shadow-md)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
        Payment
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
        {status === "active"
          ? "You're all set"
          : status === "timeout"
            ? "Payment received — almost there"
            : "Confirming your subscription"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        {status === "active"
          ? "Access is unlocked. Taking you to the dashboard…"
          : status === "timeout"
            ? "Stripe finished checkout, but activation is still syncing. Refresh in a moment, or open the dashboard if access is already restored."
            : `Waiting for billing confirmation${sessionId ? ` (check ${attempts})` : ""}…`}
      </p>

      {status !== "waiting" ? (
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
          >
            Go to dashboard
          </Link>
          <Link
            href="/billing"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
          >
            Back to billing
          </Link>
        </div>
      ) : null}
    </section>
  );
}

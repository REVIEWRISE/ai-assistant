"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resendLoginCode, verifyLoginCode } from "@/app/login/verify/actions";
import { AuthShell } from "@/components/auth-shell";
import { toast } from "@/lib/toast";

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-center text-2xl font-semibold tracking-[0.5em] text-[var(--color-text)] shadow-sm outline-none transition placeholder:text-[var(--color-text-subtle)] hover:border-[var(--color-border-hover)] focus:border-[var(--color-primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]";

function VerifyLoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") ?? undefined;
  const retry = searchParams?.get("retry") ?? undefined;
  const status = searchParams?.get("status") ?? undefined;

  useEffect(() => {
    if (status === "resent") {
      toast.success("A new code is on its way. Check your inbox.");
      return;
    }
    if (!error) return;
    if (error === "rate_limited") {
      toast.error(
        retry
          ? `Too many attempts. Please wait ${retry} minute(s) and try again.`
          : "Too many attempts. Please wait a moment and try again.",
      );
      return;
    }
    if (error === "format") {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    if (error === "wrong_code") {
      toast.error("That code is incorrect. Please try again.");
      return;
    }
    if (error === "send_failed") {
      toast.error("We couldn't deliver the code email. Try resending it.");
    }
  }, [error, retry, status]);

  return (
    <AuthShell
      sideTitle="One more step to keep your workspace safe."
      sideDescription="Two-step verification makes sure it's really you, even if someone else knows your password."
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
          Two-step verification
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)]">
          Check your email
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          We sent a 6-digit sign-in code to your email address. It expires in 10 minutes.
        </p>
      </div>

      <form className="mt-8 space-y-5" action={verifyLoginCode}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Sign-in code</span>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
            placeholder="000000"
            className={INPUT_CLASS}
          />
        </label>

        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition hover:bg-[var(--color-primary-h)]"
        >
          Verify and sign in
          <span aria-hidden>→</span>
        </button>
      </form>

      <form className="mt-4" action={resendLoginCode}>
        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-6 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
        >
          Resend code
        </button>
      </form>

      <div className="mt-7 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Not you?{" "}
          <Link href="/login" className="font-semibold text-[var(--color-primary-h)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function VerifyLoginClient() {
  return (
    <Suspense fallback={null}>
      <VerifyLoginContent />
    </Suspense>
  );
}

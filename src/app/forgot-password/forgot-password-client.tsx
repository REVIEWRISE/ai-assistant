"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { toast } from "@/lib/toast";

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-sm text-[var(--color-text)] shadow-sm outline-none transition placeholder:text-[var(--color-text-subtle)] hover:border-[var(--color-border-hover)] focus:border-[var(--color-primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") ?? undefined;
  const retry = searchParams?.get("retry") ?? undefined;
  const status = searchParams?.get("status") ?? undefined;
  const emailParam = searchParams?.get("email") ?? "";

  const isSent = status === "sent";

  useEffect(() => {
    if (isSent) {
      toast.success("Password reset email sent. Check your inbox.");
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
    if (error === "missing") {
      toast.error("Please enter your work email address.");
      return;
    }
    if (error === "invalid_email") {
      toast.error("Please enter a valid work email address.");
      return;
    }
    if (error === "send_failed") {
      toast.error("We couldn't deliver the reset email. Please try again.");
      return;
    }
    if (error === "invalid") {
      toast.error("Invalid or expired reset link. Please request a new one.");
      return;
    }
    if (error === "expired") {
      toast.error("Your reset link has expired. Please request a new one.");
      return;
    }
  }, [error, retry, isSent]);

  if (isSent) {
    return (
      <AuthShell
        sideTitle="Regain quick access to your workspace."
        sideDescription="Reset your password securely to return to customer reviews, appointments, and AI integrations."
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
            Check your inbox
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)]">
            Reset link sent
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
            We sent a password reset link to{" "}
            <strong className="font-semibold text-[var(--color-text)]">{emailParam}</strong>. Open it to
            choose a new password.
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
          Didn&apos;t get the email? Check your spam folder, or request another link below. The link expires in 1 hour.
        </div>

        <form className="mt-6 space-y-4" action={requestPasswordReset}>
          <input type="hidden" name="email" value={emailParam} />
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-6 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
          >
            Resend reset email
          </button>
        </form>

        <div className="mt-7 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-[var(--color-primary-h)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      sideTitle="Regain quick access to your workspace."
      sideDescription="Reset your password securely to return to customer reviews, appointments, and AI integrations."
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
          Account recovery
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)]">
          Forgot your password?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Enter your registered work email address below and we will send you a link to reset your password.
        </p>
      </div>

      <form className="mt-8 space-y-5" action={requestPasswordReset}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Work email</span>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            defaultValue={emailParam}
            placeholder="you@company.com"
            autoComplete="email"
            className={INPUT_CLASS}
          />
        </label>

        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition hover:bg-[var(--color-primary-h)]"
        >
          Send reset instructions
          <span aria-hidden>→</span>
        </button>
      </form>

      <div className="mt-7 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Remembered your password?{" "}
          <Link href="/login" className="font-semibold text-[var(--color-primary-h)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function ForgotPasswordClient() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

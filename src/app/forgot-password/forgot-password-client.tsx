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
  const devUrl = searchParams?.get("devUrl") ?? undefined;
  const delivered = searchParams?.get("delivered") === "true";
  const smtpError = searchParams?.get("smtpError") ?? undefined;

  useEffect(() => {
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
  }, [error, retry]);

  useEffect(() => {
    if (smtpError) {
      toast.error(`SMTP delivery warning: ${smtpError}`);
    }
  }, [smtpError]);

  return (
    <AuthShell
      sideTitle="Regain quick access to your workspace."
      sideDescription="Reset your password securely to return to customer reviews, appointments, and AI integrations."
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Account Recovery</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)]">Forgot your password?</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Enter your registered work email address below and we will send you instructions to reset your password.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {status === "google_account" && (
          <div className="rounded-2xl border border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] p-4 text-sm text-[var(--color-text)]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-base leading-none">ℹ️</span>
              <div>
                <p className="font-semibold text-[var(--color-primary-h)]">Google Account Detected</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  The account for <strong className="font-semibold text-[var(--color-text)]">{emailParam}</strong> is signed in using Google. You don&rsquo;t need a password—simply use Google Sign-In on the login page.
                </p>
                <div className="mt-3">
                  <Link
                    href={`/login?email=${encodeURIComponent(emailParam)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary-h)] hover:underline"
                  >
                    Return to Sign In with Google →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === "sent" && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-[var(--color-text)]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg leading-none">✉️</span>
              <div className="space-y-2">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {delivered ? "Reset instructions emailed!" : "Check your inbox"}
                </p>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  {delivered ? (
                    <>We sent a password reset email to <strong className="font-semibold text-[var(--color-text)]">{emailParam}</strong>. Please check your inbox and spam folder.</>
                  ) : (
                    <>If an account exists for <strong className="font-semibold text-[var(--color-text)]">{emailParam}</strong>, we have sent a password reset link to that email address.</>
                  )}
                </p>

                {devUrl && (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Local Development Link</p>
                    <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
                      The reset link was generated. You can test your reset directly:
                    </p>
                    <a
                      href={devUrl}
                      className="mt-2 inline-block rounded-lg bg-amber-500/20 px-3 py-1.5 font-mono text-[11px] font-semibold text-amber-900 dark:text-amber-100 hover:bg-amber-500/30 break-all"
                    >
                      Open Reset Password Page →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {status !== "sent" && status !== "google_account" && (
          <form className="space-y-5" action={requestPasswordReset}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Work email</span>
              <input
                id="email"
                name="email"
                type="email"
                required
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
        )}
      </div>

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

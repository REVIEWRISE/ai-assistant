"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { performPasswordReset } from "@/app/reset-password/actions";
import { toast } from "@/lib/toast";

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-sm text-[var(--color-text)] shadow-sm outline-none transition placeholder:text-[var(--color-text-subtle)] hover:border-[var(--color-border-hover)] focus:border-[var(--color-primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]";

function PasswordIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9.3 3.4 10.9 8a11.8 11.8 0 0 1-2.3 3.8M6.2 6.2A13.6 13.6 0 0 0 1.1 12c1.9 4.6 6.2 8 10.9 8 1.6 0 3.2-.4 4.6-1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1.1 12C3 7.4 7.3 4 12 4s9 3.4 10.9 8c-1.9 4.6-6.2 8-10.9 8S3 16.6 1.1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const error = searchParams?.get("error") ?? undefined;
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!error) return;
    const messages: Record<string, string> = {
      missing: "Please enter both password fields.",
      mismatch: "Passwords do not match.",
      short: "Password must be at least 8 characters long.",
      invalid: "Invalid or expired reset link. Please request a new one.",
      expired: "Your password reset link has expired. Please request a new one.",
    };
    toast.error(messages[error] ?? "Unable to reset password. Please try again.");
  }, [error]);

  if (!token) {
    return (
      <AuthShell
        sideTitle="Set your new account password."
        sideDescription="Choose a strong, secure password to protect your VyntRise workspace."
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">Invalid Link</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)]">Reset Link Missing</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
            This password reset link is invalid or has already been used.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition hover:bg-[var(--color-primary-h)]"
          >
            Request a new reset link
            <span aria-hidden>→</span>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      sideTitle="Set your new account password."
      sideDescription="Choose a strong, secure password to protect your VyntRise workspace."
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Security</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)]">Set new password</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Please enter your new password below. It must be at least 8 characters long.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <form className="space-y-5" action={performPasswordReset}>
          <input type="hidden" name="token" value={token} />

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">New password</span>
            <span className="relative block">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="Enter at least 8 characters"
                autoComplete="new-password"
                className={`${INPUT_CLASS} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
              >
                <PasswordIcon hidden={showPassword} />
              </button>
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Confirm new password</span>
            <span className="relative block">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                className={`${INPUT_CLASS} pr-11`}
              />
            </span>
          </label>

          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition hover:bg-[var(--color-primary-h)]"
          >
            Update password
            <span aria-hidden>→</span>
          </button>
        </form>
      </div>

      <div className="mt-7 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Back to{" "}
          <Link href="/login" className="font-semibold text-[var(--color-primary-h)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function ResetPasswordClient() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

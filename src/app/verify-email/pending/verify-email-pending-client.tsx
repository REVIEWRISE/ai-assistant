"use client";

import { useEffect } from "react";
import Link from "next/link";
import { resendVerificationEmail } from "@/app/verify-email/actions";
import { AuthShell } from "@/components/auth-shell";
import { toast } from "@/lib/toast";

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-sm text-[var(--color-text)] shadow-sm outline-none transition placeholder:text-[var(--color-text-subtle)] hover:border-[var(--color-border-hover)] focus:border-[var(--color-primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]";

export function VerifyEmailPendingClient({
  email,
  error,
  sent,
}: {
  email: string;
  error: string;
  sent: boolean;
}) {
  useEffect(() => {
    if (sent) {
      toast.success("Verification email sent. Check your inbox.");
      const next = new URLSearchParams();
      if (email) next.set("email", email);
      window.history.replaceState(null, "", `/verify-email/pending${next.toString() ? `?${next}` : ""}`);
      return;
    }
    if (!error) return;
    const messages: Record<string, string> = {
      invalid: "That verification link is invalid. Request a new one below.",
      expired: "That verification link has expired. Request a new one below.",
      rate_limited: "Too many resend attempts. Please try again later.",
      missing: "Enter the email you used to register.",
      unverified: "Please verify your email before signing in.",
      smtp_unavailable: "Email sending is not configured. Contact support.",
      send_failed: "We couldn’t send the verification email. Please try again.",
    };
    toast.error(messages[error] ?? "Unable to verify email. Please try again.");
    const next = new URLSearchParams();
    if (email) next.set("email", email);
    window.history.replaceState(null, "", `/verify-email/pending${next.toString() ? `?${next}` : ""}`);
  }, [email, error, sent]);

  return (
    <AuthShell
      sideTitle="One quick step before your workspace opens."
      sideDescription="Confirm your email so we know how to reach you about bookings, billing, and account security."
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
          Check your inbox
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)]">
          Verify your email
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          {email ? (
            <>
              We sent a verification link to{" "}
              <span className="font-semibold text-[var(--color-text)]">{email}</span>. Open it to
              continue setup.
            </>
          ) : (
            <>We sent a verification link to your email. Open it to continue setup.</>
          )}
        </p>
      </div>

      <div className="mt-7 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
        Didn&apos;t get it? Check spam, wait a minute, then resend. The link expires in 24 hours.
      </div>

      <form className="mt-6 space-y-4" action={resendVerificationEmail}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={email}
            placeholder="you@company.com"
            autoComplete="email"
            className={INPUT_CLASS}
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-6 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
        >
          Resend verification email
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Already verified?{" "}
        <Link href="/login" className="font-semibold text-[var(--color-primary-h)] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

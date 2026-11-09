"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { resendVerificationEmail } from "@/app/verify-email/actions";
import { AuthShell } from "@/components/auth-shell";
import { toast } from "@/lib/toast";

const NEXT_STEPS = [
  "Open the email from VyntRise",
  "Click the verification link",
  "Finish setting up your workspace",
] as const;

// Shown in place of "we sent you a link" when the visitor arrives from a link that can't be used.
const LINK_PROBLEMS: Record<string, { title: string; body: string }> = {
  expired: {
    title: "This link has expired",
    body: "Verification links last 24 hours. Request a new one below and use the latest email.",
  },
  invalid: {
    title: "This link isn't valid",
    body: "It may be incomplete or already used. Request a new one below and use the latest email.",
  },
};

function ResendButton({ label, solid }: { label: string; solid: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`lp-btn ${solid ? "lp-btn-solid" : "lp-btn-outline"} w-full disabled:opacity-60`}
    >
      {pending ? "Sending…" : label}
    </button>
  );
}

export function VerifyEmailPendingClient({
  email,
  error,
  sent,
}: {
  email: string;
  error: string;
  sent: boolean;
}) {
  // No address in the URL means the visitor has to type one to resend.
  const [editingEmail, setEditingEmail] = useState(!email);
  const linkProblem = sent ? undefined : LINK_PROBLEMS[error];

  useEffect(() => {
    if (sent) {
      toast.success("Verification email sent. Check your inbox.");
      const next = new URLSearchParams();
      if (email) next.set("email", email);
      window.history.replaceState(null, "", `/verify-email/pending${next.toString() ? `?${next}` : ""}`);
      return;
    }
    // Link problems stay in the URL and on the page, so a refresh keeps the right message.
    if (!error || LINK_PROBLEMS[error]) return;
    const messages: Record<string, string> = {
      rate_limited: "Too many resend attempts. Please try again later.",
      missing: "Enter the email you used to register.",
      invalid_email: "Please enter a valid email address.",
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
      steps={NEXT_STEPS}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--lp-solid)] text-white">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7.5 8 6 8-6" />
        </svg>
      </span>

      <h2 className="mt-6 text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.035em] text-[var(--color-text)]">
        {linkProblem ? linkProblem.title : "Verify your email"}
      </h2>
      <p className="mt-3 text-[15px] leading-7 text-[var(--color-text-muted)] [overflow-wrap:anywhere]">
        {linkProblem ? (
          linkProblem.body
        ) : email ? (
          <>
            We sent a verification link to{" "}
            <span className="font-semibold text-[var(--color-text)]">{email}</span>. Open it to continue setup.
          </>
        ) : (
          <>We sent a verification link to your email. Open it to continue setup.</>
        )}
      </p>

      <div className="mt-8 border-t border-[var(--color-border)] pt-6">
        <h3 className="text-base font-semibold text-[var(--color-text)]">
          {linkProblem ? "Get a new link" : "Didn’t get it?"}
        </h3>
        <p className="mt-1 text-[15px] leading-7 text-[var(--color-text-muted)]">
          {linkProblem
            ? "Use the email you registered with and we’ll send a fresh verification link."
            : "Check spam, wait a minute, then resend. The link expires in 24 hours."}
        </p>

        <form className="mt-5 space-y-3" action={resendVerificationEmail}>
          {editingEmail ? (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Email</span>
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                defaultValue={email}
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus={Boolean(email)}
                className="lp-input"
              />
            </label>
          ) : (
            <div className="flex min-h-12 items-center justify-between gap-4 rounded-2xl bg-[var(--lp-tint)] px-4 text-sm">
              <input type="hidden" name="email" value={email} />
              <span className="min-w-0 truncate font-medium text-[var(--color-text)]">{email}</span>
              <button
                type="button"
                onClick={() => setEditingEmail(true)}
                className="shrink-0 font-semibold text-[var(--lp-accent)] underline-offset-4 hover:underline"
              >
                Change
              </button>
            </div>
          )}
          <ResendButton
            label={linkProblem ? "Send new verification link" : "Resend verification email"}
            solid={Boolean(linkProblem)}
          />
        </form>
      </div>

      <p className="mt-6 text-center text-[15px] text-[var(--color-text-muted)]">
        Already verified?{" "}
        <Link href="/login" className="font-semibold text-[var(--lp-accent)] underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

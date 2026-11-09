"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resendLoginCode, verifyLoginCode } from "@/app/login/verify/actions";
import { AuthShell } from "@/components/auth-shell";
import { toast } from "@/lib/toast";

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
        <h2 className="text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.035em] text-[var(--color-text)]">
          Check your email
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-[var(--color-text-muted)]">
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
            className="lp-input lp-input-code"
          />
        </label>

        <button
          type="submit"
          className="lp-btn lp-btn-solid w-full"
        >
          Verify and sign in
        </button>
      </form>

      <form className="mt-4" action={resendLoginCode}>
        <button
          type="submit"
          className="lp-btn lp-btn-outline w-full"
        >
          Resend code
        </button>
      </form>

      <p className="mt-6 text-center text-[15px] text-[var(--color-text-muted)]">
        Not you?{" "}
        <Link href="/login" className="font-semibold text-[var(--lp-accent)] underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
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

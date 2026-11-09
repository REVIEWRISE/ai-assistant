"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { registerUser } from "@/app/register/actions";
import { AuthShell } from "@/components/auth-shell";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { toast } from "@/lib/toast";

const SETUP_STEPS = [
  "Connect your channels",
  "Set your brand tone and approval rules",
  "Launch 24/7 automation",
] as const;

const FIELD_LABEL_CLASS = "mb-2 block text-sm font-semibold text-[var(--color-text)]";
const FIELD_HINT_CLASS = "mt-1.5 block text-sm leading-6 text-[var(--color-text-muted)]";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro_voice: "Pro Voice",
};

function PasswordToggle({ show, onToggle, label }: { show: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" onClick={onToggle} aria-label={label} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]">
      {show ? (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9.3 3.4 10.9 8a11.8 11.8 0 0 1-2.3 3.8M6.2 6.2A13.6 13.6 0 0 0 1.1 12c1.9 4.6 6.2 8 10.9 8 1.6 0 3.2-.4 4.6-1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M1.1 12C3 7.4 7.3 4 12 4s9 3.4 10.9 8c-1.9 4.6-6.2 8-10.9 8S3 16.6 1.1 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function RegisterPageContent({ googleAuthEnabled }: { googleAuthEnabled: boolean }) {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") ?? undefined;
  const selectedPlanSlug = searchParams?.get("plan") ?? "";
  const selectedPlan = PLAN_LABELS[selectedPlanSlug];
  const selectedInterval =
    searchParams?.get("interval") === "yearly" ? "yearly" : "monthly";
  const preservedName = searchParams?.get("name") ?? "";
  const preservedEmail = searchParams?.get("email") ?? "";
  const preservedOrganization = searchParams?.get("organization_name") ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!error) return;
    const messages: Record<string, string> = {
      missing: "Please fill in all required fields.",
      invalid_email: "Please enter a valid work email address (e.g. you@company.com).",
      organization_name: "Workspace name must be 100 characters or fewer.",
      nomatch: "Passwords do not match.",
      weak_password:
        "Password must be at least 12 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.",
      weak_password_personal: "Password must not contain your name or email address.",
      exists: "An account with this email already exists.",
      oauth_exists: "An account with this email uses Google Sign-In. Please sign in with Google instead.",
      rate_limited: "Too many registration attempts. Please try again later.",
    };
    toast.error(messages[error] ?? "Unable to create account. Please try again.");

    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.delete("error");
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `/register?${qs}` : "/register");
  }, [error, searchParams]);

  return (
    <AuthShell
      sideTitle="Create the workspace your customer operations deserve."
      sideDescription="Start with one workflow, invite your team, and connect reviews, appointments, and leads when you are ready."
      steps={SETUP_STEPS}
    >
      <div>
        <h2 className="text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.035em] text-[var(--color-text)]">Create your workspace</h2>
        <p className="mt-3 text-[15px] leading-7 text-[var(--color-text-muted)]">Your account includes a 14-day trial. No credit card required.</p>
        {selectedPlan ? (
          <p className="mt-4 rounded-2xl bg-[var(--lp-tint)] px-4 py-3 text-sm text-[var(--color-text)]">
            <span className="font-semibold text-[var(--lp-accent)]">{selectedPlan} plan</span>
            {" · "}
            {selectedInterval === "yearly" ? "Billed annually" : "Billed monthly"}
          </p>
        ) : null}
      </div>

      <div className="mt-7 space-y-5">
        <GoogleAuthButton
          enabled={googleAuthEnabled}
          label="Continue with Google"
          plan={selectedPlanSlug || undefined}
          interval={selectedInterval}
        />

        <form className="grid gap-4 sm:grid-cols-2" action={registerUser}>
          {selectedPlan ? <input type="hidden" name="plan" value={selectedPlanSlug} /> : null}
          <input type="hidden" name="interval" value={selectedInterval} />
          <label className="block">
            <span className={FIELD_LABEL_CLASS}>Full name</span>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={preservedName}
              placeholder="Jane Doe"
              autoComplete="name"
              className="lp-input"
            />
          </label>
          <label className="block">
            <span className={FIELD_LABEL_CLASS}>Work email</span>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={254}
              defaultValue={preservedEmail}
              placeholder="you@company.com"
              autoComplete="email"
              className="lp-input"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={FIELD_LABEL_CLASS}>Workspace name</span>
            <input
              id="organization_name"
              name="organization_name"
              type="text"
              required
              maxLength={100}
              defaultValue={preservedOrganization}
              placeholder="Acme Dental"
              autoComplete="organization"
              className="lp-input"
            />
            <span className={FIELD_HINT_CLASS}>
              This is your organization or business name. You can create more workspaces later.
            </span>
          </label>
          <label className="block">
            <span className={FIELD_LABEL_CLASS}>Password</span>
            <span className="relative block">
              <input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={12} placeholder="Create password" autoComplete="new-password" className="lp-input lp-input-toggle" />
              <PasswordToggle show={showPassword} onToggle={() => setShowPassword((current) => !current)} label={showPassword ? "Hide password" : "Show password"} />
            </span>
          </label>
          <label className="block">
            <span className={FIELD_LABEL_CLASS}>Confirm password</span>
            <span className="relative block">
              <input id="confirm-password" name="confirm_password" type={showConfirm ? "text" : "password"} required placeholder="Repeat password" autoComplete="new-password" className="lp-input lp-input-toggle" />
              <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm((current) => !current)} label={showConfirm ? "Hide password confirmation" : "Show password confirmation"} />
            </span>
          </label>

          <p className="-mt-2 text-sm leading-6 text-[var(--color-text-muted)] sm:col-span-2">
            Use at least 12 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.
          </p>

          <button type="submit" className="lp-btn lp-btn-solid mt-1 w-full sm:col-span-2">
            Create free account
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-[15px] text-[var(--color-text-muted)]">
        Already have an account? <Link href="/login" className="font-semibold text-[var(--lp-accent)] underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPageClient({ googleAuthEnabled }: { googleAuthEnabled: boolean }) {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent googleAuthEnabled={googleAuthEnabled} />
    </Suspense>
  );
}

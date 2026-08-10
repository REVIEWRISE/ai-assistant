"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { registerUser } from "@/app/register/actions";
import { AuthShell } from "@/components/auth-shell";
import { toast } from "@/lib/toast";

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-sm text-[var(--color-text)] shadow-sm outline-none transition placeholder:text-[var(--color-text-subtle)] hover:border-[var(--color-border-hover)] focus:border-[var(--color-primary)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]";

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

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") ?? undefined;
  const selectedPlanSlug = searchParams?.get("plan") ?? "";
  const selectedPlan = PLAN_LABELS[selectedPlanSlug];
  const selectedInterval =
    searchParams?.get("interval") === "monthly" ? "monthly" : "yearly";
  const preservedName = searchParams?.get("name") ?? "";
  const preservedEmail = searchParams?.get("email") ?? "";
  const preservedOrganization = searchParams?.get("organization_name") ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!error) return;
    const messages: Record<string, string> = {
      missing: "Please fill in all required fields.",
      organization_name: "Workspace name must be 100 characters or fewer.",
      nomatch: "Passwords do not match.",
      weak_password:
        "Password must be at least 12 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.",
      weak_password_personal: "Password must not contain your name or email address.",
      exists: "An account with this email already exists.",
      rate_limited: "Too many registration attempts. Please try again later.",
    };
    toast.error(messages[error] ?? "Unable to create account. Please try again.");

    // Drop error from the URL so refresh / retry does not keep showing the same toast.
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.delete("error");
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `/register?${qs}` : "/register");
  }, [error, searchParams]);

  return (
    <AuthShell
      sideTitle="Create the workspace your customer operations deserve."
      sideDescription="Start with one workflow, invite your team, and connect reviews, appointments, and leads when you are ready."
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Start free</p>
          {selectedPlan ? <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold capitalize text-[var(--color-primary-h)]">{selectedPlan} plan</span> : null}
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)]">Create your workspace</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">Your account includes a 14-day trial. No credit card required.</p>
      </div>

      <form className="mt-7 space-y-4" action={registerUser}>
        {selectedPlan ? <input type="hidden" name="plan" value={selectedPlanSlug} /> : null}
        <input type="hidden" name="interval" value={selectedInterval} />
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Full name</span>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={preservedName}
            placeholder="Jane Doe"
            autoComplete="name"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Work email</span>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={preservedEmail}
            placeholder="you@company.com"
            autoComplete="email"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Workspace name</span>
          <input
            id="organization_name"
            name="organization_name"
            type="text"
            required
            maxLength={100}
            defaultValue={preservedOrganization}
            placeholder="Acme Dental"
            autoComplete="organization"
            className={INPUT_CLASS}
          />
          <span className="mt-1.5 block text-xs text-[var(--color-text-muted)]">
            This is your organization or business name. You can create more workspaces later.
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Password</span>
          <span className="relative block">
            <input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={12} placeholder="Create a secure password" autoComplete="new-password" className={`${INPUT_CLASS} pr-11`} />
            <PasswordToggle show={showPassword} onToggle={() => setShowPassword((current) => !current)} label={showPassword ? "Hide password" : "Show password"} />
          </span>
          <span className="mt-1.5 block text-xs text-[var(--color-text-muted)]">
            At least 12 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--color-text)]">Confirm password</span>
          <span className="relative block">
            <input id="confirm-password" name="confirm_password" type={showConfirm ? "text" : "password"} required placeholder="Repeat your password" autoComplete="new-password" className={`${INPUT_CLASS} pr-11`} />
            <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm((current) => !current)} label={showConfirm ? "Hide password confirmation" : "Show password confirmation"} />
          </span>
        </label>

        <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition hover:bg-[var(--color-primary-h)]">
          Create free account <span aria-hidden>→</span>
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Already have an account? <Link href="/login" className="font-semibold text-[var(--color-primary-h)] hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={null}><RegisterPageContent /></Suspense>;
}

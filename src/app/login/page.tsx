"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginUser } from "@/app/login/actions";
import { BrandLogo } from "@/components/brand-logo";
import { PRODUCT_NAME } from "@/lib/brand";
import { toast } from "@/lib/toast";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const SIDE_FEATURES = [
  { t: "Avg. response time down sharply", bar: "from-primary to-indigo-700" },
  { t: "Lead capture with CRM-friendly handoff", bar: "from-[var(--color-grad-start)] to-[var(--color-grad-end)]" },
  { t: "Review replies with approval rules", bar: "from-violet-500 to-purple-600" },
] as const;

function LoginPageContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") ?? undefined;
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!error) return;
    if (error === "missing") {
      toast.error("Please provide both email and password.");
      return;
    }
    toast.error("Invalid email or password.");
  }, [error]);

  return (
    <div className="landing relative min-h-[100dvh] w-full overflow-x-clip text-[var(--color-text)] antialiased">
      <div className="landing-mesh pointer-events-none absolute inset-0" aria-hidden />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-35" aria-hidden />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl items-center px-4 py-10 sm:px-6 sm:py-12">
        <section className="grid w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[var(--shadow-lg)] lg:grid-cols-[1fr_1.05fr]">
          <div className="relative hidden overflow-hidden bg-[#0b101a] p-8 text-white lg:block lg:p-10">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,color-mix(in_srgb,#6366f1_28%,transparent),transparent_55%),radial-gradient(ellipse_50%_45%_at_100%_85%,color-mix(in_srgb,#41a5ff_18%,transparent),transparent),radial-gradient(ellipse_40%_35%_at_0%_55%,color-mix(in_srgb,#9d4edd_14%,transparent),transparent)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px]"
              aria-hidden
            />
            <div className="relative">
              <BrandLogo
                href="/"
                size="sm"
                primary={PRODUCT_NAME}
                className="text-white [&_p]:text-[11px] [&_p]:font-semibold [&_p]:uppercase [&_p]:tracking-[0.2em] [&_p]:text-sky-300"
                linkClassName="transition hover:opacity-90"
              />
              <h1 className="mt-6 text-2xl font-semibold leading-tight tracking-tight text-white xl:text-3xl">
                One workspace for reviews, bookings, and leads.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
                Fast follow-ups, clean handoffs, and conversion you can measure, without another tab sprawl.
              </p>

              <ul className="mt-8 space-y-3 text-sm">
                {SIDE_FEATURES.map((row) => (
                  <li
                    key={row.t}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                  >
                    <span className={`h-8 w-1 shrink-0 rounded-full bg-gradient-to-b ${row.bar}`} aria-hidden />
                    <span className="text-zinc-200">{row.t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="auth-light-panel relative bg-white p-6 sm:p-8 lg:p-10">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,#6366f1_14%,transparent),transparent)] blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-6 lg:hidden">
                <BrandLogo href="/" size="sm" primary={PRODUCT_NAME} className="text-slate-900" />
              </div>

              <div className="vr-landing-eyebrow">Welcome back</div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">Sign in</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Access your operations workspace.</p>

              <form className="mt-8 space-y-4" action={loginUser}>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-900" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="block text-sm font-semibold text-slate-900" htmlFor="password">
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-500 transition hover:text-indigo-600"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={`${INPUT_CLASS} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                          <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9.3 3.4 10.9 8-0.5 1.4-1.3 2.7-2.3 3.8" />
                          <path d="M6.2 6.2C4 7.7 2.4 9.7 1.1 12c1.9 4.6 6.2 8 10.9 8 1.6 0 3.2-0.4 4.6-1" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1.1 12C3 7.4 7.3 4 12 4s9 3.4 10.9 8c-1.9 4.6-6.2 8-10.9 8s-9-3.4-10.9-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="vr-landing-btn-primary mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold"
                >
                  Sign in
                  <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600 sm:text-left">
                New here?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-indigo-600 underline decoration-indigo-200 underline-offset-2 transition hover:text-indigo-700 hover:decoration-indigo-400"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

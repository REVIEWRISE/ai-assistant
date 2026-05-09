"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginUser } from "@/app/login/actions";
import { toast } from "@/lib/toast";

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
    <div className="relative min-h-[100dvh] w-full overflow-hidden text-zinc-900 antialiased">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(251,191,36,0.14),transparent_60%),radial-gradient(ellipse_40%_40%_at_100%_20%,rgba(20,184,166,0.08),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(24,24,27,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl items-center px-4 py-10 sm:px-6 sm:py-12">
        <section className="grid w-full overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/95 via-white/85 to-[#faf8f5]/90 shadow-[0_24px_64px_-28px_rgba(24,24,27,0.14),0_8px_28px_-12px_rgba(24,24,27,0.06),inset_0_1px_0_0_rgba(255,255,255,1)] ring-1 ring-zinc-200/70 backdrop-blur-md lg:grid-cols-[1fr_1.05fr]">
          <div className="relative hidden overflow-hidden bg-zinc-950 p-8 text-zinc-100 lg:block lg:p-10">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,rgba(251,191,36,0.14),transparent_55%),radial-gradient(ellipse_50%_45%_at_100%_85%,rgba(20,184,166,0.1),transparent),radial-gradient(ellipse_40%_35%_at_0%_55%,rgba(167,139,250,0.07),transparent)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px]"
              aria-hidden
            />
            <div className="relative">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/90 transition hover:text-amber-200"
              >
                <span className="text-white/90">AI Assistant</span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400">Home</span>
              </Link>
              <h1 className="mt-6 text-2xl font-semibold leading-tight tracking-tight text-white xl:text-3xl">
                One workspace for reviews, bookings, and leads.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
                Fast follow-ups, clean handoffs, and conversion you can measure—without another tab sprawl.
              </p>

              <ul className="mt-8 space-y-3 text-sm">
                {[
                  { t: "Avg. response time down sharply", a: "amber" as const },
                  { t: "Lead capture with CRM-friendly handoff", a: "teal" as const },
                  { t: "Review replies with approval rules", a: "violet" as const },
                ].map((row) => {
                  const bar =
                    row.a === "amber"
                      ? "from-amber-400 to-orange-500"
                      : row.a === "teal"
                        ? "from-teal-400 to-emerald-600"
                        : "from-violet-400 to-purple-600";
                  return (
                    <li
                      key={row.t}
                      className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.03] px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-white/10"
                    >
                      <span className={`h-8 w-1 shrink-0 rounded-full bg-gradient-to-b ${bar}`} aria-hidden />
                      <span className="text-zinc-200">{row.t}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-amber-400/15 via-transparent to-teal-400/10 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-gradient-to-b from-white/90 to-amber-50/40 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-900/85 ring-1 ring-amber-200/50">
                Welcome back
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[1.65rem]">Sign in</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Access your operations workspace.
              </p>

              <form className="mt-8 space-y-4" action={loginUser}>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-zinc-800" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-zinc-200/90 bg-[#faf8f5]/90 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200/50"
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="block text-sm font-semibold text-zinc-800" htmlFor="password">
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-zinc-500 transition hover:text-zinc-800"
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
                      className="w-full rounded-xl border border-zinc-200/90 bg-[#faf8f5]/90 px-3.5 py-2.5 pr-11 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
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
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-800 py-3.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 ring-1 ring-zinc-950/10 transition hover:from-zinc-800 hover:to-zinc-700"
                >
                  Sign in
                  <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-600 sm:text-left">
                New here?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition hover:decoration-amber-500/80"
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

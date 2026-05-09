import Link from "next/link";
import { CheckIcon } from "@/components/landing/landing-icons";
import { PricingCardTilt } from "@/components/pricing-card-tilt";
import type { LandingPlan } from "@/lib/landing-data";

export function LandingPricingSection({
  plans,
  registerHref,
  isLoggedIn,
}: {
  plans: LandingPlan[];
  registerHref: string;
  isLoggedIn: boolean;
}) {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden border-t border-zinc-200/60 bg-gradient-to-b from-white via-white to-[#faf8f5] py-14 sm:py-20 lg:py-24"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[min(100%,44rem)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.14),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(24,24,27,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white/70 to-white/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-900/85 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] backdrop-blur-md ring-1 ring-white/50">
            <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pricing
          </div>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Plans for single and multi-location teams
          </h3>
          <p className="mt-3 text-base leading-relaxed text-zinc-600 sm:text-lg">
            Start small. Add locations when you&rsquo;re ready.
          </p>
          <div className="mt-5">
            <Link
              href={registerHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-800 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 ring-1 ring-zinc-950/10 transition hover:from-zinc-800 hover:to-zinc-700"
            >
              {isLoggedIn ? "Dashboard" : "Start free"}
              <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:gap-7 lg:mt-12 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan, i) => {
            const accents = [
              {
                glow: "from-amber-400/25 via-orange-300/15 to-transparent",
                check: "bg-amber-500/15 text-amber-700 ring-amber-500/20",
                checkIcon: "text-amber-700",
              },
              {
                glow: "from-teal-400/25 via-emerald-300/15 to-transparent",
                check: "bg-teal-500/15 text-teal-700 ring-teal-500/20",
                checkIcon: "text-teal-700",
              },
              {
                glow: "from-violet-400/20 via-purple-300/12 to-transparent",
                check: "bg-violet-500/15 text-violet-700 ring-violet-500/20",
                checkIcon: "text-violet-700",
              },
            ] as const;
            const a = plan.featured ? accents[0] : accents[i % accents.length];
            return (
              <div
                key={plan.title}
                className={`group relative flex flex-col ${plan.featured ? "pt-7 sm:pt-8" : ""} ${
                  plan.featured
                    ? "z-20 md:-translate-y-2 md:scale-[1.03] lg:-translate-y-5 lg:scale-[1.065] xl:scale-[1.07] motion-reduce:md:translate-y-0 motion-reduce:md:scale-100 motion-reduce:lg:translate-y-0 motion-reduce:lg:scale-100"
                    : ""
                }`}
              >
                {plan.featured ? (
                  <span className="absolute left-1/2 top-7 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/60 bg-gradient-to-b from-amber-500 to-orange-600 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-lg shadow-amber-500/35 sm:top-8">
                    Most popular
                  </span>
                ) : null}
                <PricingCardTilt
                  className={`relative flex flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/95 via-white/75 to-white/55 ring-1 backdrop-blur-md transition-[box-shadow] duration-300 motion-reduce:transition-none ${
                    plan.featured
                      ? "min-h-[29rem] shadow-[0_28px_64px_-22px_rgba(245,158,11,0.28),0_18px_48px_-24px_rgba(24,24,27,0.14),0_8px_24px_-12px_rgba(24,24,27,0.08),inset_0_1px_0_0_rgba(255,255,255,1)] ring-2 ring-amber-400/45 sm:min-h-[32rem] lg:min-h-[34rem]"
                      : "min-h-[26rem] shadow-[0_12px_40px_-20px_rgba(24,24,27,0.1),0_4px_16px_-8px_rgba(24,24,27,0.05),inset_0_1px_0_0_rgba(255,255,255,1)] ring-zinc-200/70 sm:min-h-[28rem] hover:shadow-[0_20px_48px_-24px_rgba(24,24,27,0.12),0_8px_24px_-12px_rgba(24,24,27,0.06)]"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br ${a.glow} opacity-60 blur-2xl transition duration-500 group-hover:opacity-100 group-hover:blur-3xl`}
                    aria-hidden
                  />
                  <div
                    suppressHydrationWarning
                    className={`relative flex min-h-0 flex-1 flex-col ${plan.featured ? "p-8 sm:p-9" : "p-7 sm:p-8"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <span className="rounded-full bg-gradient-to-b from-white/90 to-white/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 ring-1 ring-zinc-200/60 backdrop-blur-sm">
                        {plan.title}
                      </span>
                      <span className="font-mono text-[11px] font-medium tabular-nums text-zinc-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div
                      className={`relative mt-6 overflow-hidden rounded-2xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] ring-1 sm:p-6 ${
                        plan.featured
                          ? "bg-gradient-to-br from-amber-50/90 via-white/70 to-orange-50/40 ring-amber-200/45"
                          : "bg-gradient-to-br from-zinc-50/95 via-white/65 to-zinc-50/30 ring-zinc-200/65"
                      }`}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(24,24,27,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.04)_1px,transparent_1px)] bg-[size:14px_14px]"
                        aria-hidden
                      />
                      <p className="relative text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Billed monthly</p>
                      <div className="relative mt-3 flex flex-wrap items-baseline gap-2.5">
                        <span className="text-[2.65rem] font-semibold leading-none tracking-tight text-zinc-950 sm:text-5xl">
                          {plan.price}
                        </span>
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-zinc-600 shadow-sm ring-1 ring-zinc-200/70">
                          {plan.period}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 flex min-h-0 flex-1 flex-col border-t border-zinc-200/70 pt-8">
                      <ul className="flex flex-1 flex-col gap-3.5">
                        {plan.items.map((line) => (
                          <li key={line} className="flex items-start gap-3 text-sm leading-relaxed text-zinc-700">
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ${a.check}`}
                              aria-hidden
                            >
                              <CheckIcon className={`h-2.5 w-2.5 shrink-0 ${a.checkIcon}`} />
                            </span>
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      href={registerHref}
                      className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition ${
                        plan.featured
                          ? "bg-gradient-to-b from-zinc-900 to-zinc-800 text-white shadow-lg shadow-zinc-900/15 ring-1 ring-zinc-950/10 hover:from-zinc-800 hover:to-zinc-700"
                          : "border border-zinc-200/90 bg-gradient-to-b from-white/90 to-[#faf8f5]/80 text-zinc-900 shadow-sm ring-1 ring-zinc-200/50 hover:border-zinc-300 hover:bg-white"
                      }`}
                    >
                      {isLoggedIn ? "Open app" : `Choose ${plan.title}`}
                      {plan.featured ? (
                        <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      ) : null}
                    </Link>
                  </div>
                </PricingCardTilt>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

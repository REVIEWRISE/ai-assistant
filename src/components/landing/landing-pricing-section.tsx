import Link from "next/link";
import { CheckIcon } from "@/components/landing/landing-icons";
import { PricingCardTilt } from "@/components/pricing-card-tilt";
import type { LandingPlan } from "@/lib/landing-data";

const PLAN_ACCENTS = [
  {
    glow: "from-primary/25 via-indigo-300/15 to-transparent",
    check: "border-primary/25 bg-primary/15",
    checkIcon: "text-[var(--color-primary-h)]",
    priceBorder: "border-primary/30",
    priceBg: "from-[var(--color-primary-soft)] via-[var(--color-bg)]/70 to-indigo-50/40",
    cardBorder: "border-primary/45",
  },
  {
    glow: "from-sky-400/25 via-cyan-300/15 to-transparent",
    check: "border-sky-200/80 bg-sky-500/15",
    checkIcon: "text-sky-700",
    priceBorder: "border-sky-200/80",
    priceBg: "from-sky-50/95 via-[var(--color-bg)]/65 to-cyan-50/30",
    cardBorder: "border-[var(--color-border)]",
  },
  {
    glow: "from-violet-400/20 via-purple-300/12 to-transparent",
    check: "border-violet-200/80 bg-violet-500/15",
    checkIcon: "text-violet-700",
    priceBorder: "border-violet-200/80",
    priceBg: "from-violet-50/95 via-[var(--color-bg)]/65 to-purple-50/30",
    cardBorder: "border-[var(--color-border)]",
  },
] as const;

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
      className="vr-landing-section relative overflow-hidden border-t border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg)] to-[var(--color-surface)] py-14 sm:py-20 lg:py-24"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[min(100%,44rem)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--color-primary)_14%,transparent),transparent_70%)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-35" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="vr-landing-eyebrow">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pricing
          </div>
          <h3 className="vr-landing-heading mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Plans for single and multi-location teams
          </h3>
          <p className="vr-landing-muted mt-3 text-base leading-relaxed sm:text-lg">
            Start small. Add locations when you&rsquo;re ready.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:gap-7 lg:mt-12 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan, i) => {
            const a = plan.featured ? PLAN_ACCENTS[0] : PLAN_ACCENTS[i % PLAN_ACCENTS.length];
            return (
              <div
                key={plan.title}
                className={`group relative flex flex-col ${plan.featured ? "pt-7 sm:pt-8" : ""} ${
                  plan.featured
                    ? "z-20 lg:-translate-y-5 lg:scale-[1.065] xl:scale-[1.07] motion-reduce:lg:translate-y-0 motion-reduce:lg:scale-100"
                    : ""
                }`}
              >
                {plan.featured ? (
                  <span className="vr-brand-gradient absolute left-1/2 top-7 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-lg shadow-primary/35 sm:top-8">
                    Most popular
                  </span>
                ) : null}
                <PricingCardTilt
                  className={`relative flex flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg)]/95 to-[var(--color-surface)] backdrop-blur-md transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none ${
                    plan.featured
                      ? `min-h-[29rem] border-2 shadow-[0_28px_64px_-22px_color-mix(in_srgb,var(--color-primary)_28%,transparent),var(--shadow-lg)] sm:min-h-[32rem] lg:min-h-[34rem] ${PLAN_ACCENTS[0].cardBorder}`
                      : `min-h-[26rem] border shadow-[var(--shadow-md)] hover:border-[var(--color-border-hover)] sm:min-h-[28rem] hover:shadow-[var(--shadow-lg)] ${a.cardBorder}`
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
                      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        {plan.title}
                      </span>
                      <span className="font-mono text-[11px] font-medium tabular-nums text-[var(--color-text-subtle)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div
                      className={`relative mt-6 overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] sm:p-6 ${a.priceBg} ${a.priceBorder}`}
                    >
                      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
                      <p className="relative text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
                        Billed monthly
                      </p>
                      <div className="relative mt-3 flex flex-wrap items-baseline gap-2.5">
                        <span className="text-[2.65rem] font-semibold leading-none tracking-tight text-[var(--color-text)] sm:text-5xl">
                          {plan.price}
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)] shadow-sm">
                          {plan.period}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 flex min-h-0 flex-1 flex-col border-t border-[var(--color-border)] pt-8">
                      <ul className="flex flex-1 flex-col gap-3.5">
                        {plan.items.map((line) => (
                          <li
                            key={line}
                            className="flex items-start gap-3 text-sm leading-relaxed text-[var(--color-text-muted)]"
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${a.check}`}
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
                          ? "vr-landing-btn-primary"
                          : "vr-landing-btn-secondary border border-[var(--color-border)] shadow-sm"
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

        <p className="vr-landing-muted mt-10 text-center text-sm sm:mt-12">
          Not sure which plan fits?{" "}
          <a
            href="#contact"
            className="font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-primary-h)]"
          >
            Talk to us
          </a>
          .
        </p>
      </div>
    </section>
  );
}

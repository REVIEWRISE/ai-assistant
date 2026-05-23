import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/brand";

export function LandingHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative w-full overflow-hidden pb-16 pt-2 sm:pb-20 sm:pt-3 lg:pb-24">
      <div
        className="pointer-events-none absolute -left-32 top-1/2 h-[min(560px,75vh)] w-[min(480px,60vw)] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-grad-start)_16%,transparent),transparent)] blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-center lg:gap-14">
          <div className="flex flex-col lg:py-4">
            <div className="vr-landing-eyebrow w-fit">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {PRODUCT_NAME}
            </div>

            <h1 className="vr-landing-heading mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:mt-7 sm:text-5xl sm:leading-[1.03] lg:mt-8 lg:text-[3.65rem] lg:leading-[1.02]">
              <span className="block sm:inline">AI agents for </span>
              <span className="vr-brand-gradient-text block sm:inline">reviews, bookings, and leads.</span>
            </h1>

            <p className="vr-landing-muted mt-6 max-w-xl text-[1.0625rem] leading-relaxed sm:text-lg lg:leading-relaxed">
              Faster replies, smarter scheduling, more booked time,{" "}
              <span className="font-medium text-[var(--color-text)]">without extra headcount.</span>
            </p>

            <ul className="mt-8 flex flex-col gap-2.5 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-3" aria-label="Core capabilities">
              {[
                { t: "On-brand review replies", dot: "vr-landing-dot-primary" },
                { t: "Calendar-aware booking", dot: "vr-landing-dot-cyan" },
                { t: "Lead → appointment wins", dot: "vr-landing-dot-purple" },
              ].map((row) => (
                <li key={row.t} className="vr-landing-chip">
                  <span className={`h-2 w-2 shrink-0 rounded-full shadow-sm ${row.dot}`} aria-hidden />
                  {row.t}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:flex-wrap sm:items-center">
              {isLoggedIn ? (
                <Link href="/dashboard" className="vr-landing-btn-primary w-full sm:w-auto sm:py-4">
                  Go to dashboard
                  <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              ) : (
                <Link href="/register" className="vr-landing-btn-primary w-full sm:w-auto sm:py-4">
                  Start free trial
                  <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
              <a href="#playbook" className="vr-landing-btn-secondary w-full sm:w-auto sm:py-4">
                See how it works
              </a>
            </div>

            <p className="vr-landing-muted mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-2">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-success)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]"
                  aria-hidden
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                No credit card required
              </span>
              <span className="hidden h-4 w-px bg-[var(--color-border)] sm:block" aria-hidden />
              <span>Setup in about 15 minutes</span>
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none lg:pl-4">
            <div
              className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--color-primary)_14%,transparent),transparent)] blur-2xl lg:-inset-6"
              aria-hidden
            />

            <div className="relative lg:[perspective:1200px]">
              <div className="relative origin-top transition-[transform,box-shadow] duration-500 ease-out will-change-transform lg:[transform:rotateY(-6deg)_rotateX(3deg)] lg:shadow-[var(--shadow-lg)] lg:hover:[transform:rotateY(-3deg)_rotateX(1deg)_translateY(-6px)]">
                <div className="vr-landing-card rounded-2xl p-1 lg:shadow-none">
                  <div className="overflow-hidden rounded-[0.9rem] bg-[var(--color-bg)]">
                    <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                      <div className="flex gap-1.5" aria-hidden>
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] border border-[color-mix(in_srgb,var(--color-text)_8%,transparent)]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] border border-[color-mix(in_srgb,var(--color-text)_8%,transparent)]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] border border-[color-mix(in_srgb,var(--color-text)_8%,transparent)]" />
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5">
                        <svg
                          className="h-3.5 w-3.5 shrink-0 text-[var(--color-success)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z"
                          />
                        </svg>
                        <span className="truncate text-[11px] font-medium text-[var(--color-text-muted)]">
                          vyntrise.com/agent
                        </span>
                      </div>
                    </div>

                    <div suppressHydrationWarning className="relative bg-gradient-to-b from-[var(--color-bg)] to-[var(--color-surface)] p-4 sm:p-5">
                      <div
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_8%,transparent),transparent)]"
                        aria-hidden
                      />
                      <div className="relative">
                        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-primary-h)]">
                            Live feed
                          </p>
                          <span className="rounded-full border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
                            Live
                          </span>
                        </div>

                        <div className="mt-3 space-y-2.5 text-sm">
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-[var(--color-text)]">New 5-star Google review</p>
                              <span className="shrink-0 rounded border border-primary/25 bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary-h)]">
                                New
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                              &ldquo;Clear communication and easy scheduling. We&rsquo;re impressed.&rdquo;
                            </p>
                            <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary-h)]">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
                              Draft ready in 16s
                            </p>
                          </div>

                          <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] p-3.5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-success)]">
                              AI action
                            </p>
                            <p className="mt-1.5 text-xs leading-snug text-[var(--color-text)] sm:text-sm">
                              Promo + booking CTA attached
                            </p>
                          </div>

                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 shadow-sm">
                            <p className="text-sm font-semibold text-[var(--color-text)]">Tonight</p>
                            <div className="mt-2 space-y-1.5 text-xs">
                              <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
                                <span className="min-w-0 text-[var(--color-text-muted)]">2:00 · Consult · 45 min</span>
                                <span className="w-fit rounded border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
                                  OK
                                </span>
                              </div>
                              <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
                                <span className="min-w-0 text-[var(--color-text-muted)]">3:30 · Site visit</span>
                                <span className="w-fit rounded border border-primary/25 bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary-h)]">
                                  Check
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

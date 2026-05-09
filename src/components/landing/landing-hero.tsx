import Link from "next/link";

export function LandingHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-5">
      <div
        className="pointer-events-none absolute -left-32 top-1/2 h-[min(560px,75vh)] w-[min(480px,60vw)] -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-200/30 via-orange-100/20 to-transparent blur-3xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-teal-200/15 blur-3xl" aria-hidden />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-center lg:gap-14">
        <div className="flex flex-col lg:py-4">
          <div className="h-10 shrink-0 sm:h-11" aria-hidden />

          <h1 className="mt-6 text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.035em] text-zinc-950 sm:mt-8 sm:text-5xl sm:leading-[1.03] lg:mt-9 lg:text-[3.65rem] lg:leading-[1.02]">
            <span className="block sm:inline">AI agents for </span>
            <span className="block bg-gradient-to-r from-amber-600 via-orange-600 to-teal-600 bg-clip-text text-transparent sm:inline">
              reviews, bookings, and leads.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-zinc-600 sm:text-lg lg:leading-relaxed">
            Faster replies, smarter scheduling, more booked time—
            <span className="font-medium text-zinc-800">without extra headcount.</span>
          </p>

          <ul className="mt-8 flex flex-col gap-2.5 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-3" aria-label="Core capabilities">
            {[
              { t: "On-brand review replies", c: "bg-amber-500" },
              { t: "Calendar-aware booking", c: "bg-teal-500" },
              { t: "Lead → appointment wins", c: "bg-violet-500" },
            ].map((row) => (
              <li
                key={row.t}
                className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-gradient-to-b from-white/45 to-white/20 py-2 pl-2 pr-4 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur-md ring-1 ring-white/25"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${row.c} shadow-sm`} aria-hidden />
                {row.t}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:flex-wrap sm:items-center">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(24,24,27,0.45)] ring-1 ring-white/10 transition hover:from-zinc-900 hover:to-black hover:shadow-[0_16px_44px_-12px_rgba(24,24,27,0.5)] sm:py-4"
              >
                Go to dashboard
                <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(24,24,27,0.45)] ring-1 ring-white/10 transition hover:from-zinc-900 hover:to-black hover:shadow-[0_16px_44px_-12px_rgba(24,24,27,0.5)] sm:py-4"
              >
                Start free trial
                <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            )}
            <a
              href="#playbook"
              className="inline-flex items-center justify-center rounded-full border border-white/55 bg-gradient-to-b from-white/60 to-white/30 px-8 py-3.5 text-sm font-semibold text-zinc-800 shadow-[0_8px_28px_-14px_rgba(24,24,27,0.12),inset_0_1px_0_0_rgba(255,255,255,0.75)] backdrop-blur-xl backdrop-saturate-150 transition hover:from-white/75 hover:to-white/45 sm:py-4"
            >
              See how it works
            </a>
          </div>

          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600" aria-hidden>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              No credit card required
            </span>
            <span className="hidden h-4 w-px bg-zinc-200 sm:block" aria-hidden />
            <span>Setup in about 15 minutes</span>
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none lg:pl-4">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-amber-200/20 via-transparent to-teal-200/20 blur-2xl lg:-inset-6" aria-hidden />

          <div className="relative lg:[perspective:1200px]">
            <div className="relative origin-top transition-[transform,box-shadow] duration-500 ease-out will-change-transform lg:[transform:rotateY(-6deg)_rotateX(3deg)] lg:shadow-[0_28px_64px_-28px_rgba(24,24,27,0.28)] lg:hover:[transform:rotateY(-3deg)_rotateX(1deg)_translateY(-6px)] lg:hover:shadow-[0_44px_88px_-36px_rgba(24,24,27,0.38)]">
              <div className="rounded-2xl border border-white/80 bg-gradient-to-b from-white to-zinc-50/80 p-1 shadow-[0_28px_64px_-28px_rgba(24,24,27,0.28)] ring-1 ring-zinc-200/50 lg:shadow-none">
                <div className="overflow-hidden rounded-[0.9rem] bg-white">
                  <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] ring-1 ring-black/[0.06]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] ring-1 ring-black/[0.06]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] ring-1 ring-black/[0.06]" />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-zinc-200/90 bg-zinc-50 px-3 py-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z" />
                      </svg>
                      <span className="truncate text-[11px] font-medium text-zinc-600">aiassistant.app/live</span>
                    </div>
                  </div>

                  <div
                    suppressHydrationWarning
                    className="relative bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 p-4 text-zinc-100 sm:p-5"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-10%,rgba(45,212,191,0.14),transparent),radial-gradient(ellipse_45%_45%_at_100%_100%,rgba(251,191,36,0.1),transparent)]"
                      aria-hidden
                    />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-300/95">Live feed</p>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                          Live
                        </span>
                      </div>

                      <div className="mt-3 space-y-2.5 text-sm">
                        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-white">New 5-star Google review</p>
                            <span className="shrink-0 rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
                              New
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                            &ldquo;Clear communication and easy scheduling—we&rsquo;re impressed.&rdquo;
                          </p>
                          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-teal-300">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" aria-hidden />
                            Draft ready in 16s
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.1] p-3.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">AI action</p>
                          <p className="mt-1.5 text-xs leading-snug text-emerald-100/95 sm:text-sm">Promo + booking CTA attached</p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3.5">
                          <p className="text-sm font-semibold text-white">Tonight</p>
                          <div className="mt-2 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between rounded-lg bg-black/35 px-2.5 py-2">
                              <span className="text-zinc-300">2:00 · Consult · 45 min</span>
                              <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                OK
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-black/35 px-2.5 py-2">
                              <span className="text-zinc-300">3:30 · Site visit</span>
                              <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
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
    </section>
  );
}

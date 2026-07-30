import Link from "next/link";

const WORK_ITEMS = [
  {
    label: "Review response",
    source: "Google · 5 stars",
    status: "Draft ready",
    tone: "success",
  },
  {
    label: "New appointment",
    source: "Website · Consultation",
    status: "Booked",
    tone: "primary",
  },
  {
    label: "Lead follow-up",
    source: "Missed call · High intent",
    status: "Assigned",
    tone: "warning",
  },
] as const;

export function LandingHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative mt-2 px-4 pb-14 pt-2 sm:mt-3 sm:px-6 sm:pb-18 sm:pt-3 lg:pb-22">
      <div className="landing-spotlight mx-auto max-w-7xl">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
        <div className="landing-spotlight-glow -left-36 -top-40 h-96 w-96" aria-hidden />
        <div className="landing-spotlight-glow -bottom-48 right-0 h-[30rem] w-[30rem]" aria-hidden />

        <div className="relative grid gap-12 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14 lg:px-14 lg:py-20 xl:px-18">
          <div className="landing-animate-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)] backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-40" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              AI operations for local businesses
            </div>

            <h1 className="mt-7 max-w-3xl text-[2.65rem] font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--color-text)] sm:text-6xl lg:text-[4rem] xl:text-[4.5rem]">
              Turn every customer message into the next action.
            </h1>
            <p className="landing-animate-up landing-animate-delay-1 mt-6 max-w-2xl text-base leading-7 text-[var(--color-text-muted)] sm:text-lg sm:leading-8">
              VyntRise handles reviews, appointment requests, and new leads from one intelligent workspace—so your team responds faster without adding another inbox.
            </p>

            <div className="landing-animate-up landing-animate-delay-2 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={isLoggedIn ? "/dashboard" : "/register"}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-primary-fg)] shadow-[0_12px_40px_-12px_color-mix(in_srgb,var(--color-primary)_45%,transparent)] transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-h)] motion-reduce:hover:translate-y-0"
              >
                {isLoggedIn ? "Open dashboard" : "Start 14-day trial"}
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
                </svg>
              </Link>
              <a
                href="#features"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-6 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface)]"
              >
                Explore the platform
              </a>
            </div>

            <div className="landing-animate-up landing-animate-delay-3 mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-[var(--color-text-muted)] sm:text-sm">
              {["No card required", "Setup in about 15 minutes", "Cancel anytime"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <svg className="size-4 text-[var(--color-success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                  </svg>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="landing-animate-in landing-animate-delay-2 relative mx-auto w-full max-w-xl">
            <div className="landing-spotlight-glow -inset-5 rounded-[2rem] opacity-70 blur-2xl" aria-hidden />
            <div className="landing-spotlight-panel relative overflow-hidden rounded-[1.6rem]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">Live operations</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">Today&rsquo;s customer activity</p>
                </div>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--color-success)_25%,var(--color-border))] bg-[var(--color-success-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-success)]">
                  All systems live
                </span>
              </div>

              <div className="grid grid-cols-3 border-b border-[var(--color-border)]">
                {[
                  ["12", "Conversations"],
                  ["4", "Bookings"],
                  ["2m", "Avg. response"],
                ].map(([value, label]) => (
                  <div key={label} className="border-r border-[var(--color-border)] px-3 py-4 text-center last:border-r-0 sm:px-4">
                    <p className="text-xl font-semibold tabular-nums text-[var(--color-text)] sm:text-2xl">{value}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-wide text-[var(--color-text-subtle)] sm:text-[10px]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 p-4 sm:p-5">
                {WORK_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3.5"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        item.tone === "success"
                          ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                          : item.tone === "warning"
                            ? "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
                            : "bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
                      }`}
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{item.label}</span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--color-text-subtle)]">{item.source}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 px-5 py-3 text-[11px] text-[var(--color-text-subtle)]">
                <span>Next sync in 30 seconds</span>
                <span className="font-medium text-[var(--color-text-muted)]">View workspace →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

const STEPS = [
  {
    step: "1",
    title: "Connect your channels",
    body: "Link review platforms, calendars, and booking systems in minutes.",
    badge: "vr-brand-gradient shadow-primary/25",
    border: "border-primary/25",
    hoverBorder: "hover:border-primary/35",
  },
  {
    step: "2",
    title: "Set brand guardrails",
    body: "Define tone, escalation paths, and booking thresholds by team or location.",
    badge: "bg-gradient-to-br from-[var(--color-grad-start)] to-[var(--color-grad-end)] shadow-primary/20",
    border: "border-sky-200/80",
    hoverBorder: "hover:border-sky-300/55",
  },
  {
    step: "3",
    title: "Let agents run ops",
    body: "Automate repetitive work so your team can focus on high-touch moments.",
    badge: "bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20",
    border: "border-violet-200/80",
    hoverBorder: "hover:border-violet-300/55",
  },
] as const;

export function LandingPlaybookSection({
  registerHref,
  isLoggedIn,
}: {
  registerHref: string;
  isLoggedIn: boolean;
}) {
  return (
    <section
      id="playbook"
      className="vr-landing-section relative w-full overflow-hidden border-t border-[var(--color-border)] py-16 sm:py-20 lg:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-12">
        <div>
          <div className="vr-landing-eyebrow">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Playbook
          </div>
          <h3 className="vr-landing-heading mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
            Launch in three steps
          </h3>
          <p className="vr-landing-muted mt-4 max-w-md text-sm leading-relaxed sm:text-base">
            Connect tools, set policies once, then let agents handle the repetitive work.
          </p>

          <div className="relative mt-10 sm:mt-12">
            <span
              className="absolute left-[1.15rem] top-8 bottom-8 hidden w-px bg-gradient-to-b from-primary/40 via-[var(--color-grad-start)]/35 to-violet-500/40 sm:block"
              aria-hidden
            />
            <ol className="relative space-y-4">
              {STEPS.map((row) => (
                <li
                  key={row.step}
                  className={`group relative flex gap-4 rounded-2xl border bg-gradient-to-b from-[var(--color-bg)] to-[var(--color-surface)] p-5 shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] motion-reduce:hover:translate-y-0 sm:gap-5 sm:p-6 ${row.border} ${row.hoverBorder}`}
                >
                  <span
                    className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md ring-2 ring-white/90 ${row.badge}`}
                  >
                    {row.step}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-semibold text-[var(--color-text)]">{row.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">{row.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="relative lg:sticky lg:top-28">
          <div
            className="pointer-events-none absolute -inset-px rounded-[1.85rem] bg-gradient-to-br from-primary/15 via-transparent to-[var(--color-grad-start)]/15 opacity-70 blur-xl"
            aria-hidden
          />
          <div className="relative flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg)]/95 to-[var(--color-surface)] p-7 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:p-8">
            <div className="landing-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-[var(--color-primary-soft)] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Executive snapshot
              </div>
              <h3 className="vr-landing-heading mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                Visibility that drives revenue
              </h3>
              <p className="vr-landing-muted mt-4 text-sm leading-relaxed sm:text-[0.9375rem]">
                Track response speed, booking quality, and lead conversion in one dashboard for operators and
                multi-location owners.
              </p>
            </div>

            <div className="relative mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 transition hover:border-sky-300/50 hover:shadow-sm">
                <span
                  className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-[var(--color-grad-start)] to-[var(--color-grad-end)] opacity-90"
                  aria-hidden
                />
                <p className="pl-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  Avg. response
                </p>
                <p className="mt-1.5 pl-2 text-xl font-semibold tabular-nums text-[var(--color-text)] sm:text-2xl">
                  {"<"} 3 min
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 transition hover:border-primary/35 hover:shadow-sm">
                <span
                  className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary-h)] opacity-90"
                  aria-hidden
                />
                <p className="pl-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  Booking uplift
                </p>
                <p className="mt-1.5 pl-2 text-xl font-semibold tabular-nums text-[var(--color-text)] sm:text-2xl">
                  +12%
                </p>
              </div>
            </div>

            <Link
              href={registerHref}
              className="vr-landing-btn-primary relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold"
            >
              {isLoggedIn ? "Open dashboard" : "Get started in 5 minutes"}
              <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

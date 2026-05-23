import Link from "next/link";

const INTEGRATION_ACCENTS = [
  {
    glow: "from-primary/30 via-indigo-300/15 to-transparent",
    icon: "from-indigo-50 to-indigo-100/90 text-[var(--color-primary-h)] border-primary/20 shadow-primary/10",
    hoverBorder: "hover:border-primary/35",
  },
  {
    glow: "from-sky-400/25 via-cyan-300/12 to-transparent",
    icon: "from-sky-50 to-cyan-50 text-sky-800 border-sky-200/80 shadow-sky-500/10",
    hoverBorder: "hover:border-sky-300/50",
  },
  {
    glow: "from-violet-400/22 via-purple-300/10 to-transparent",
    icon: "from-violet-50 to-purple-50 text-violet-800 border-violet-200/80 shadow-violet-500/10",
    hoverBorder: "hover:border-violet-300/50",
  },
] as const;

export function LandingIntegrationsSection({
  integrations,
  registerHref,
  isLoggedIn,
}: {
  integrations: readonly string[];
  registerHref: string;
  isLoggedIn: boolean;
}) {
  return (
    <section
      id="integrations"
      className="vr-landing-section relative w-full overflow-hidden border-t border-[var(--color-border)] px-4 py-14 sm:px-6 sm:py-16"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-8 overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg)]/95 to-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] backdrop-blur-md sm:flex-row sm:items-end sm:justify-between sm:gap-10 sm:p-10">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-grad-start)_18%,transparent),transparent)] opacity-70 blur-3xl"
            aria-hidden
          />
          <div className="relative max-w-xl">
            <div className="vr-landing-eyebrow">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Integrations
            </div>
            <h3 className="vr-landing-heading mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Plug into your stack
            </h3>
            <p className="vr-landing-muted mt-3 text-sm leading-relaxed sm:text-base">
              Use your existing tools. No rip-and-replace.
            </p>
          </div>
          <Link
            href={registerHref}
            className="vr-landing-btn-primary relative inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold sm:w-auto"
          >
            {isLoggedIn ? "Open dashboard" : "Connect now"}
            <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        <div className="relative mt-6 grid gap-4 sm:mt-7 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {integrations.map((item, i) => {
            const a = INTEGRATION_ACCENTS[i % INTEGRATION_ACCENTS.length];
            return (
              <div
                key={item}
                className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] to-[var(--color-surface)] px-5 py-4 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] motion-reduce:hover:translate-y-0 sm:px-6 sm:py-5 ${a.hoverBorder}`}
              >
                <div
                  className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${a.glow} opacity-0 blur-2xl transition duration-500 group-hover:opacity-100`}
                  aria-hidden
                />
                <span
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br ${a.icon}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="relative text-sm font-semibold text-[var(--color-text)]">{item}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

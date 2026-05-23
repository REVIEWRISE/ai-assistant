import { LANDING_FEATURES } from "@/components/landing/landing-features-data";

const FEATURE_ACCENTS = [
  {
    glow: "from-primary/25 via-indigo-300/15 to-transparent",
    dock: "from-primary/[0.12] via-indigo-400/[0.08] to-primary/[0.06]",
    iconWrap: "from-indigo-50 to-indigo-100/90 text-[var(--color-primary-h)] border-primary/20 shadow-primary/10",
    check: "border-primary/25 bg-primary/15 text-[var(--color-primary-h)]",
    hoverBorder: "hover:border-primary/35",
  },
  {
    glow: "from-sky-400/25 via-cyan-300/15 to-transparent",
    dock: "from-sky-500/[0.12] via-cyan-400/[0.08] to-sky-600/[0.06]",
    iconWrap: "from-sky-50 to-cyan-50 text-sky-800 border-sky-200/80 shadow-sky-500/10",
    check: "border-sky-300/50 bg-sky-500/15 text-sky-800",
    hoverBorder: "hover:border-sky-300/50",
  },
  {
    glow: "from-violet-400/20 via-purple-300/12 to-transparent",
    dock: "from-violet-500/[0.12] via-purple-400/[0.08] to-violet-600/[0.06]",
    iconWrap: "from-violet-50 to-purple-50 text-violet-800 border-violet-200/80 shadow-violet-500/10",
    check: "border-violet-300/50 bg-violet-500/15 text-violet-800",
    hoverBorder: "hover:border-violet-300/50",
  },
] as const;

export function LandingFeaturesSection() {
  return (
    <section
      id="features"
      className="vr-landing-section relative w-full overflow-hidden border-t border-[var(--color-border)] py-14 sm:py-16 lg:py-20"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="vr-landing-eyebrow">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zM14 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V6zM4 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2zM14 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z" />
            </svg>
            Core agents
          </div>
          <h2 className="vr-landing-heading mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need for customer-facing operations
          </h2>
          <p className="vr-landing-muted mt-3 text-base leading-relaxed sm:text-lg">
            Less manual work. Faster, on-brand responses.
          </p>
        </div>

        <div className="relative mt-10 grid auto-rows-fr grid-cols-1 gap-5 sm:mt-12 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((item, i) => {
            const a = FEATURE_ACCENTS[i % FEATURE_ACCENTS.length];
            return (
              <div
                key={item.title}
                className={`group relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg)]/90 to-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] backdrop-blur-md transition-[box-shadow,transform,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform hover:-translate-y-[5px] hover:shadow-[var(--shadow-lg)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-7 ${a.hoverBorder} ${item.className}`}
              >
                <div
                  className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${a.glow} opacity-60 blur-2xl transition-[opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:opacity-100 group-hover:blur-3xl`}
                  aria-hidden
                />
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      {item.label}
                    </span>
                    <span className="font-mono text-[11px] font-medium tabular-nums text-[var(--color-text-subtle)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-1 flex-col sm:mt-6">
                    <div className="flex justify-center">
                      <div
                        className={`relative flex aspect-[5/4] w-full max-w-[8.75rem] items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br shadow-inner transition-[box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:group-hover:translate-y-0 sm:max-w-[9.25rem] ${a.dock}`}
                      >
                        <div
                          className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:12px_12px]"
                          aria-hidden
                        />
                        <div
                          className={`relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-xl border bg-gradient-to-br shadow-lg transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:scale-[1.06] motion-reduce:group-hover:scale-100 sm:h-16 sm:w-16 sm:rounded-2xl ${a.iconWrap}`}
                        >
                          <span className="scale-[1.25] sm:scale-[1.35] [&_svg]:stroke-[1.6]">{item.icon}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 min-w-0 flex-1 sm:mt-6">
                      <h3 className="text-lg font-semibold leading-snug tracking-tight text-[var(--color-text)] lg:text-xl">
                        {item.title}
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-text-muted)]">{item.desc}</p>
                      <ul className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-5">
                        {item.highlights.map((line, hi) => (
                          <li
                            key={`${item.title}-${hi}`}
                            className="flex items-start gap-2.5 text-xs text-[var(--color-text)] sm:text-sm"
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border sm:h-5 sm:w-5 ${a.check}`}
                              aria-hidden
                            >
                              <svg
                                className="h-2 w-2 sm:h-2.5 sm:w-2.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                              </svg>
                            </span>
                            <span className="leading-snug text-[var(--color-text-muted)]">{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

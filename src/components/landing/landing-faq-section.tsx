type FaqItem = { readonly q: string; readonly paragraphs: readonly string[] };

const FAQ_ACCENTS = [
  {
    glow: "from-primary/25 via-indigo-300/15 to-transparent",
    dock: "from-primary/[0.12] via-indigo-400/[0.08] to-primary/[0.06]",
    iconWrap: "from-indigo-50 to-indigo-100/90 text-[var(--color-primary-h)] ring-indigo-200/80 shadow-primary/10",
    labelBorder: "border-primary/20",
    openBorder: "open:border-primary/45",
  },
  {
    glow: "from-sky-400/25 via-cyan-300/15 to-transparent",
    dock: "from-sky-500/[0.12] via-cyan-400/[0.08] to-sky-600/[0.06]",
    iconWrap: "from-sky-50 to-cyan-50 text-sky-800 ring-sky-200/80 shadow-sky-500/10",
    labelBorder: "border-sky-200/80",
    openBorder: "open:border-sky-300/60",
  },
  {
    glow: "from-violet-400/20 via-purple-300/12 to-transparent",
    dock: "from-violet-500/[0.12] via-purple-400/[0.08] to-violet-600/[0.06]",
    iconWrap: "from-violet-50 to-purple-50 text-violet-800 ring-violet-200/80 shadow-violet-500/10",
    labelBorder: "border-violet-200/80",
    openBorder: "open:border-violet-300/60",
  },
] as const;

export function LandingFaqSection({ faq }: { faq: readonly FaqItem[] }) {
  return (
    <section
      id="faq"
      className="vr-landing-section relative w-full overflow-hidden border-t border-[var(--color-border)] pt-6 pb-12 sm:pt-8 sm:pb-16 lg:pt-10 lg:pb-20"
      aria-labelledby="faq-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto max-w-2xl text-center">
          <div className="vr-landing-eyebrow">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            FAQ
          </div>
          <h2 id="faq-heading" className="vr-landing-heading mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
          <p className="vr-landing-muted mt-3 text-base leading-relaxed sm:text-lg">Before you connect your stack.</p>
          </div>

          <div className="mt-10 space-y-4 sm:mt-12 sm:space-y-5">
          {faq.map((item, i) => {
            const a = FAQ_ACCENTS[i % FAQ_ACCENTS.length];
            return (
              <details
                key={item.q}
                className={`group relative overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg)]/95 to-[var(--color-surface)] shadow-[var(--shadow-md)] backdrop-blur-md transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[var(--color-border-hover)] hover:shadow-[var(--shadow-lg)] open:shadow-[var(--shadow-lg)] motion-reduce:hover:translate-y-0 ${a.openBorder}`}
              >
                <div
                  className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${a.glow} opacity-60 blur-2xl transition duration-500 group-hover:opacity-100 group-open:opacity-100 group-hover:blur-3xl group-open:blur-3xl`}
                  aria-hidden
                />
                <summary className="relative cursor-pointer list-none px-5 py-5 marker:content-none sm:px-7 sm:py-7 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start gap-3 sm:gap-6">
                    <span className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`rounded-full border bg-[var(--color-surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)] backdrop-blur-sm ${a.labelBorder}`}
                        >
                          Question
                        </span>
                      </span>
                      <span className="mt-3 block text-left text-base font-semibold leading-snug tracking-tight text-[var(--color-text)] sm:text-xl">
                        {item.q}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-3 pt-0.5 sm:gap-4 sm:pt-1">
                      <span className="hidden font-mono text-[11px] font-medium tabular-nums text-[var(--color-text-subtle)] sm:block">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm sm:hidden ${a.labelBorder}`}
                      >
                        <svg
                          className="h-5 w-5 text-[var(--color-text-muted)] transition duration-300 group-open:rotate-180"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                      <span
                        className={`relative hidden aspect-[5/4] w-[4.5rem] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-inner ring-1 ring-[var(--color-border-muted)] sm:flex sm:w-[5rem] ${a.dock}`}
                      >
                        <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
                        <span
                          className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg ring-2 ring-white/70 ${a.iconWrap}`}
                        >
                          <svg
                            className="h-5 w-5 transition duration-300 group-open:rotate-180"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                          </svg>
                        </span>
                      </span>
                    </span>
                  </span>
                </summary>
                <div className="relative border-t border-[var(--color-border)] px-5 pb-5 pt-0 sm:px-7 sm:pb-7">
                  <div className="space-y-3 pt-4 sm:space-y-3.5">
                    {item.paragraphs.map((paragraph, pi) => (
                      <p
                        key={pi}
                        className="text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-[0.9375rem] sm:leading-relaxed"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </details>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}

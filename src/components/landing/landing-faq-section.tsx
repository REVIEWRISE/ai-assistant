type FaqItem = { readonly q: string; readonly paragraphs: readonly string[] };

export function LandingFaqSection({ faq }: { faq: readonly FaqItem[] }) {
  return (
    <section
      id="faq"
      className="relative mx-auto w-full max-w-6xl overflow-hidden bg-[#faf8f5] px-4 pt-6 pb-12 sm:px-6 sm:pt-8 sm:pb-16 lg:pt-10 lg:pb-20"
      aria-labelledby="faq-heading"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-[min(100%,42rem)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.12),transparent_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white/70 to-white/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-900/85 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] backdrop-blur-md ring-1 ring-white/50">
            <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            FAQ
          </div>
          <h2 id="faq-heading" className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Questions, answered
          </h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-600 sm:text-lg">Before you connect your stack.</p>
        </div>

        <div className="mt-10 space-y-4 sm:mt-12 sm:space-y-5">
          {faq.map((item, i) => {
            const accents = [
              {
                glow: "from-amber-400/25 via-orange-300/15 to-transparent",
                dock: "from-amber-500/[0.12] via-orange-400/[0.08] to-amber-600/[0.06]",
                iconWrap: "from-amber-100 to-orange-50 text-amber-900 ring-amber-200/90 shadow-amber-500/10",
                label: "ring-amber-200/60",
                openRing: "open:ring-amber-200/90",
              },
              {
                glow: "from-teal-400/25 via-emerald-300/15 to-transparent",
                dock: "from-teal-500/[0.12] via-emerald-400/[0.08] to-teal-600/[0.06]",
                iconWrap: "from-teal-50 to-emerald-50 text-teal-800 ring-teal-200/90 shadow-teal-500/10",
                label: "ring-teal-200/60",
                openRing: "open:ring-teal-200/90",
              },
              {
                glow: "from-violet-400/20 via-purple-300/12 to-transparent",
                dock: "from-violet-500/[0.12] via-purple-400/[0.08] to-violet-600/[0.06]",
                iconWrap: "from-violet-50 to-purple-50 text-violet-900 ring-violet-200/90 shadow-violet-500/10",
                label: "ring-violet-200/60",
                openRing: "open:ring-violet-200/90",
              },
            ] as const;
            const a = accents[i % accents.length];
            return (
              <details
                key={item.q}
                className={`group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/95 via-white/75 to-white/55 shadow-[0_12px_40px_-20px_rgba(24,24,27,0.1),0_4px_16px_-8px_rgba(24,24,27,0.05),inset_0_1px_0_0_rgba(255,255,255,1)] ring-1 ring-zinc-200/70 backdrop-blur-md transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_-24px_rgba(24,24,27,0.12),0_8px_24px_-12px_rgba(24,24,27,0.06)] open:shadow-[0_20px_48px_-24px_rgba(24,24,27,0.12),0_8px_24px_-12px_rgba(24,24,27,0.06)] motion-reduce:hover:translate-y-0 ${a.openRing}`}
              >
                <div
                  className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${a.glow} opacity-60 blur-2xl transition duration-500 group-hover:opacity-100 group-open:opacity-100 group-hover:blur-3xl group-open:blur-3xl`}
                  aria-hidden
                />
                <summary className="relative cursor-pointer list-none px-6 py-6 marker:content-none sm:px-7 sm:py-7 [&::-webkit-details-marker]:hidden">
                  <span className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <span className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`rounded-full bg-gradient-to-b from-white/90 to-white/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 ring-1 backdrop-blur-sm ${a.label}`}
                        >
                          Question
                        </span>
                      </span>
                      <span className="mt-3 block text-left text-lg font-semibold leading-snug tracking-tight text-zinc-900 sm:text-xl">
                        {item.q}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start sm:pt-1">
                      <span className="font-mono text-[11px] font-medium tabular-nums text-zinc-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`relative flex aspect-[5/4] w-[4.5rem] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-inner ring-1 ring-white/80 sm:w-[5rem] ${a.dock}`}
                      >
                        <div
                          className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:12px_12px]"
                          aria-hidden
                        />
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
                <div className="relative border-t border-zinc-200/70 px-6 pb-6 pt-0 sm:px-7 sm:pb-7">
                  <div className="space-y-3 pt-4 sm:space-y-3.5">
                    {item.paragraphs.map((paragraph, pi) => (
                      <p key={pi} className="text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem] sm:leading-relaxed">
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
    </section>
  );
}

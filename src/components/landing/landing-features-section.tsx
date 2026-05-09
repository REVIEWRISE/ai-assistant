import { LANDING_FEATURES } from "@/components/landing/landing-features-data";

export function LandingFeaturesSection() {
  return (
    <section id="features" className="relative mx-auto w-full max-w-6xl bg-[#faf8f5] px-4 pb-14 pt-5 sm:px-6 sm:pb-20 sm:pt-6">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-[min(100%,42rem)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.12),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white/70 to-white/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-900/85 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] backdrop-blur-md ring-1 ring-white/50">
          <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zM14 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V6zM4 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2zM14 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z" />
          </svg>
          Core agents
        </div>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Everything you need for customer-facing operations
        </h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-600 sm:text-lg">Less manual work. Faster, on-brand responses.</p>
      </div>
      <div className="relative mt-10 grid auto-rows-fr grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 sm:mt-12">
        {LANDING_FEATURES.map((item, i) => {
          const accents = [
            {
              glow: "from-amber-400/25 via-orange-300/15 to-transparent",
              dock: "from-amber-500/[0.12] via-orange-400/[0.08] to-amber-600/[0.06]",
              iconWrap: "from-amber-100 to-orange-50 text-amber-900 ring-amber-200/90 shadow-amber-500/10",
              check: "bg-amber-500/15 text-amber-700 ring-amber-500/20",
            },
            {
              glow: "from-teal-400/25 via-emerald-300/15 to-transparent",
              dock: "from-teal-500/[0.12] via-emerald-400/[0.08] to-teal-600/[0.06]",
              iconWrap: "from-teal-50 to-emerald-50 text-teal-800 ring-teal-200/90 shadow-teal-500/10",
              check: "bg-teal-500/15 text-teal-700 ring-teal-500/20",
            },
            {
              glow: "from-violet-400/20 via-purple-300/12 to-transparent",
              dock: "from-violet-500/[0.12] via-purple-400/[0.08] to-violet-600/[0.06]",
              iconWrap: "from-violet-50 to-purple-50 text-violet-900 ring-violet-200/90 shadow-violet-500/10",
              check: "bg-violet-500/15 text-violet-700 ring-violet-500/20",
            },
          ] as const;
          const a = accents[i % accents.length];
          return (
            <div
              key={item.title}
              className={`group relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/95 via-white/75 to-white/55 p-6 shadow-[0_12px_40px_-20px_rgba(24,24,27,0.1),0_4px_16px_-8px_rgba(24,24,27,0.05),inset_0_1px_0_0_rgba(255,255,255,1)] backdrop-blur-md transition-[box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform hover:-translate-y-[5px] hover:shadow-[0_24px_56px_-28px_rgba(24,24,27,0.14),0_12px_32px_-16px_rgba(24,24,27,0.07)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-7 ${item.className}`}
            >
              <div
                className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${a.glow} opacity-60 blur-2xl transition-[opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:opacity-100 group-hover:blur-3xl`}
                aria-hidden
              />
              <div className="relative flex min-h-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-gradient-to-b from-white/90 to-white/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 ring-1 ring-zinc-200/60 backdrop-blur-sm">
                    {item.label}
                  </span>
                  <span className="font-mono text-[11px] font-medium tabular-nums text-zinc-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="mt-5 flex flex-1 flex-col sm:mt-6">
                  <div className="flex justify-center">
                    <div
                      className={`relative flex aspect-[5/4] w-full max-w-[8.75rem] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-inner ring-1 ring-white/80 transition-[box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:group-hover:translate-y-0 sm:max-w-[9.25rem] ${a.dock}`}
                    >
                      <div
                        className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:12px_12px]"
                        aria-hidden
                      />
                      <div
                        className={`relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-xl bg-gradient-to-br shadow-lg ring-2 ring-white/70 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:scale-[1.06] motion-reduce:group-hover:scale-100 sm:h-16 sm:w-16 sm:rounded-2xl ${a.iconWrap}`}
                      >
                        <span className="scale-[1.25] sm:scale-[1.35] [&_svg]:stroke-[1.6]">{item.icon}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 min-w-0 flex-1 sm:mt-6">
                    <h3 className="text-lg font-semibold leading-snug tracking-tight text-zinc-900 lg:text-xl">{item.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">{item.desc}</p>
                    <ul className="mt-5 space-y-2 border-t border-zinc-200/70 pt-5">
                      {item.highlights.map((line, hi) => (
                        <li key={`${item.title}-${hi}`} className="flex items-start gap-2.5 text-xs text-zinc-700 sm:text-sm">
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 sm:h-5 sm:w-5 ${a.check}`}
                            aria-hidden
                          >
                            <svg className="h-2 w-2 sm:h-2.5 sm:w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                            </svg>
                          </span>
                          <span className="leading-snug">{line}</span>
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
    </section>
  );
}

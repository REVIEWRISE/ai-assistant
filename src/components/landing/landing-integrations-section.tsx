import Link from "next/link";

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
    <section id="integrations" className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 py-14 sm:px-6 sm:py-16">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[min(140%,48rem)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.14),transparent_65%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(24,24,27,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.04)_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden
      />

      <div className="relative flex flex-col gap-8 overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/95 via-white/80 to-white/65 p-8 shadow-[0_12px_48px_-28px_rgba(24,24,27,0.12),0_4px_20px_-12px_rgba(24,24,27,0.06),inset_0_1px_0_0_rgba(255,255,255,1)] ring-1 ring-zinc-200/60 backdrop-blur-md sm:flex-row sm:items-end sm:justify-between sm:gap-10 sm:p-10">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-teal-400/20 via-emerald-300/10 to-transparent opacity-70 blur-3xl"
          aria-hidden
        />
        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-gradient-to-b from-white/80 to-white/45 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-900/85 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] backdrop-blur-md ring-1 ring-amber-200/40">
            <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Integrations
          </div>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Plug into your stack</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">Use your existing tools—no rip-and-replace.</p>
        </div>
        <Link
          href={registerHref}
          className="relative inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-800 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 ring-1 ring-zinc-950/10 transition hover:from-zinc-800 hover:to-zinc-700"
        >
          {isLoggedIn ? "Open dashboard" : "Connect now"}
          <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      <div className="relative mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 sm:mt-7">
        {integrations.map((item, i) => {
          const accents = [
            {
              glow: "from-amber-400/30 via-orange-300/15 to-transparent",
              icon: "from-amber-100 to-orange-50 text-amber-900 ring-amber-200/80 shadow-amber-500/10",
              hoverRing: "hover:ring-amber-300/50 hover:shadow-[0_0_0_1px_rgba(251,191,36,0.2)]",
            },
            {
              glow: "from-teal-400/25 via-emerald-300/12 to-transparent",
              icon: "from-teal-50 to-emerald-50 text-teal-800 ring-teal-200/80 shadow-teal-500/10",
              hoverRing: "hover:ring-teal-300/45 hover:shadow-[0_0_0_1px_rgba(45,212,191,0.18)]",
            },
            {
              glow: "from-violet-400/22 via-purple-300/10 to-transparent",
              icon: "from-violet-50 to-purple-50 text-violet-900 ring-violet-200/80 shadow-violet-500/10",
              hoverRing: "hover:ring-violet-300/45 hover:shadow-[0_0_0_1px_rgba(167,139,250,0.2)]",
            },
          ] as const;
          const a = accents[i % accents.length];
          return (
            <div
              key={item}
              className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-b from-white/90 to-white/60 px-5 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_8px_28px_-20px_rgba(24,24,27,0.08)] ring-1 ring-zinc-200/70 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgba(24,24,27,0.1)] motion-reduce:hover:translate-y-0 sm:px-6 sm:py-5 ${a.hoverRing}`}
            >
              <div
                className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${a.glow} opacity-0 blur-2xl transition duration-500 group-hover:opacity-100`}
                aria-hidden
              />
              <span
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${a.icon}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="relative text-sm font-semibold text-zinc-800">{item}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

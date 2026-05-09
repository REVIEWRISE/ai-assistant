import Link from "next/link";

export function LandingPlaybookSection({
  registerHref,
  isLoggedIn,
}: {
  registerHref: string;
  isLoggedIn: boolean;
}) {
  return (
    <section id="playbook" className="relative overflow-hidden bg-zinc-950 py-16 text-zinc-100 sm:py-20 lg:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,rgba(251,191,36,0.16),transparent_55%),radial-gradient(ellipse_50%_45%_at_100%_80%,rgba(20,184,166,0.12),transparent),radial-gradient(ellipse_40%_35%_at_0%_60%,rgba(167,139,250,0.08),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-gradient-to-b from-white/12 to-white/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-md">
            <svg className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Playbook
          </div>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
            Launch in three steps
          </h3>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
            Connect tools, set policies once, then let agents handle the repetitive work.
          </p>

          <div className="relative mt-10 sm:mt-12">
            <span
              className="absolute left-[1.15rem] top-8 bottom-8 hidden w-px bg-gradient-to-b from-amber-500/40 via-teal-500/35 to-violet-500/40 sm:block"
              aria-hidden
            />
            <ol className="relative space-y-4">
              {[
                {
                  step: "1",
                  title: "Connect your channels",
                  body: "Link review platforms, calendars, and booking systems in minutes.",
                  badge: "from-amber-500 to-orange-600 shadow-amber-500/30 ring-amber-400/40",
                  card: "hover:shadow-[0_0_0_1px_rgba(251,191,36,0.15)]",
                },
                {
                  step: "2",
                  title: "Set brand guardrails",
                  body: "Define tone, escalation paths, and booking thresholds by team or location.",
                  badge: "from-teal-500 to-emerald-600 shadow-teal-500/30 ring-teal-400/40",
                  card: "hover:shadow-[0_0_0_1px_rgba(45,212,191,0.15)]",
                },
                {
                  step: "3",
                  title: "Let agents run ops",
                  body: "Automate repetitive work so your team can focus on high-touch moments.",
                  badge: "from-violet-500 to-purple-600 shadow-violet-500/30 ring-violet-400/40",
                  card: "hover:shadow-[0_0_0_1px_rgba(167,139,250,0.15)]",
                },
              ].map((row) => (
                <li
                  key={row.step}
                  className={`group relative flex gap-4 rounded-2xl bg-gradient-to-b from-white/[0.09] to-white/[0.03] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-white/10 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.11] motion-reduce:hover:translate-y-0 sm:gap-5 sm:p-6 ${row.card}`}
                >
                  <span
                    className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-lg ring-2 ring-black/20 ${row.badge}`}
                  >
                    {row.step}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-semibold text-white">{row.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{row.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="relative lg:sticky lg:top-28">
          <div
            className="pointer-events-none absolute -inset-px rounded-[1.85rem] bg-gradient-to-br from-amber-500/20 via-transparent to-teal-500/20 opacity-60 blur-xl"
            aria-hidden
          />
          <div className="relative flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/[0.14] via-white/[0.07] to-white/[0.03] p-7 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.12)] ring-1 ring-white/15 backdrop-blur-xl sm:p-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.2] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px]"
              aria-hidden
            />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-500/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200/95">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-50" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
                </span>
                Executive snapshot
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Visibility that drives revenue
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-[0.9375rem]">
                Track response speed, booking quality, and lead conversion in one dashboard—for operators and multi-location
                owners.
              </p>
            </div>

            <div className="relative mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="group relative overflow-hidden rounded-2xl bg-black/40 px-5 py-4 ring-1 ring-white/10 transition hover:ring-teal-400/25">
                <span className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-teal-400 to-teal-600 opacity-80" aria-hidden />
                <p className="pl-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Avg. response</p>
                <p className="mt-1.5 pl-2 text-xl font-semibold tabular-nums text-white sm:text-2xl">{"<"} 3 min</p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl bg-black/40 px-5 py-4 ring-1 ring-white/10 transition hover:ring-amber-400/25">
                <span className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-amber-400 to-orange-500 opacity-80" aria-hidden />
                <p className="pl-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Booking uplift</p>
                <p className="mt-1.5 pl-2 text-xl font-semibold tabular-nums text-white sm:text-2xl">+12%</p>
              </div>
            </div>

            <Link
              href={registerHref}
              className="relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-white to-zinc-100 px-5 py-4 text-sm font-semibold text-zinc-900 shadow-lg shadow-black/25 ring-1 ring-white/50 transition hover:from-zinc-50 hover:to-zinc-200"
            >
              {isLoggedIn ? "Open dashboard" : "Get started in 5 minutes"}
              <svg className="h-4 w-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

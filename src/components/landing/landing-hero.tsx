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
    <section className="relative px-4 pb-14 pt-4 sm:px-6 sm:pb-18 lg:pb-22">
      <div className="landing-dark relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#080d18_0%,#10172a_48%,#1b2450_100%)] shadow-[0_30px_90px_-42px_rgba(15,23,42,0.8)]">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden />
        <div className="pointer-events-none absolute -left-36 -top-40 h-96 w-96 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-48 right-0 h-[30rem] w-[30rem] rounded-full bg-sky-400/15 blur-3xl" aria-hidden />

        <div className="relative grid gap-12 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14 lg:px-14 lg:py-20 xl:px-18">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-200 backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              AI operations for local businesses
            </div>

            <h1 className="mt-7 max-w-3xl text-[2.65rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4rem] xl:text-[4.5rem]">
              Turn every customer message into the next action.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              VyntRise handles reviews, appointment requests, and new leads from one intelligent workspace—so your team responds faster without adding another inbox.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={isLoggedIn ? "/dashboard" : "/register"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-indigo-50 motion-reduce:hover:translate-y-0">
                {isLoggedIn ? "Open dashboard" : "Start 14-day trial"}
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
                </svg>
              </Link>
              <a href="#features" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-6 text-sm font-semibold text-white transition hover:bg-white/[0.09]">
                Explore the platform
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-300 sm:text-sm">
              {["No card required", "Setup in about 15 minutes", "Cancel anytime"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <svg className="size-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                  </svg>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-indigo-500/25 via-transparent to-sky-400/15 blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[1.6rem] border border-white/15 bg-slate-950/60 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Live operations</p>
                  <p className="mt-1 text-sm font-semibold text-white">Today&rsquo;s customer activity</p>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">All systems live</span>
              </div>

              <div className="grid grid-cols-3 border-b border-white/10">
                {[
                  ["12", "Conversations"],
                  ["4", "Bookings"],
                  ["2m", "Avg. response"],
                ].map(([value, label]) => (
                  <div key={label} className="border-r border-white/10 px-3 py-4 text-center last:border-r-0 sm:px-4">
                    <p className="text-xl font-semibold tabular-nums text-white sm:text-2xl">{value}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-400 sm:text-[10px]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 p-4 sm:p-5">
                {WORK_ITEMS.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-3.5">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${item.tone === "success" ? "bg-emerald-400/12 text-emerald-300" : item.tone === "warning" ? "bg-amber-400/12 text-amber-300" : "bg-indigo-400/15 text-indigo-300"}`}>
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{item.label}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">{item.source}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-slate-200">{item.status}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-5 py-3 text-[11px] text-slate-400">
                <span>Next sync in 30 seconds</span>
                <span className="font-medium text-indigo-300">View workspace →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

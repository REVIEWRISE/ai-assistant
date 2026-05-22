import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/lib/brand";

export function LandingContactSection() {
  return (
    <section id="contact" className="relative overflow-hidden bg-zinc-950 py-16 text-zinc-100 sm:py-20 lg:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,rgba(251,191,36,0.14),transparent_55%),radial-gradient(ellipse_50%_45%_at_100%_85%,rgba(20,184,166,0.1),transparent),radial-gradient(ellipse_40%_35%_at_0%_55%,rgba(167,139,250,0.07),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/[0.12] via-white/[0.06] to-white/[0.03] p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.1)] ring-1 ring-white/15 backdrop-blur-xl sm:p-10 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:p-14">
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-gradient-to-br from-amber-500/20 via-orange-400/10 to-transparent opacity-70 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-teal-500/15 to-transparent opacity-50 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.15] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px]"
            aria-hidden
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-gradient-to-b from-white/12 to-white/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-md">
              <svg className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact
            </div>
            <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Let&rsquo;s talk about your operation
            </h3>
            <p className="mt-3 text-base leading-relaxed text-zinc-400 sm:text-lg">
              Tell us your stack and goals—we&rsquo;ll reply with a rollout plan within one business day.
            </p>
            <div className="mt-10 space-y-3 sm:space-y-4">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group flex items-center gap-4 rounded-2xl bg-gradient-to-b from-white/[0.1] to-white/[0.04] px-4 py-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12] hover:ring-amber-400/25 motion-reduce:hover:translate-y-0 sm:px-5 sm:py-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m3 8 7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"
                    />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Email</span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-white">{CONTACT_EMAIL}</span>
                </span>
              </a>
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="group flex items-center gap-4 rounded-2xl bg-gradient-to-b from-white/[0.1] to-white/[0.04] px-4 py-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12] hover:ring-teal-400/25 motion-reduce:hover:translate-y-0 sm:px-5 sm:py-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20 ring-1 ring-white/20">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                    />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Phone</span>
                  <span className="mt-0.5 block text-sm font-semibold text-white">{CONTACT_PHONE}</span>
                </span>
              </a>
              <div className="flex items-center gap-4 rounded-2xl border border-dashed border-white/20 bg-black/25 px-4 py-3.5 sm:px-5 sm:py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-zinc-200 ring-1 ring-white/15">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-zinc-400">Mon–Fri · 9am–6pm</span>
              </div>
            </div>
          </div>

          <div className="relative mt-10 lg:mt-0">
            <div
              className="pointer-events-none absolute -inset-px rounded-[1.85rem] bg-gradient-to-br from-white/30 via-teal-400/20 to-amber-400/25 opacity-70 blur-xl"
              aria-hidden
            />
            <form className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white to-zinc-50/90 p-6 text-zinc-900 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,1)] ring-1 ring-white/50 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[linear-gradient(rgba(24,24,27,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.04)_1px,transparent_1px)] bg-[size:20px_20px]"
                aria-hidden
              />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Send a message</p>
                <p className="mt-1 text-sm text-zinc-600">We reply within one business day.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-zinc-800">
                    First name
                    <input
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      placeholder="Amelia"
                      className="mt-2 w-full rounded-xl border border-zinc-200/90 bg-[#faf8f5]/90 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200/50"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-zinc-800">
                    Last name
                    <input
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      placeholder="Lewis"
                      className="mt-2 w-full rounded-xl border border-zinc-200/90 bg-[#faf8f5]/90 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200/50"
                    />
                  </label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-zinc-800">
                  Work email
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="mt-2 w-full rounded-xl border border-zinc-200/90 bg-[#faf8f5]/90 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200/50"
                  />
                </label>
                <label className="mt-4 block text-sm font-semibold text-zinc-800">
                  Company name
                  <input
                    type="text"
                    name="company"
                    autoComplete="organization"
                    placeholder="Northline Home Services"
                    className="mt-2 w-full rounded-xl border border-zinc-200/90 bg-[#faf8f5]/90 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200/50"
                  />
                </label>
                <label className="mt-4 block text-sm font-semibold text-zinc-800">
                  How can we help?
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Review volume, scheduling, growth goals…"
                    className="mt-2 w-full resize-none rounded-xl border border-zinc-200/90 bg-[#faf8f5]/90 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200/50"
                  />
                </label>
                <button
                  type="button"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-800 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/30 ring-1 ring-zinc-950/20 transition hover:from-zinc-800 hover:to-zinc-700"
                >
                  Send message
                  <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
                  By submitting, you agree to be contacted about your inquiry.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

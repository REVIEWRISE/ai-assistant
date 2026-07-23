import { LANDING_FEATURES } from "@/components/landing/landing-features-data";

export function LandingFeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden bg-[var(--color-surface)] py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-primary)_10%,transparent),transparent_68%)]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">One operating layer</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Three agents. One customer journey.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-[var(--color-text-muted)] lg:justify-self-end lg:text-lg lg:leading-8">
            Stop treating reviews, bookings, and leads as separate queues. VyntRise connects them so every interaction has context and a clear next step.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:mt-14 lg:grid-cols-3">
          {LANDING_FEATURES.map((item, index) => (
            <article key={item.title} className="group relative overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-[var(--shadow-sm)] transition duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-primary)_32%,var(--color-border))] hover:shadow-[var(--shadow-lg)] motion-reduce:hover:translate-y-0 sm:p-7">
              <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent_68%)] opacity-0 transition group-hover:opacity-100" aria-hidden />
              <div className="relative flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] bg-[var(--color-primary-soft)] text-[var(--color-primary-h)] [&_svg]:size-5">
                  {item.icon}
                </span>
                <span className="font-mono text-xs text-[var(--color-text-subtle)]">0{index + 1}</span>
              </div>
              <div className="relative mt-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">{item.label}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--color-text)]">{item.title}</h3>
                <p className="mt-3 min-h-20 text-sm leading-6 text-[var(--color-text-muted)]">{item.desc}</p>
                <ul className="mt-6 space-y-3 border-t border-[var(--color-border)] pt-5">
                  {item.highlights.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-[var(--color-text)]">
                      <svg className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                      </svg>
                      <span className="leading-5">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-bg)] p-5 sm:grid-cols-3 sm:p-6">
          {[
            ["Shared context", "Agents use the same customer and business information."],
            ["Human control", "Approval rules and handoffs keep sensitive work with your team."],
            ["Clear reporting", "See activity and outcomes across every location."],
          ].map(([title, body]) => (
            <div key={title} className="px-2 py-2 sm:border-r sm:border-[var(--color-border)] sm:px-5 sm:last:border-r-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
              <p className="mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

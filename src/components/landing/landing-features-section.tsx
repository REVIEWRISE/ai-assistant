import { LANDING_FEATURES } from "@/components/landing/landing-features-data";

export function LandingFeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden bg-[var(--color-surface)] py-16 sm:py-20 lg:py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
              One operating layer
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Three agents. One customer journey.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-[var(--color-text-muted)] lg:justify-self-end lg:text-lg lg:leading-8">
            Stop treating reviews, bookings, and leads as separate queues. VyntRise connects them so every interaction has context and a clear next step.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:mt-14 lg:grid-cols-3">
          {LANDING_FEATURES.map((item, index) => (
            <article
              key={item.title}
              className={`landing-animate-view relative border-t border-[var(--color-border)] pt-6 ${
                index === 0
                  ? "landing-animate-delay-1"
                  : index === 1
                    ? "landing-animate-delay-2"
                    : "landing-animate-delay-3"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center text-[var(--color-primary-h)] [&_svg]:size-5">
                  {item.icon}
                </span>
                <span className="font-mono text-xs text-[var(--color-text-subtle)]">0{index + 1}</span>
              </div>
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
                  {item.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--color-text)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{item.desc}</p>
                <ul className="mt-6 space-y-2.5">
                  {item.highlights.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-[var(--color-text)]">
                      <svg
                        className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        aria-hidden
                      >
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
      </div>
    </section>
  );
}

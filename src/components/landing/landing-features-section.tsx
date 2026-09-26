import { LANDING_FEATURES } from "@/components/landing/landing-features-data";
import { CheckIcon } from "@/components/landing/landing-icons";

export function LandingFeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden bg-[var(--color-bg)] py-24 sm:py-32">
      {/* Subtle top glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_8%,transparent),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section label */}
        <div className="text-center">
          <div className="vr-landing-eyebrow">One unified operations layer</div>
          <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
            Three agents.{" "}
            <span className="vr-gradient-text">One customer journey.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--color-text-muted)]">
            Stop treating reviews, bookings, and leads as separate queues. VyntRise connects them so every interaction has context and a clear next step.
          </p>
        </div>

        {/* Feature cards */}
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((item, i) => (
            <div
              key={item.title}
              className="vr-glass-card landing-animate-view flex flex-col p-7"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              {/* Icon & badge row */}
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary-h)]">
                  {item.icon}
                </span>
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
                  {item.badge}
                </span>
              </div>

              {/* Text */}
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
                {item.tag}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-[var(--color-text)]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)] flex-1">
                {item.desc}
              </p>

              {/* Highlights */}
              <ul className="mt-6 space-y-2 border-t border-[var(--color-border)] pt-5">
                {item.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2.5 text-xs text-[var(--color-text)]">
                    <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Guardrails banner */}
        <div className="vr-glow-card landing-animate-view mt-7 p-8 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
                Always under your control
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--color-text)] sm:text-2xl">
                Your brand voice. Your approval rules. Zero surprises.
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
                Configure confidence thresholds, banned keywords, and human-in-the-loop approval triggers for low-star reviews or VIP accounts. Nothing goes live without your sign-off.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Custom Brand Tone", "Human-in-the-Loop", "Sentiment Escalation", "Zero Hallucination"].map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]"
                  >
                    <span className="size-1.5 rounded-full bg-[var(--color-primary)]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Control panel preview */}
            <div className="w-full shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-sm lg:w-72">
              <p className="text-xs font-semibold text-[var(--color-text)]">Approval Rules</p>
              <div className="mt-4 space-y-3">
                {[
                  ["Require approval on ≤ 3-star reviews", true],
                  ["Auto-extract business knowledge", true],
                  ["SMS alert on escalations", true],
                ].map(([label, active]) => (
                  <div key={label as string} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">{label as string}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-[var(--color-surface)] text-[var(--color-text-subtle)]"
                    }`}>
                      {active ? "ON" : "OFF"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

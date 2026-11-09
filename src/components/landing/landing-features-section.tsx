import { LANDING_FEATURES } from "@/components/landing/landing-features-data";
import { CheckIcon } from "@/components/landing/landing-icons";

const APPROVAL_RULES = [
  "Require approval on ≤ 3-star reviews",
  "Auto-extract business knowledge",
  "SMS alert on escalations",
];

const CONTROLS = ["Custom Brand Tone", "Human-in-the-Loop", "Sentiment Escalation", "Zero Hallucination"];

export function LandingFeaturesSection() {
  return (
    <section id="features" className="lp-section">
      <div className="lp-wrap">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
          <h2 className="lp-h2">Three agents. One customer journey.</h2>
          <p className="lp-lede">
            Stop treating reviews, bookings, and leads as separate queues. VyntRise connects them so every interaction
            has context and a clear next step.
          </p>
        </div>

        <ol className="mt-14 grid lg:mt-20 lg:grid-cols-3">
          {LANDING_FEATURES.map((item) => (
            <li key={item.title} className="lp-stop">
              <span className="lp-stop-icon">{item.icon}</span>
              <p className="text-sm font-semibold text-[var(--lp-accent)]">{item.badge}</p>
              <h3 className="mt-2 text-xl font-semibold leading-snug tracking-[-0.02em] text-[var(--color-text)]">
                {item.title}
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-[var(--color-text-muted)]">{item.desc}</p>
              <ul className="mt-5 space-y-2.5">
                {item.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2.5 text-sm leading-6 text-[var(--color-text)]">
                    <CheckIcon className="mt-1 size-4 shrink-0 text-[var(--lp-accent)]" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="lp-tinted mt-16 grid gap-8 rounded-3xl p-6 sm:p-10 lg:mt-24 lg:grid-cols-[1fr_22rem] lg:items-center lg:gap-16 lg:p-14">
          <div>
            <h3 className="text-[clamp(1.5rem,2.6vw,2.125rem)] font-semibold leading-tight tracking-[-0.025em] text-[var(--color-text)]">
              Your brand voice. Your approval rules. Zero surprises.
            </h3>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-[var(--color-text-muted)]">
              Configure confidence thresholds, banned keywords, and human-in-the-loop approval triggers for low-star
              reviews or VIP accounts. Nothing goes live without your sign-off.
            </p>
            <p className="mt-5 text-sm font-medium leading-7 text-[var(--color-text)]">{CONTROLS.join(" · ")}</p>
          </div>

          <div className="rounded-2xl border border-[var(--lp-tint-line)] bg-[var(--color-bg)] p-5 sm:p-6">
            <p className="text-sm font-semibold text-[var(--color-text)]">Approval rules</p>
            <ul className="mt-4 space-y-4">
              {APPROVAL_RULES.map((rule) => (
                <li key={rule} className="flex items-center justify-between gap-4 text-sm text-[var(--color-text-muted)]">
                  {rule}
                  <span className="lp-toggle" role="img" aria-label="On" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/lib/brand";

export function LandingContactSection() {
  return (
    <section id="contact" className="relative overflow-hidden bg-[var(--color-bg)] px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="landing-spotlight landing-animate-view mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] p-8 sm:p-12 lg:p-16">
        {/* Background glow and grid */}
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.1]" aria-hidden />
        <div className="landing-spotlight-glow -right-24 -top-32 h-96 w-96" aria-hidden />
        <div className="landing-spotlight-glow -left-20 -bottom-24 h-80 w-80" aria-hidden />

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-bg)]/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary-h)] backdrop-blur">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready for Immediate Deployment</span>
            </div>

            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Give every customer a fast, <span className="vr-gradient-text">thoughtful next step.</span>
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">
              Start your 14-day free trial today or speak directly with our solutions team to configure custom multi-location workflows.
            </p>

            {/* Micro assurances */}
            <div className="mt-8 flex flex-wrap gap-4 text-xs font-semibold text-[var(--color-text)]">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> 15-Minute Zero-Code Setup
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-500 font-bold">✓</span> Cancel Anytime
              </span>
            </div>
          </div>

          {/* Right Action Box */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/80 p-6 sm:p-8 backdrop-blur shadow-lg">
            <h3 className="text-lg font-bold text-[var(--color-text)]">
              Get Started in Minutes
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Choose an option below to test the agent with your own business channels.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/register"
                className="vr-landing-btn-primary flex min-h-12 w-full items-center justify-center rounded-full text-sm font-bold text-[var(--color-primary-fg)] shadow"
              >
                Start 14-Day Free Trial →
              </Link>

              <a
                href={`mailto:${CONTACT_EMAIL}?subject=VyntRise%20Agent%20Demo%20Request`}
                className="vr-landing-btn-secondary flex min-h-12 w-full items-center justify-center rounded-full text-sm font-bold text-[var(--color-text)]"
              >
                Schedule Operator Demo
              </a>
            </div>

            {/* Direct Contact Chips */}
            <div className="mt-6 border-t border-[var(--color-border)] pt-5 space-y-2 text-xs text-[var(--color-text-muted)]">
              <div className="flex items-center justify-between">
                <span>Direct Support:</span>
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--color-primary-h)] hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span>Phone / SMS:</span>
                <a href={`tel:${CONTACT_PHONE_TEL}`} className="font-semibold text-[var(--color-text)] hover:underline">
                  {CONTACT_PHONE}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span>Response SLA:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  &lt; 15 mins (Mon–Fri)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

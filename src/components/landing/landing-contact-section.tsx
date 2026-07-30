import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/lib/brand";

export function LandingContactSection() {
  return (
    <section id="contact" className="bg-[var(--color-bg)] px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="landing-spotlight landing-animate-view mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
        <div className="landing-spotlight-glow -right-24 -top-32 size-80" aria-hidden />

        <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Ready when you are
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Give every customer a fast, thoughtful next step.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">
              Start a free trial or tell us about your current workflow. We&rsquo;ll help you choose the right first automation.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
            >
              Start 14-day trial
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-6 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface)]"
            >
              Talk to our team
            </a>
          </div>
        </div>

        <div className="relative mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-muted)]">
          <a href={`mailto:${CONTACT_EMAIL}`} className="transition hover:text-[var(--color-text)]">
            {CONTACT_EMAIL}
          </a>
          <a href={`tel:${CONTACT_PHONE_TEL}`} className="transition hover:text-[var(--color-text)]">
            {CONTACT_PHONE}
          </a>
          <span>Mon–Fri · 9am–6pm</span>
        </div>
      </div>
    </section>
  );
}

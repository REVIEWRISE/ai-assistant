import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/lib/brand";

const inputClassName =
  "mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-sm outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]";

export function LandingContactSection() {
  return (
    <section
      id="contact"
      className="vr-landing-section relative overflow-hidden border-t border-[var(--color-border)] py-16 sm:py-20 lg:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-[var(--shadow-lg)] sm:p-10 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:p-14">
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-primary)_14%,transparent),transparent)] opacity-80 blur-3xl"
            aria-hidden
          />

          <div className="relative">
            <div className="vr-landing-eyebrow">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact
            </div>
            <h3 className="vr-landing-heading mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Let&rsquo;s talk about your operation
            </h3>
            <p className="vr-landing-muted mt-3 text-base leading-relaxed sm:text-lg">
              Tell us your stack and goals. We&rsquo;ll reply with a rollout plan within one business day.
            </p>

            <div className="mt-10 space-y-3 sm:space-y-4">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-[var(--shadow-md)] motion-reduce:hover:translate-y-0 sm:px-5 sm:py-4"
              >
                <span className="vr-brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md ring-1 ring-white/80">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m3 8 7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"
                    />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                    Email
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--color-text)]">
                    {CONTACT_EMAIL}
                  </span>
                </span>
              </a>

              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-[var(--shadow-md)] motion-reduce:hover:translate-y-0 sm:px-5 sm:py-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-grad-start)] to-[var(--color-grad-end)] text-white shadow-md ring-1 ring-white/80">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                    />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                    Phone
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-[var(--color-text)]">{CONTACT_PHONE}</span>
                </span>
              </a>

              <div className="flex items-center gap-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 sm:px-5 sm:py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary-h)] ring-1 ring-[var(--color-border)]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-[var(--color-text-muted)]">Mon–Fri · 9am–6pm</span>
              </div>
            </div>
          </div>

          <div className="relative mt-10 lg:mt-0">
            <form className="relative overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)] sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
                Send a message
              </p>
              <p className="vr-landing-muted mt-1 text-sm">We reply within one business day.</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--color-text)]">
                  First name
                  <input
                    type="text"
                    name="firstName"
                    autoComplete="given-name"
                    placeholder="Amelia"
                    className={inputClassName}
                  />
                </label>
                <label className="block text-sm font-semibold text-[var(--color-text)]">
                  Last name
                  <input
                    type="text"
                    name="lastName"
                    autoComplete="family-name"
                    placeholder="Lewis"
                    className={inputClassName}
                  />
                </label>
              </div>

              <label className="mt-4 block text-sm font-semibold text-[var(--color-text)]">
                Work email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={inputClassName}
                />
              </label>

              <label className="mt-4 block text-sm font-semibold text-[var(--color-text)]">
                Company name
                <input
                  type="text"
                  name="company"
                  autoComplete="organization"
                  placeholder="Northline Home Services"
                  className={inputClassName}
                />
              </label>

              <label className="mt-4 block text-sm font-semibold text-[var(--color-text)]">
                How can we help?
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Review volume, scheduling, growth goals…"
                  className={`${inputClassName} resize-none`}
                />
              </label>

              <button
                type="button"
                className="vr-landing-btn-primary mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold"
              >
                Send message
                <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              <p className="vr-landing-muted mt-3 text-center text-xs leading-relaxed">
                By submitting, you agree to be contacted about your inquiry.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

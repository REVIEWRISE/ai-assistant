type FaqItem = { readonly q: string; readonly paragraphs: readonly string[] };

export function LandingFaqSection({ faq }: { faq: readonly FaqItem[] }) {
  return (
    <section id="faq" className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Questions</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)] sm:text-4xl">
            What teams ask before they start.
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
            Still deciding? <a href="#contact" className="font-semibold text-[var(--color-primary-h)] hover:underline">Talk with our team</a>.
          </p>
        </div>

        <div className="space-y-3">
          {faq.map((item, index) => (
            <details key={item.q} className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] open:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]">
              <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-5 sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 font-mono text-xs font-semibold text-[var(--color-primary-h)]">0{index + 1}</span>
                <span className="flex-1 text-base font-semibold leading-6 text-[var(--color-text)] sm:text-lg">{item.q}</span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)] transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <div className="space-y-3 border-t border-[var(--color-border)] px-5 py-5 pl-12 sm:px-6 sm:pl-16">
                {item.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-[var(--color-text-muted)]">{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

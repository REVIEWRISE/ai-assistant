import { LANDING_TESTIMONIALS } from "@/lib/landing-data";

export function LandingTestimonialsSection() {
  return (
    <section id="testimonials" className="bg-[var(--color-bg)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">From the field</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)] sm:text-4xl">
            Less inbox work. More time with customers.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {LANDING_TESTIMONIALS.map((item) => (
            <figure key={item.name} className="flex flex-col rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7">
              <div className="flex gap-1 text-amber-400" aria-label="5 out of 5 stars">
                {[0, 1, 2, 3, 4].map((star) => <span key={star} aria-hidden>★</span>)}
              </div>
              <blockquote className="mt-5 flex-1 text-base leading-7 text-[var(--color-text)]">&ldquo;{item.quote}&rdquo;</blockquote>
              <figcaption className="mt-7 border-t border-[var(--color-border)] pt-4">
                <p className="text-sm font-semibold text-[var(--color-text)]">{item.name}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

import { LANDING_TESTIMONIALS } from "@/lib/landing-data";

function StarRow() {
  return (
    <div className="flex gap-0.5 text-[var(--color-warning)]" aria-label="5 out of 5 stars">
      {[0, 1, 2, 3, 4].map((star) => (
        <svg key={star} viewBox="0 0 20 20" className="size-3.5 fill-current" aria-hidden>
          <path d="M10 1.5l2.35 4.76 5.25.76-3.8 3.7.9 5.24L10 13.77l-4.7 2.19.9-5.24-3.8-3.7 5.25-.76L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export function LandingTestimonialsSection() {
  return (
    <section id="testimonials" className="bg-[var(--color-bg)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
            From the field
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)] sm:text-4xl">
            Less inbox work. More time with customers.
          </h2>
        </div>

        <div className="mt-12 grid gap-10 border-t border-[var(--color-border)] pt-10 lg:grid-cols-3 lg:gap-12">
          {LANDING_TESTIMONIALS.map((item) => (
            <figure key={item.name} className="flex flex-col">
              <StarRow />
              <blockquote className="mt-4 flex-1 text-[15px] leading-7 text-[var(--color-text)]">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6">
                <p className="text-sm font-semibold text-[var(--color-text)]">{item.name}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{item.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

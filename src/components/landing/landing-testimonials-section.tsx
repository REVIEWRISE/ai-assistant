import { TestimonialsMarquee } from "@/components/testimonials-marquee";
import { LANDING_TESTIMONIALS } from "@/lib/landing-data";

export function LandingTestimonialsSection() {
  const items = Array.from(LANDING_TESTIMONIALS);

  return (
    <section
      id="testimonials"
      className="vr-landing-section relative w-full overflow-hidden border-t border-[var(--color-border)] pt-12 pb-14 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20"
      aria-labelledby="testimonials-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="vr-landing-eyebrow">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Clients say
          </div>
          <h2 id="testimonials-heading" className="vr-landing-heading mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            What our clients say
          </h2>
          <p className="vr-landing-muted mt-3 text-sm leading-relaxed sm:text-base">
            Reviews, bookings, and day-to-day comms. What clients actually said.
          </p>
        </div>

      </div>

      <div className="relative mt-8 w-full sm:mt-10">
        <TestimonialsMarquee items={items} />
      </div>
    </section>
  );
}

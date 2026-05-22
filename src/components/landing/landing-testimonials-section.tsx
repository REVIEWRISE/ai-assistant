import { TestimonialsMarquee } from "@/components/testimonials-marquee";
import { LANDING_TESTIMONIALS } from "@/lib/landing-data";

export function LandingTestimonialsSection() {
  const items = Array.from(LANDING_TESTIMONIALS);
  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-[#faf8f5] pt-12 pb-0 sm:pt-16 lg:pt-20"
      aria-labelledby="testimonials-heading"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[min(100%,44rem)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.16),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] bg-[linear-gradient(rgba(24,24,27,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-gradient-to-b from-white/80 to-white/45 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-900/85 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] backdrop-blur-md ring-1 ring-amber-200/40">
            <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Clients say
          </div>
          <h2 id="testimonials-heading" className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            What our clients say
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
            Reviews, bookings, and day-to-day comms—what clients actually said.
          </p>
        </div>

        <div className="mt-8 sm:mt-10">
          <TestimonialsMarquee items={items} />
        </div>
      </div>
    </section>
  );
}

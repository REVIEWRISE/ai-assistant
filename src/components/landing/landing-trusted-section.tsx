import { TrustedByMarquee } from "@/components/trusted-by-marquee";

export function LandingTrustedSection({ names }: { names: readonly string[] }) {
  return (
    <section
      id="trusted"
      className="vr-landing-section relative w-full overflow-hidden border-t border-[var(--color-border)] py-10 sm:py-12 lg:py-14"
      aria-labelledby="trusted-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,color-mix(in_srgb,var(--color-primary)_10%,transparent),transparent)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="vr-landing-eyebrow">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Early access
          </div>
          <h2 id="trusted-heading" className="vr-landing-heading mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Working with us today
          </h2>
          <p className="vr-landing-muted mt-3 text-sm leading-relaxed sm:text-base">
            A small group of businesses onboarding first. More stories as we go live.
          </p>
        </div>

      </div>

      <div className="relative mt-8 w-full sm:mt-10" aria-label="Trusted companies">
        <TrustedByMarquee names={[...names]} />
      </div>
    </section>
  );
}

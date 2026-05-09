import { LandingContactSection } from "@/components/landing/landing-contact-section";
import { LandingFaqSection } from "@/components/landing/landing-faq-section";
import { LandingFeaturesSection } from "@/components/landing/landing-features-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingIntegrationsSection } from "@/components/landing/landing-integrations-section";
import { LandingPlaybookSection } from "@/components/landing/landing-playbook-section";
import { LandingPricingSection } from "@/components/landing/landing-pricing-section";
import { LandingTestimonialsSection } from "@/components/landing/landing-testimonials-section";
import { LandingTrustedSection } from "@/components/landing/landing-trusted-section";
import { LandingHeader } from "@/components/landing-header";
import { hasValidSession } from "@/lib/has-valid-session";
import {
  LANDING_FAQ,
  LANDING_INTEGRATIONS,
  LANDING_PLANS,
  LANDING_TESTIMONIALS,
  LANDING_TRUSTED_BY,
} from "@/lib/landing-data";

export default async function Home() {
  const isLoggedIn = await hasValidSession();
  const registerHref = isLoggedIn ? "/dashboard" : "/register";

  return (
    <div className="min-h-screen bg-[#faf8f5] text-zinc-900 antialiased">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgba(251,191,36,0.2),transparent),radial-gradient(ellipse_45%_40%_at_100%_0%,rgba(20,184,166,0.11),transparent),radial-gradient(ellipse_40%_35%_at_0%_25%,rgba(244,114,182,0.07),transparent)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4] bg-[linear-gradient(rgba(24,24,27,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.035)_1px,transparent_1px)] bg-[size:48px_48px]"
          aria-hidden
        />

        <LandingHeader isLoggedIn={isLoggedIn} />

        <LandingHero isLoggedIn={isLoggedIn} />

        <LandingTrustedSection names={LANDING_TRUSTED_BY} />
      </div>

      <LandingFeaturesSection />

      <LandingPlaybookSection registerHref={registerHref} isLoggedIn={isLoggedIn} />

      <LandingIntegrationsSection
        integrations={LANDING_INTEGRATIONS}
        registerHref={registerHref}
        isLoggedIn={isLoggedIn}
      />

      <LandingTestimonialsSection items={LANDING_TESTIMONIALS} />

      <LandingFaqSection faq={LANDING_FAQ} />

      <LandingPricingSection plans={LANDING_PLANS} registerHref={registerHref} isLoggedIn={isLoggedIn} />

      <LandingContactSection />

      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  );
}

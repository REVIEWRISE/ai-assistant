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
import { LandingChatbotDemo } from "@/components/landing/landing-chatbot-demo";
import { hasValidSession } from "@/lib/has-valid-session";
import {
  LANDING_FAQ,
  LANDING_INTEGRATIONS,
  LANDING_PLANS,
  LANDING_TRUSTED_BY,
} from "@/lib/landing-data";

export default async function Home() {
  const isLoggedIn = await hasValidSession();
  const registerHref = isLoggedIn ? "/dashboard" : "/register";

  return (
    <div className="landing min-h-screen antialiased">
      <div className="relative overflow-x-clip">
        <div className="landing-mesh pointer-events-none absolute inset-0" aria-hidden />
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />

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

      <LandingTestimonialsSection />

      <LandingFaqSection faq={LANDING_FAQ} />

      <LandingPricingSection plans={LANDING_PLANS} registerHref={registerHref} isLoggedIn={isLoggedIn} />

      <LandingContactSection />

      <LandingFooter isLoggedIn={isLoggedIn} />

      {/* <LandingChatbotDemo /> */}
    </div>
  );
}

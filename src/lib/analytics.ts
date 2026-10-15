// Google Analytics (GA4) utilities and event definitions
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-81QRBJRLL9";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: "js" | "config" | "event" | "set",
      targetOrDate: string | Date,
      configOrParams?: Record<string, unknown>
    ) => void;
  }
}

/**
 * Sends a custom event to Google Analytics if gtag is loaded on the page.
 */
export function sendGAEvent(
  action: string,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  try {
    window.gtag("event", action, params);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[GA] Failed to dispatch event:", action, error);
    }
  }
}

/**
 * Tracks CTA clicks on the landing page (e.g. hero buttons, section links).
 */
export function trackLandingCta(
  ctaName: string,
  location: string,
  destination?: string
): void {
  sendGAEvent("cta_click", {
    cta_name: ctaName,
    cta_location: location,
    cta_destination: destination,
    page_location: typeof window !== "undefined" ? window.location.pathname : "/",
  });
}

/**
 * Tracks pricing plan selections and billing interval changes.
 */
export function trackPlanSelected(
  planName: string,
  billingInterval: string
): void {
  sendGAEvent("select_plan", {
    plan_name: planName,
    billing_interval: billingInterval,
  });
}

/**
 * Tracks interactions inside the interactive demo sandbox.
 */
export function trackDemoPlayground(
  action: "switch_scenario" | "switch_tone" | "generate" | "copy",
  scenarioId?: string
): void {
  sendGAEvent("demo_interaction", {
    demo_action: action,
    scenario_id: scenarioId,
  });
}

/**
 * Tracks contact actions (free trial, email, direct phone call).
 */
export function trackContactClick(
  channel: "trial" | "email" | "phone",
  target?: string
): void {
  sendGAEvent("contact_click", {
    contact_channel: channel,
    contact_target: target,
  });
}

/**
 * Tracks expanding/collapsing FAQ items.
 */
export function trackFaqToggle(question: string, isOpen: boolean): void {
  sendGAEvent("faq_toggle", {
    faq_question: question,
    faq_state: isOpen ? "opened" : "closed",
  });
}

/**
 * Tracks navigation link clicks in the landing header.
 */
export function trackLandingNav(label: string, href: string): void {
  sendGAEvent("nav_click", {
    nav_label: label,
    nav_href: href,
  });
}

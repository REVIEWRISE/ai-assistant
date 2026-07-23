export const PLAN_SLUGS = ["starter", "growth", "pro_voice"] as const;

export type PlanSlug = (typeof PLAN_SLUGS)[number];
export type PlanEntitlementValue = boolean | number;

export type PricingPlan = {
  slug: PlanSlug;
  name: string;
  positioning: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  yearlyMonthlyEquivalentCents: number;
  featured: boolean;
  includedLocations: number;
  teamMemberLimit: number;
  includedVoiceMinutes: number;
  highlights: string[];
};

export const BILLING_RULES = {
  currency: "USD",
  trialDays: 14,
  cardRequiredForTrial: false,
  extraLocationMonthlyCents: 2_900,
  voiceOverageCentsPerMinute: 15,
  postTrialDataRetentionDays: 30,
} as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    slug: "starter",
    name: "Starter",
    positioning: "Review management for single-location businesses.",
    monthlyPriceCents: 3_900,
    yearlyPriceCents: 39_600,
    yearlyMonthlyEquivalentCents: 3_300,
    featured: false,
    includedLocations: 1,
    teamMemberLimit: 1,
    includedVoiceMinutes: 0,
    highlights: [
      "Google, Yelp, and Facebook reviews",
      "AI review reply drafts",
      "Urgent review alerts and weekly digest",
      "Review request links and templates",
      "1 location and 1 team member",
    ],
  },
  {
    slug: "growth",
    name: "Growth",
    positioning: "Review management, chatbot, and appointment booking.",
    monthlyPriceCents: 8_900,
    yearlyPriceCents: 90_000,
    yearlyMonthlyEquivalentCents: 7_500,
    featured: true,
    includedLocations: 1,
    teamMemberLimit: 5,
    includedVoiceMinutes: 0,
    highlights: [
      "Everything in Starter",
      "Customizable web chatbot",
      "Knowledge Base training",
      "Calendar booking and reminders",
      "Multi-language replies and lead capture",
      "5 team members",
    ],
  },
  {
    slug: "pro_voice",
    name: "Pro Voice",
    positioning: "The complete platform with an AI phone agent.",
    monthlyPriceCents: 17_900,
    yearlyPriceCents: 178_800,
    yearlyMonthlyEquivalentCents: 14_900,
    featured: false,
    includedLocations: 2,
    teamMemberLimit: 10,
    includedVoiceMinutes: 300,
    highlights: [
      "Everything in Growth",
      "Virtual phone number and AI voice agent",
      "300 calling minutes per month",
      "Call recordings, transcripts, and sentiment",
      "Monthly reputation report",
      "2 locations, 10 team members, and priority support",
    ],
  },
];

export const PLAN_FEATURE_GROUPS = [
  {
    name: "Reviews & Reputation",
    features: [
      { key: "review_channels", label: "Review channels", detail: "Google Business, Yelp, Facebook", starter: true, growth: true, pro_voice: true },
      { key: "ai_review_reply_drafts", label: "AI review reply drafts", detail: "Generated in the brand's tone", starter: true, growth: true, pro_voice: true },
      { key: "urgent_review_alerts", label: "Urgent 1-2 star alerts", detail: "Instant notification on negative reviews", starter: true, growth: true, pro_voice: true },
      { key: "weekly_reputation_digest", label: "Weekly reputation digest", detail: "New reviews, average rating, and trend", starter: true, growth: true, pro_voice: true },
      { key: "review_request_link", label: "Review request link", detail: "Shareable customer link", starter: true, growth: true, pro_voice: true },
      { key: "thank_you_templates", label: "Thank-you auto-reply templates", starter: true, growth: true, pro_voice: true },
      { key: "review_showcase_widget", label: "Review showcase widget", starter: false, growth: true, pro_voice: true },
      { key: "monthly_reputation_report", label: "Monthly reputation report (PDF)", starter: false, growth: false, pro_voice: true },
    ],
  },
  {
    name: "Web Chatbot & Booking",
    features: [
      { key: "web_chatbot", label: "Customizable web chatbot", starter: false, growth: true, pro_voice: true },
      { key: "knowledge_base", label: "Knowledge Base training", starter: false, growth: true, pro_voice: true },
      { key: "calendar_booking", label: "Calendar booking and sync", starter: false, growth: true, pro_voice: true },
      { key: "booking_confirmations", label: "Booking confirmations and reminders", starter: false, growth: true, pro_voice: true },
      { key: "multi_language", label: "Multi-language replies", detail: "Automatic language detection", starter: false, growth: true, pro_voice: true },
      { key: "missed_chat_lead_capture", label: "Missed-chat lead capture", starter: false, growth: true, pro_voice: true },
      { key: "qr_code_generator", label: "QR code generator", starter: false, growth: true, pro_voice: true },
      { key: "auto_help_center", label: "Auto help center page", starter: false, growth: true, pro_voice: true },
      { key: "business_hours_mode", label: "Business hours mode", starter: false, growth: true, pro_voice: true },
    ],
  },
  {
    name: "AI Phone Agent",
    features: [
      { key: "virtual_phone_number", label: "Virtual phone number", starter: false, growth: false, pro_voice: true },
      { key: "ai_voice_agent", label: "AI voice agent", starter: false, growth: false, pro_voice: true },
      { key: "included_calling_minutes", label: "Included calling minutes", starter: 0, growth: 0, pro_voice: 300 },
      { key: "recordings_transcripts_sentiment", label: "Recordings, transcripts, and sentiment", starter: false, growth: false, pro_voice: true },
      { key: "call_summary_sms", label: "Call summary by SMS", starter: false, growth: false, pro_voice: true },
      { key: "vip_caller_list", label: "VIP caller list", starter: false, growth: false, pro_voice: true },
      { key: "after_hours_only", label: "After-hours-only mode", starter: false, growth: false, pro_voice: true },
    ],
  },
  {
    name: "Team, Locations & Support",
    features: [
      { key: "locations", label: "Locations included", starter: 1, growth: 1, pro_voice: 2 },
      { key: "team_members", label: "Team members", starter: 1, growth: 5, pro_voice: 10 },
      { key: "data_export", label: "Data export (CSV)", starter: true, growth: true, pro_voice: true },
      { key: "email_support", label: "Email support", starter: true, growth: true, pro_voice: true },
      { key: "priority_support", label: "Priority support", starter: false, growth: false, pro_voice: true },
      { key: "onboarding_call", label: "Free onboarding call", starter: false, growth: false, pro_voice: true },
    ],
  },
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_GROUPS)[number]["features"][number]["key"];

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: BILLING_RULES.currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function getPlanBySlug(slug: PlanSlug): PricingPlan {
  const plan = PRICING_PLANS.find((candidate) => candidate.slug === slug);
  if (!plan) throw new Error(`Unknown pricing plan: ${slug}`);
  return plan;
}

export function getPlanEntitlement(
  slug: PlanSlug,
  key: PlanFeatureKey,
): PlanEntitlementValue | undefined {
  for (const group of PLAN_FEATURE_GROUPS) {
    const feature = group.features.find((candidate) => candidate.key === key);
    if (feature) return feature[slug];
  }
  return undefined;
}

export function getPlanEntitlementRecord(slug: PlanSlug): Record<string, PlanEntitlementValue> {
  const entitlements: Record<string, PlanEntitlementValue> = {};
  for (const group of PLAN_FEATURE_GROUPS) {
    for (const feature of group.features) {
      entitlements[feature.key] = feature[slug];
    }
  }
  return entitlements;
}

import type { PlanSlug } from "@/lib/pricing-plans";

export type CheckoutPlanOption = {
  slug: PlanSlug;
  name: string;
  description: string;
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
  currencyCode: string;
  monthlyPlanId: string | null;
  yearlyPlanId: string | null;
  monthlyStripePriceId: string | null;
  yearlyStripePriceId: string | null;
  featured: boolean;
  isCustomPricing: boolean;
  contents: string[];
  includedLocations: number;
  teamMemberLimit: number;
  includedVoiceMinutes: number;
};

export type ResolvedCheckoutPlan = {
  productId: string;
  planId: string;
  stripePriceId: string | null;
  planSlug: PlanSlug;
  planName: string;
  billingInterval: "monthly" | "yearly";
  priceAmount: number | null;
  currencyCode: string;
};

export function planIntervalAllowsSelfServeCheckout(
  plan: Pick<CheckoutPlanOption, "isCustomPricing" | "monthlyPlanId" | "yearlyPlanId">,
  interval: "monthly" | "yearly",
): boolean {
  if (plan.isCustomPricing) return false;
  return Boolean(interval === "yearly" ? plan.yearlyPlanId : plan.monthlyPlanId);
}

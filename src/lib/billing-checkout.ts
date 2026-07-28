import "server-only";

import { getAgentBillingCatalog } from "@/lib/billing-client";
import {
  getBillingCatalogPlans,
  type CatalogPlanView,
} from "@/lib/billing-plan-repository";
import type { BillingInterval } from "@/lib/entitlements";
import type { CheckoutPlanOption, ResolvedCheckoutPlan } from "@/lib/billing-checkout-types";
import { PLAN_SLUGS, type PlanSlug } from "@/lib/pricing-plans";

export type { CheckoutPlanOption, ResolvedCheckoutPlan } from "@/lib/billing-checkout-types";

/** Map Billing catalog names/slugs onto local entitlement slugs. */
export function mapCatalogNameToPlanSlug(nameOrSlug: string): PlanSlug | null {
  const key = nameOrSlug.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((PLAN_SLUGS as readonly string[]).includes(key)) return key as PlanSlug;
  if (key === "professional" || key === "pro" || key === "growth_plan") return "growth";
  if (key === "enterprise" || key === "pro_voice_plan") return "pro_voice";
  if (key.startsWith("starter")) return "starter";
  if (key.startsWith("growth") || key.startsWith("professional")) return "growth";
  if (key.startsWith("pro_voice") || key.startsWith("enterprise") || key.includes("voice")) {
    return "pro_voice";
  }
  return null;
}

function yearlyPriceAsAnnualTotal(
  monthly: number | null,
  yearly: number | null,
): number | null {
  if (yearly == null) return null;
  if (monthly != null && monthly > 0 && yearly >= monthly * 8) return yearly;
  return yearly * 12;
}

function toCheckoutOption(plan: CatalogPlanView): CheckoutPlanOption | null {
  const slug = mapCatalogNameToPlanSlug(plan.slug) ?? mapCatalogNameToPlanSlug(plan.name);
  if (!slug) return null;

  return {
    slug,
    name: plan.name,
    description: plan.description,
    monthlyPriceCents: plan.monthlyPriceCents,
    yearlyPriceCents: yearlyPriceAsAnnualTotal(plan.monthlyPriceCents, plan.yearlyPriceCents),
    currencyCode: plan.currencyCode,
    monthlyPlanId: plan.monthlyPlanId,
    yearlyPlanId: plan.yearlyPlanId,
    monthlyStripePriceId: null,
    yearlyStripePriceId: null,
    featured: plan.featured,
    isCustomPricing: plan.isCustomPricing,
    contents: plan.contents,
    includedLocations: plan.includedLocations,
    teamMemberLimit: plan.teamMemberLimit,
    includedVoiceMinutes: plan.includedVoiceMinutes,
  };
}

export async function listCheckoutPlanOptions(): Promise<{
  productId: string | null;
  plans: CheckoutPlanOption[];
  error: string | null;
}> {
  const catalog = await getBillingCatalogPlans();
  if (catalog.error || !catalog.productId) {
    return { productId: null, plans: [], error: catalog.error ?? "unavailable" };
  }

  const remote = await getAgentBillingCatalog();
  const remoteById = new Map((remote?.plans ?? []).map((plan) => [plan.id, plan]));

  const bySlug = new Map<PlanSlug, CheckoutPlanOption>();
  for (const plan of catalog.plans) {
    const option = toCheckoutOption(plan);
    if (!option) continue;

    const monthlyRemote = option.monthlyPlanId ? remoteById.get(option.monthlyPlanId) : null;
    const yearlyRemote = option.yearlyPlanId ? remoteById.get(option.yearlyPlanId) : null;
    option.monthlyStripePriceId = monthlyRemote?.stripePriceId ?? null;
    option.yearlyStripePriceId = yearlyRemote?.stripePriceId ?? null;

    const existing = bySlug.get(option.slug);
    if (!existing || option.featured) {
      bySlug.set(option.slug, option);
    }
  }

  const order: PlanSlug[] = ["starter", "growth", "pro_voice"];
  const plans = order
    .map((slug) => bySlug.get(slug))
    .filter((p): p is CheckoutPlanOption => Boolean(p));

  return { productId: catalog.productId, plans, error: null };
}

export async function resolveCheckoutPlan(input: {
  planSlug: PlanSlug;
  billingInterval: BillingInterval;
}): Promise<ResolvedCheckoutPlan | null> {
  const { productId, plans } = await listCheckoutPlanOptions();
  if (!productId) return null;

  const option = plans.find((plan) => plan.slug === input.planSlug);
  if (!option) return null;

  const yearly = input.billingInterval === "yearly";
  const planId = yearly ? option.yearlyPlanId : option.monthlyPlanId;
  const stripePriceId = yearly ? option.yearlyStripePriceId : option.monthlyStripePriceId;
  const priceAmount = yearly ? option.yearlyPriceCents : option.monthlyPriceCents;

  if (!planId || !stripePriceId || priceAmount == null) {
    const altPlanId = yearly ? option.monthlyPlanId : option.yearlyPlanId;
    const altStripe = yearly ? option.monthlyStripePriceId : option.yearlyStripePriceId;
    const altPrice = yearly ? option.monthlyPriceCents : option.yearlyPriceCents;
    const altInterval: BillingInterval = yearly ? "monthly" : "yearly";
    if (!altPlanId || !altStripe || altPrice == null) return null;
    return {
      productId,
      planId: altPlanId,
      stripePriceId: altStripe,
      planSlug: option.slug,
      planName: option.name,
      billingInterval: altInterval,
      priceAmount: altPrice,
      currencyCode: option.currencyCode,
    };
  }

  return {
    productId,
    planId,
    stripePriceId,
    planSlug: option.slug,
    planName: option.name,
    billingInterval: input.billingInterval,
    priceAmount,
    currencyCode: option.currencyCode,
  };
}

export async function resolvePlanSlugFromBillingPlanId(
  planId: string,
): Promise<{ planSlug: PlanSlug; billingInterval: BillingInterval } | null> {
  const remote = await getAgentBillingCatalog();
  const plan = remote?.plans.find((row) => row.id === planId);
  if (!plan) return null;

  const planSlug = mapCatalogNameToPlanSlug(plan.name);
  if (!planSlug) return null;

  const interval = plan.billingInterval.trim().toLowerCase();
  const billingInterval: BillingInterval =
    interval === "yearly" || interval === "year" || interval === "annual"
      ? "yearly"
      : "monthly";

  return { planSlug, billingInterval };
}

import "server-only";

import type { LandingPlan } from "@/lib/landing-data";
import {
  getAgentBillingCatalog,
  isBillingConfigured,
  type BillingRemotePlan,
} from "@/lib/billing-client";
import { BILLING_RULES, formatUsd } from "@/lib/pricing-plans";
import type { BillingCatalogError } from "@/lib/billing-catalog-types";

export type { BillingCatalogError } from "@/lib/billing-catalog-types";

export type CatalogPlanView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  billingInterval: string;
  priceAmount: number;
  currencyCode: string;
  trialPeriodDays: number;
  stripePriceId: string | null;
  isActive: boolean;
  isCustomPricing: boolean;
  featured: boolean;
  includedLocations: number;
  teamMemberLimit: number;
  includedVoiceMinutes: number;
  contents: string[];
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
};

export type BillingCatalogResult = {
  plans: CatalogPlanView[];
  productName?: string;
  productDisplayName?: string;
  error: BillingCatalogError | null;
};

function slugifyPlanName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function limitValue(
  limits: BillingRemotePlan["featureLimits"],
  keys: string[],
  fallback = 0,
): number {
  if (!limits?.length) return fallback;
  for (const key of keys) {
    const hit = limits.find((item) => item.key === key);
    if (typeof hit?.value === "number" && Number.isFinite(hit.value)) return hit.value;
  }
  return fallback;
}

function contentsForPlan(plan: BillingRemotePlan): string[] {
  if (plan.highlights?.length) return [...plan.highlights];

  const fromLimits =
    plan.featureLimits
      ?.map((limit) => {
        if (typeof limit.value === "boolean") {
          return limit.value ? limit.key.replace(/_/g, " ") : null;
        }
        return `${limit.key.replace(/_/g, " ")}: ${String(limit.value)}`;
      })
      .filter((item): item is string => Boolean(item)) ?? [];

  if (fromLimits.length) return fromLimits;

  const bullets: string[] = [];
  if (plan.trialPeriodDays > 0) {
    bullets.push(`${plan.trialPeriodDays}-day trial`);
  }
  if (plan.isCustomPricing) {
    bullets.push("Custom enterprise pricing");
  } else if (plan.priceAmount > 0) {
    bullets.push(
      `${formatUsd(plan.priceAmount)} / ${plan.billingInterval === "yearly" ? "year" : "month"}`,
    );
  }
  if (plan.stripePriceId) {
    bullets.push("Stripe checkout ready");
  }
  return bullets;
}

function groupRemotePlans(plans: BillingRemotePlan[]): CatalogPlanView[] {
  const groups = new Map<
    string,
    {
      name: string;
      monthly?: BillingRemotePlan;
      yearly?: BillingRemotePlan;
      any: BillingRemotePlan;
    }
  >();

  for (const plan of plans) {
    const key = plan.name.trim().toLowerCase();
    const existing = groups.get(key) ?? { name: plan.name, any: plan };
    const interval = plan.billingInterval.trim().toLowerCase();
    if (interval === "yearly" || interval === "year" || interval === "annual") {
      existing.yearly = plan;
    } else {
      existing.monthly = plan;
    }
    existing.any = plan;
    groups.set(key, existing);
  }

  const grouped = Array.from(groups.values()).map((group, index) => {
    const primary = group.monthly ?? group.yearly ?? group.any;
    const monthlyPriceCents = group.monthly?.priceAmount ?? null;
    const yearlyPriceCents = group.yearly?.priceAmount ?? null;

    return {
      id: primary.id,
      name: group.name,
      slug: slugifyPlanName(group.name),
      description:
        primary.description?.trim() ||
        `${group.name} plan for ${primary.currencyCode || BILLING_RULES.currency} billing.`,
      billingInterval: primary.billingInterval,
      priceAmount: primary.priceAmount,
      currencyCode: primary.currencyCode || BILLING_RULES.currency,
      trialPeriodDays: primary.trialPeriodDays,
      stripePriceId: primary.stripePriceId,
      isActive: primary.isActive,
      isCustomPricing: primary.isCustomPricing,
      featured: index === 1 || groups.size === 1,
      includedLocations: limitValue(primary.featureLimits, [
        "max_locations",
        "locations",
        "included_locations",
      ]),
      teamMemberLimit: limitValue(primary.featureLimits, [
        "team_members",
        "max_team_members",
        "team_member_limit",
      ]),
      includedVoiceMinutes: limitValue(primary.featureLimits, [
        "included_calling_minutes",
        "included_voice_minutes",
        "voice_minutes",
      ]),
      contents: contentsForPlan(primary),
      monthlyPriceCents,
      yearlyPriceCents,
    } satisfies CatalogPlanView;
  });

  return grouped;
}

function toLandingPlan(plan: CatalogPlanView): LandingPlan {
  const monthly =
    plan.monthlyPriceCents ??
    (plan.billingInterval.toLowerCase().includes("year") ? 0 : plan.priceAmount);
  const yearly =
    plan.yearlyPriceCents ??
    (plan.billingInterval.toLowerCase().includes("year") ? plan.priceAmount : 0);

  return {
    slug: plan.slug,
    title: plan.name,
    description: plan.description,
    price: formatUsd(monthly || plan.priceAmount),
    period: "/mo",
    yearlyPrice: formatUsd(yearly || monthly * 12 || plan.priceAmount),
    yearlyMonthlyPrice: formatUsd(
      yearly ? Math.round(yearly / 12) : monthly || plan.priceAmount,
    ),
    trialDays: plan.trialPeriodDays || BILLING_RULES.trialDays,
    includedLocations: plan.includedLocations,
    teamMemberLimit: plan.teamMemberLimit,
    includedVoiceMinutes: plan.includedVoiceMinutes,
    items: plan.contents,
    featured: plan.featured,
  };
}

export async function getBillingCatalogPlans(): Promise<BillingCatalogResult> {
  if (!isBillingConfigured()) {
    return { plans: [], error: "not_configured" };
  }

  try {
    const catalog = await getAgentBillingCatalog();
    if (!catalog) {
      return { plans: [], error: "product_missing" };
    }
    if (catalog.plans.length === 0) {
      return {
        plans: [],
        productName: catalog.product.name,
        productDisplayName: catalog.product.displayName,
        error: "empty",
      };
    }

    return {
      plans: groupRemotePlans(catalog.plans),
      productName: catalog.product.name,
      productDisplayName: catalog.product.displayName,
      error: null,
    };
  } catch {
    return { plans: [], error: "unavailable" };
  }
}

export async function getPublicLandingPlans(): Promise<LandingPlan[]> {
  const { plans } = await getBillingCatalogPlans();
  return plans.map(toLandingPlan);
}

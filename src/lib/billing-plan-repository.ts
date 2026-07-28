import "server-only";

import type { LandingPlan } from "@/lib/landing-data";
import {
  getAgentBillingCatalog,
  getBillingPlanDetail,
  isBillingConfigured,
  listBillingModules,
  type BillingModule,
  type BillingPlanModule,
  type BillingRemotePlan,
} from "@/lib/billing-client";
import { BILLING_RULES, formatUsd, PLAN_SLUGS, type PlanSlug } from "@/lib/pricing-plans";
import type { BillingCatalogError } from "@/lib/billing-catalog-types";

export type { BillingCatalogError } from "@/lib/billing-catalog-types";

const LANDING_PLAN_ORDER = PLAN_SLUGS;

function mapNameToPlanSlug(nameOrSlug: string): PlanSlug | null {
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

function planSortRank(slug: string, name: string): number {
  const mapped = mapNameToPlanSlug(slug) ?? mapNameToPlanSlug(name);
  if (!mapped) return 99;
  const index = LANDING_PLAN_ORDER.indexOf(mapped);
  return index === -1 ? 99 : index;
}

function withCanonicalOrderAndFeatured(plans: CatalogPlanView[]): CatalogPlanView[] {
  return [...plans]
    .map((plan) => {
      const mapped = mapNameToPlanSlug(plan.slug) ?? mapNameToPlanSlug(plan.name);
      return {
        ...plan,
        featured: mapped === "growth",
      };
    })
    .sort((a, b) => {
      const rank = planSortRank(a.slug, a.name) - planSortRank(b.slug, b.name);
      if (rank !== 0) return rank;
      return a.name.localeCompare(b.name);
    });
}

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
  monthlyPlanId: string | null;
  yearlyPlanId: string | null;
  modules: BillingPlanModule[];
};

export type BillingCatalogResult = {
  plans: CatalogPlanView[];
  productId?: string;
  productName?: string;
  productDisplayName?: string;
  productModules: BillingModule[];
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

function contentsFromModules(modules: BillingPlanModule[]): string[] {
  return modules.map((module) => {
    const unlimited = module.featureLimits.some((limit) => limit.isUnlimited);
    if (unlimited) return module.displayName;
    const first = module.featureLimits[0];
    if (!first) return module.displayName;
    return `${module.displayName}: ${first.limitValue}${first.unit ? ` ${first.unit}` : ""}`;
  });
}

function contentsForPlan(plan: BillingRemotePlan, modules: BillingPlanModule[]): string[] {
  const fromModules = contentsFromModules(modules);
  if (fromModules.length) return fromModules;
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

function mergeModules(lists: BillingPlanModule[][]): BillingPlanModule[] {
  const byKey = new Map<string, BillingPlanModule>();
  for (const list of lists) {
    for (const billingModule of list) {
      if (!byKey.has(billingModule.key)) byKey.set(billingModule.key, billingModule);
    }
  }
  return Array.from(byKey.values());
}

async function loadPlanModules(
  planIds: Array<string | null | undefined>,
): Promise<Map<string, BillingPlanModule[]>> {
  const unique = [...new Set(planIds.filter((id): id is string => Boolean(id)))];
  const entries = await Promise.all(
    unique.map(async (planId) => {
      try {
        const detail = await getBillingPlanDetail(planId);
        return [planId, detail.modules] as const;
      } catch {
        return [planId, [] as BillingPlanModule[]] as const;
      }
    }),
  );
  return new Map(entries);
}

function groupRemotePlans(
  plans: BillingRemotePlan[],
  modulesByPlanId: Map<string, BillingPlanModule[]>,
): CatalogPlanView[] {
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

  const grouped = Array.from(groups.values()).map((group) => {
    const primary = group.monthly ?? group.yearly ?? group.any;
    const monthlyPriceCents = group.monthly?.priceAmount ?? null;
    const yearlyPriceCents = group.yearly?.priceAmount ?? null;
    const modules = mergeModules([
      group.monthly ? (modulesByPlanId.get(group.monthly.id) ?? []) : [],
      group.yearly ? (modulesByPlanId.get(group.yearly.id) ?? []) : [],
    ]);

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
      featured: false,
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
      contents: contentsForPlan(primary, modules),
      monthlyPriceCents,
      yearlyPriceCents,
      monthlyPlanId: group.monthly?.id ?? null,
      yearlyPlanId: group.yearly?.id ?? null,
      modules,
    } satisfies CatalogPlanView;
  });

  return withCanonicalOrderAndFeatured(grouped);
}

function toLandingPlan(plan: CatalogPlanView): LandingPlan {
  const monthly =
    plan.monthlyPriceCents ??
    (plan.billingInterval.toLowerCase().includes("year") ? 0 : plan.priceAmount);
  const yearlyRaw =
    plan.yearlyPriceCents ??
    (plan.billingInterval.toLowerCase().includes("year") ? plan.priceAmount : 0);

  // Yearly `priceAmount` may be either the prepaid annual total or the per-month
  // amount when billed yearly. Treat values ~8×+ monthly as annual totals.
  const yearlyIsAnnualTotal = monthly > 0 && yearlyRaw >= monthly * 8;
  const yearlyMonthlyCents = yearlyRaw
    ? yearlyIsAnnualTotal
      ? Math.round(yearlyRaw / 12)
      : yearlyRaw
    : monthly || plan.priceAmount;
  const yearlyTotalCents = yearlyRaw
    ? yearlyIsAnnualTotal
      ? yearlyRaw
      : yearlyRaw * 12
    : (monthly || plan.priceAmount) * 12;

  return {
    slug: plan.slug,
    title: plan.name,
    description: plan.description,
    price: formatUsd(monthly || plan.priceAmount),
    period: "/mo",
    yearlyPrice: formatUsd(yearlyTotalCents),
    yearlyMonthlyPrice: formatUsd(yearlyMonthlyCents),
    trialDays: plan.trialPeriodDays || BILLING_RULES.trialDays,
    includedLocations: plan.includedLocations,
    teamMemberLimit: plan.teamMemberLimit,
    includedVoiceMinutes: plan.includedVoiceMinutes,
    items: plan.contents,
    featured: plan.featured,
  };
}

function catalogFromPlanModules(
  productId: string,
  modulesByPlanId: Map<string, BillingPlanModule[]>,
): BillingModule[] {
  const byId = new Map<string, BillingModule>();
  for (const modules of modulesByPlanId.values()) {
    for (const billingModule of modules) {
      if (byId.has(billingModule.id)) continue;
      byId.set(billingModule.id, {
        id: billingModule.id,
        productId,
        key: billingModule.key,
        displayName: billingModule.displayName,
        description: null,
        isActive: billingModule.isActive,
        createdAt: null,
        updatedAt: null,
      });
    }
  }
  return Array.from(byId.values());
}

export async function getBillingCatalogPlans(): Promise<BillingCatalogResult> {
  if (!isBillingConfigured()) {
    return { plans: [], productModules: [], error: "not_configured" };
  }

  try {
    const catalog = await getAgentBillingCatalog();
    if (!catalog) {
      return { plans: [], productModules: [], error: "product_missing" };
    }
    if (catalog.plans.length === 0) {
      return {
        plans: [],
        productId: catalog.product.id,
        productName: catalog.product.name,
        productDisplayName: catalog.product.displayName,
        productModules: [],
        error: "empty",
      };
    }

    const modulesByPlanId = await loadPlanModules(catalog.plans.map((plan) => plan.id));
    let productModules: BillingModule[] = [];
    try {
      productModules = await listBillingModules(catalog.product.id);
    } catch {
      productModules = [];
    }

    // If the product catalog endpoint flakes (common 503), fall back to the
    // unique modules already attached across plans so Manage modules still works.
    if (productModules.length === 0) {
      productModules = catalogFromPlanModules(catalog.product.id, modulesByPlanId);
    }

    const sortedProductModules = [...productModules].sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (aTime || bTime) return bTime - aTime;
      return a.displayName.localeCompare(b.displayName);
    });

    return {
      plans: groupRemotePlans(catalog.plans, modulesByPlanId),
      productId: catalog.product.id,
      productName: catalog.product.name,
      productDisplayName: catalog.product.displayName,
      productModules: sortedProductModules,
      error: null,
    };
  } catch {
    return { plans: [], productModules: [], error: "unavailable" };
  }
}

export async function getPublicLandingPlans(): Promise<LandingPlan[]> {
  const { plans } = await getBillingCatalogPlans();
  return plans.map(toLandingPlan);
}

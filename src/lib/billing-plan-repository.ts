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
  monthlyStripePriceId: string | null;
  yearlyStripePriceId: string | null;
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
): number | null {
  if (!limits?.length) return null;
  for (const key of keys) {
    const hit = limits.find((item) => item.key === key);
    if (typeof hit?.value === "number" && Number.isFinite(hit.value)) return hit.value;
  }
  return null;
}

const LOCATION_LIMIT_KEYS = ["max_locations", "locations", "included_locations"];
const TEAM_LIMIT_KEYS = ["team_members", "max_team_members", "team_member_limit"];
const VOICE_LIMIT_KEYS = [
  "included_calling_minutes",
  "included_voice_minutes",
  "voice_minutes",
];

function moduleLimitValue(
  modules: BillingPlanModule[],
  keys: string[],
): number | null {
  for (const billingModule of modules) {
    if (keys.includes(billingModule.key)) {
      const limit = billingModule.featureLimits[0];
      if (!limit) continue;
      if (limit.isUnlimited) return Number.POSITIVE_INFINITY;
      if (Number.isFinite(limit.limitValue)) return limit.limitValue;
    }
    for (const limit of billingModule.featureLimits) {
      if (!keys.includes(limit.featureKey)) continue;
      if (limit.isUnlimited) return Number.POSITIVE_INFINITY;
      if (Number.isFinite(limit.limitValue)) return limit.limitValue;
    }
  }
  return null;
}

function resolvePlanLimit(
  planLimits: BillingRemotePlan["featureLimits"],
  modules: BillingPlanModule[],
  keys: string[],
): number {
  const fromPlan = limitValue(planLimits, keys);
  if (fromPlan != null) return fromPlan;
  const fromModules = moduleLimitValue(modules, keys);
  if (fromModules != null && Number.isFinite(fromModules)) return fromModules;
  if (fromModules != null) return fromModules;
  return 0;
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

function isYearlyInterval(interval: string): boolean {
  const value = interval.trim().toLowerCase();
  return /year|annual/.test(value);
}

/** Strip trailing interval words so "Pro Voice Yearly" pairs with "Pro Voice". */
function commercialPlanNameKey(name: string): string {
  return name
    .trim()
    .replace(/[\s_\-]*[\-(]?\s*(monthly|yearly|annual|annually|year)\s*[)]?\s*$/i, "")
    .trim()
    .toLowerCase();
}

type RemotePlanGroup = {
  name: string;
  monthly?: BillingRemotePlan;
  yearly?: BillingRemotePlan;
  any: BillingRemotePlan;
};

function assignPlanToGroup(group: RemotePlanGroup, plan: BillingRemotePlan): void {
  if (isYearlyInterval(plan.billingInterval)) {
    group.yearly = plan;
  } else if (!group.monthly) {
    group.monthly = plan;
  } else if (!group.yearly && group.monthly.id !== plan.id) {
    // Same commercial name with a second interval the API did not mark as yearly.
    group.yearly = plan;
  } else {
    group.monthly = plan;
  }
  group.any = group.monthly ?? group.yearly ?? plan;
}

function groupRemotePlans(
  plans: BillingRemotePlan[],
  modulesByPlanId: Map<string, BillingPlanModule[]>,
): CatalogPlanView[] {
  const groups = new Map<string, RemotePlanGroup>();

  for (const plan of plans) {
    const key = commercialPlanNameKey(plan.name) || plan.name.trim().toLowerCase();
    const existing = groups.get(key) ?? { name: plan.name, any: plan };
    assignPlanToGroup(existing, plan);
    if (!isYearlyInterval(plan.billingInterval)) {
      existing.name = plan.name;
    }
    groups.set(key, existing);
  }

  // Pair leftover monthly-only / yearly-only groups that share a canonical slug
  // (e.g. "Pro Voice" monthly + "Enterprise" yearly after a rename).
  const keyed = Array.from(groups.entries());
  const absorbed = new Set<string>();
  for (const [yearlyKey, yearlyGroup] of keyed) {
    if (yearlyGroup.monthly || !yearlyGroup.yearly || absorbed.has(yearlyKey)) continue;
    const yearlySlug =
      mapNameToPlanSlug(yearlyGroup.name) ?? mapNameToPlanSlug(yearlyGroup.yearly.name);
    if (!yearlySlug) continue;
    for (const [monthlyKey, monthlyGroup] of keyed) {
      if (monthlyKey === yearlyKey || absorbed.has(monthlyKey)) continue;
      if (!monthlyGroup.monthly || monthlyGroup.yearly) continue;
      const monthlySlug =
        mapNameToPlanSlug(monthlyGroup.name) ?? mapNameToPlanSlug(monthlyGroup.monthly.name);
      if (monthlySlug !== yearlySlug) continue;
      monthlyGroup.yearly = yearlyGroup.yearly;
      monthlyGroup.any = monthlyGroup.monthly ?? yearlyGroup.yearly;
      absorbed.add(yearlyKey);
      groups.delete(yearlyKey);
      break;
    }
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
      includedLocations: resolvePlanLimit(primary.featureLimits, modules, LOCATION_LIMIT_KEYS),
      teamMemberLimit: resolvePlanLimit(primary.featureLimits, modules, TEAM_LIMIT_KEYS),
      includedVoiceMinutes: resolvePlanLimit(primary.featureLimits, modules, VOICE_LIMIT_KEYS),
      contents: contentsForPlan(primary, modules),
      monthlyPriceCents,
      yearlyPriceCents,
      monthlyPlanId: group.monthly?.id ?? null,
      yearlyPlanId: group.yearly?.id ?? null,
      monthlyStripePriceId: group.monthly?.stripePriceId ?? null,
      yearlyStripePriceId: group.yearly?.stripePriceId ?? null,
      modules,
    } satisfies CatalogPlanView;
  });

  return withCanonicalOrderAndFeatured(grouped);
}

function listedPrice(
  cents: number | null,
  isCustomPricing: boolean,
): string | null {
  if (isCustomPricing && (cents === null || cents === 0)) return "Custom";
  if (cents === null) return null;
  return formatUsd(cents);
}

function toLandingPlan(plan: CatalogPlanView): LandingPlan {
  const monthlyCents = plan.monthlyPriceCents;
  const yearlyTotalCents = plan.yearlyPriceCents;
  const yearlyMonthlyCents =
    yearlyTotalCents != null ? Math.round(yearlyTotalCents / 12) : null;

  return {
    slug: plan.slug,
    title: plan.name,
    description: plan.description,
    price: listedPrice(monthlyCents, plan.isCustomPricing),
    period: "/mo",
    yearlyPrice: listedPrice(yearlyTotalCents, plan.isCustomPricing),
    yearlyMonthlyPrice:
      yearlyMonthlyCents != null && !plan.isCustomPricing
        ? formatUsd(yearlyMonthlyCents)
        : null,
    isCustomPricing: plan.isCustomPricing,
    trialDays: plan.trialPeriodDays || BILLING_RULES.trialDays,
    includedLocations: plan.includedLocations,
    teamMemberLimit: plan.teamMemberLimit,
    includedVoiceMinutes: plan.includedVoiceMinutes,
    items: plan.contents,
    excludedItems: [],
    featured: plan.featured,
  };
}

/** Higher tiers lead with “Everything in {previous}”; lower tiers list higher-tier-only modules as excluded. */
function withTieredIncludes(plans: CatalogPlanView[]): LandingPlan[] {
  const keysByPlan = plans.map(
    (plan) => new Set(plan.modules.map((module) => module.key)),
  );

  return plans.map((plan, index) => {
    const landing = toLandingPlan(plan);
    const currentKeys = keysByPlan[index] ?? new Set<string>();
    const previous = index > 0 ? plans[index - 1] : null;

    if (previous) {
      const extras = contentsFromModules(
        plan.modules.filter((module) => !keysByPlan[index - 1]!.has(module.key)),
      );
      landing.items = [`Everything in ${previous.name}`, ...extras];
    }

    const excludedByKey = new Map<string, string>();
    for (let higher = index + 1; higher < plans.length; higher += 1) {
      for (const billingModule of plans[higher]!.modules) {
        if (currentKeys.has(billingModule.key) || excludedByKey.has(billingModule.key)) {
          continue;
        }
        excludedByKey.set(billingModule.key, billingModule.displayName);
      }
    }
    landing.excludedItems = Array.from(excludedByKey.values());

    return landing;
  });
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

let billingCatalogCache: { expiresAt: number; data: BillingCatalogResult } | null = null;
let billingCatalogInFlight: Promise<BillingCatalogResult> | null = null;

export function clearBillingCatalogCache(): void {
  billingCatalogCache = null;
}

export async function getBillingCatalogPlans(options?: {
  includeInactive?: boolean;
}): Promise<BillingCatalogResult> {
  if (!isBillingConfigured()) {
    return { plans: [], productModules: [], error: "not_configured" };
  }

  const now = Date.now();
  if (!options?.includeInactive && billingCatalogCache && billingCatalogCache.expiresAt > now) {
    return billingCatalogCache.data;
  }

  if (!options?.includeInactive && billingCatalogInFlight) {
    return billingCatalogInFlight;
  }

  const computeCatalog = (async (): Promise<BillingCatalogResult> => {
    try {
      const catalog = await getAgentBillingCatalog({
        includeInactive: options?.includeInactive,
      });
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

      const result: BillingCatalogResult = {
        plans: groupRemotePlans(catalog.plans, modulesByPlanId),
        productId: catalog.product.id,
        productName: catalog.product.name,
        productDisplayName: catalog.product.displayName,
        productModules: sortedProductModules,
        error: null,
      };

      if (!options?.includeInactive && !result.error) {
        billingCatalogCache = {
          expiresAt: Date.now() + 60_000, // 60-second TTL
          data: result,
        };
      }

      return result;
    } catch {
      return { plans: [], productModules: [], error: "unavailable" };
    } finally {
      billingCatalogInFlight = null;
    }
  })();

  if (!options?.includeInactive) {
    billingCatalogInFlight = computeCatalog;
  }

  return computeCatalog;
}

export async function getPublicLandingPlans(): Promise<LandingPlan[]> {
  const { plans } = await getBillingCatalogPlans();
  return withTieredIncludes(plans);
}

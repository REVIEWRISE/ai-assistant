import "server-only";

import { prisma } from "@/lib/prisma";
import type { LandingPlan } from "@/lib/landing-data";
import { BILLING_RULES, PRICING_PLANS, formatUsd } from "@/lib/pricing-plans";

function fallbackLandingPlans(): LandingPlan[] {
  return PRICING_PLANS.map((plan) => ({
    slug: plan.slug,
    title: plan.name,
    description: plan.positioning,
    price: formatUsd(plan.monthlyPriceCents),
    period: "/mo",
    yearlyPrice: formatUsd(plan.yearlyPriceCents),
    yearlyMonthlyPrice: formatUsd(Math.round(plan.yearlyPriceCents / 12)),
    trialDays: BILLING_RULES.trialDays,
    includedLocations: plan.includedLocations,
    teamMemberLimit: plan.teamMemberLimit,
    includedVoiceMinutes: plan.includedVoiceMinutes,
    items: [...plan.highlights],
    featured: plan.featured,
  }));
}

export async function getPublicLandingPlans(): Promise<LandingPlan[]> {
  try {
    const plans = await prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        slug: true,
        name: true,
        positioning: true,
        monthlyPriceCents: true,
        yearlyPriceCents: true,
        trialDays: true,
        includedLocations: true,
        teamMemberLimit: true,
        includedVoiceMinutes: true,
        highlights: true,
        featured: true,
      },
    });

    if (plans.length === 0) return fallbackLandingPlans();

    return plans.map((plan) => ({
      slug: plan.slug,
      title: plan.name,
      description: plan.positioning,
      price: formatUsd(plan.monthlyPriceCents),
      period: "/mo",
      yearlyPrice: formatUsd(plan.yearlyPriceCents),
      yearlyMonthlyPrice: formatUsd(Math.round(plan.yearlyPriceCents / 12)),
      trialDays: plan.trialDays,
      includedLocations: plan.includedLocations,
      teamMemberLimit: plan.teamMemberLimit,
      includedVoiceMinutes: plan.includedVoiceMinutes,
      items: Array.isArray(plan.highlights)
        ? plan.highlights.map((item) => String(item)).filter(Boolean)
        : [],
      featured: plan.featured,
    }));
  } catch {
    // Deployments can serve the built-in catalog while the new table is being migrated.
    return fallbackLandingPlans();
  }
}

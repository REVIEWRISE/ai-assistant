import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import {
  BILLING_RULES,
  PRICING_PLANS,
  getPlanEntitlementRecord,
} from "../src/lib/pricing-plans";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function main() {
  for (const [sortOrder, plan] of PRICING_PLANS.entries()) {
    await prisma.billingPlan.upsert({
      where: { slug: plan.slug },
      create: {
        slug: plan.slug,
        name: plan.name,
        positioning: plan.positioning,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        currency: BILLING_RULES.currency,
        trialDays: BILLING_RULES.trialDays,
        includedLocations: plan.includedLocations,
        teamMemberLimit: plan.teamMemberLimit,
        includedVoiceMinutes: plan.includedVoiceMinutes,
        highlights: plan.highlights,
        entitlements: getPlanEntitlementRecord(plan.slug),
        featured: plan.featured,
        isActive: true,
        sortOrder,
      },
      update: {},
    });
  }

  console.log(`[billing seed] Plans ready: ${PRICING_PLANS.length}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });

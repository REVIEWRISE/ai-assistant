import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { PlatformNav } from "@/components/platform-nav";
import {
  BillingPlansManager,
  type ManagedBillingPlan,
} from "@/components/billing-plans-manager";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { BILLING_RULES } from "@/lib/pricing-plans";
import { createBillingPlan, deleteBillingPlan, updateBillingPlan } from "./actions";

const MESSAGES: Record<string, string> = {
  created: "Payment plan created.",
  updated: "Payment plan updated.",
  deleted: "Payment plan deleted.",
};

const ERRORS: Record<string, string> = {
  invalid: "Check the plan fields and prices, then try again.",
  duplicate: "A plan with that slug already exists.",
  create_failed: "The plan could not be created.",
  update_failed: "The plan could not be updated.",
  delete_failed: "The plan could not be deleted.",
};

export default async function BillingPlansPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  await requireAdminSession();
  const query = (await searchParams) ?? {};
  const rows = await prisma.billingPlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const plans: ManagedBillingPlan[] = rows.map((plan) => ({
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    positioning: plan.positioning,
    monthlyPriceCents: plan.monthlyPriceCents,
    yearlyPriceCents: plan.yearlyPriceCents,
    currency: plan.currency,
    trialDays: plan.trialDays,
    includedLocations: plan.includedLocations,
    teamMemberLimit: plan.teamMemberLimit,
    includedVoiceMinutes: plan.includedVoiceMinutes,
    highlights: Array.isArray(plan.highlights)
      ? plan.highlights.map((item) => String(item)).filter(Boolean)
      : [],
    entitlements:
      plan.entitlements && typeof plan.entitlements === "object" && !Array.isArray(plan.entitlements)
        ? (plan.entitlements as Record<string, unknown>)
        : {},
    stripeMonthlyPriceId: plan.stripeMonthlyPriceId,
    stripeYearlyPriceId: plan.stripeYearlyPriceId,
    featured: plan.featured,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  }));

  const activeCount = plans.filter((plan) => plan.isActive).length;
  const linkedPriceCount = plans.reduce(
    (count, plan) =>
      count + Number(Boolean(plan.stripeMonthlyPriceId)) + Number(Boolean(plan.stripeYearlyPriceId)),
    0,
  );

  return (
    <div className="mx-auto max-w-[92rem] space-y-4">
      <AppointmentPageHeader
        eyebrow="Platform Settings"
        title="Billing plans"
        description="Create, update, publish, and remove the plans shown to customers. Every mutation is restricted to the Admin role."
        status="Admin access only"
        statusTone="neutral"
        metrics={[
          { label: "Total plans", value: plans.length, hint: "commercial offers" },
          { label: "Active plans", value: activeCount, hint: "publicly available" },
          { label: "Stripe prices", value: linkedPriceCount, hint: "linked references" },
          { label: "Default trial", value: `${BILLING_RULES.trialDays} days`, hint: "platform rule" },
        ]}
      />
      <PlatformNav showBilling />

      {query.success && MESSAGES[query.success] ? (
        <div className="vr-app-alert vr-app-alert-success">{MESSAGES[query.success]}</div>
      ) : null}
      {query.error && ERRORS[query.error] ? (
        <div className="vr-app-alert vr-app-alert-danger">{ERRORS[query.error]}</div>
      ) : null}

      <BillingPlansManager
        plans={plans}
        onCreate={createBillingPlan}
        onUpdate={updateBillingPlan}
        onDelete={deleteBillingPlan}
      />

    </div>
  );
}

"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import {
  ensureBillingCustomerForOrganization,
  isBillingConfigured,
} from "@/lib/billing-client";
import {
  startOrgTrial,
  getOrgBilling,
  type BillingInterval,
} from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { PLAN_SLUGS, type PlanSlug } from "@/lib/pricing-plans";

function asPlanSlug(value: string): PlanSlug | null {
  return (PLAN_SLUGS as readonly string[]).includes(value) ? (value as PlanSlug) : null;
}

function asInterval(value: string): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function selectPlanAction(formData: FormData) {
  const session = await requireSession();
  const organizationId = session.activeOrganizationId;
  if (!organizationId) {
    redirect("/onboarding/plan?error=organization_required");
  }

  const planSlug = asPlanSlug(String(formData.get("plan_slug") || "").trim());
  const billingInterval = asInterval(String(formData.get("billing_interval") || "monthly"));

  if (!planSlug) {
    redirect("/onboarding/plan?error=plan_invalid");
  }

  await startOrgTrial({
    organizationId,
    planSlug,
    billingInterval,
  });

  // Ensure Billing customer exists before the trial ends / checkout starts.
  if (isBillingConfigured()) {
    const [org, user] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true },
      }),
    ]);
    if (org && user?.email) {
      try {
        await ensureBillingCustomerForOrganization({
          organizationId: org.id,
          organizationName: org.name,
          primaryEmail: user.email,
        });
      } catch (error) {
        console.error("[billing] failed to register customer on plan select", error);
      }
    }
  }

  const billing = await getOrgBilling(organizationId);
  if (billing?.billingStatus === "expired") {
    redirect("/billing/expired");
  }

  redirect("/dashboard?success=trial_started");
}

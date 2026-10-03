"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { createBillingCheckoutSession } from "@/app/(protected)/billing/actions";
import { isBillingConfigured } from "@/lib/billing-client";
import {
  startOrgTrial,
  getOrgBilling,
  type BillingInterval,
} from "@/lib/entitlements";
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

  const existing = await getOrgBilling(organizationId);
  if (existing?.billingStatus === "expired") {
    redirect("/billing/expired");
  }

  // When Billing Service is configured, redirect directly to Stripe Checkout with trial attached
  if (isBillingConfigured()) {
    const result = await createBillingCheckoutSession({
      planSlug,
      billingInterval,
    });

    if (result.ok) {
      if (result.alreadyActive) {
        redirect("/dashboard");
      }
      if (result.checkoutUrl) {
        redirect(result.checkoutUrl);
      }
    }

    const errorMessage = !result.ok ? result.error : "Unable to start checkout.";
    redirect(`/onboarding/plan?error=${encodeURIComponent(errorMessage)}`);
  }

  // Fallback for local development without Billing API keys configured
  await startOrgTrial({
    organizationId,
    planSlug,
    billingInterval,
  });

  redirect("/dashboard?success=trial_started");
}

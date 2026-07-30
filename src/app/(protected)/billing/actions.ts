"use server";

import { requireSession } from "@/lib/auth-session";
import {
  createBillingCheckout,
  ensureBillingCustomerForOrganization,
  isBillingConfigured,
} from "@/lib/billing-client";
import { resolveCheckoutPlan } from "@/lib/billing-checkout";
import { getOrgBilling, type BillingInterval } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { PLAN_SLUGS, type PlanSlug } from "@/lib/pricing-plans";
import { getAppUrl } from "@/lib/stripe";

export type CreateCheckoutSessionResult =
  | { ok: true; checkoutUrl: string; sessionId: string | null }
  | { ok: false; error: string };

function asPlanSlug(value: string): PlanSlug | null {
  return (PLAN_SLUGS as readonly string[]).includes(value) ? (value as PlanSlug) : null;
}

function asInterval(value: string): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function createBillingCheckoutSession(input: {
  planSlug: string;
  billingInterval: string;
}): Promise<CreateCheckoutSessionResult> {
  if (!isBillingConfigured()) {
    return {
      ok: false,
      error: "Billing is not configured yet. Ask a platform admin to set BILLING_API_KEY.",
    };
  }

  const session = await requireSession();
  const organizationId = session.activeOrganizationId;
  if (!organizationId) {
    return { ok: false, error: "Select a workspace before starting checkout." };
  }

  const planSlug = asPlanSlug(input.planSlug.trim());
  const billingInterval = asInterval(input.billingInterval.trim());
  if (!planSlug) {
    return { ok: false, error: "Choose a valid plan." };
  }

  const billing = await getOrgBilling(organizationId);
  if (!billing) {
    return { ok: false, error: "Workspace billing could not be loaded." };
  }

  const resolved = await resolveCheckoutPlan({ planSlug, billingInterval });
  if (!resolved) {
    return {
      ok: false,
      error: "This plan is not available for checkout yet. Contact support.",
    };
  }

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

  if (!org) {
    return { ok: false, error: "Workspace could not be loaded." };
  }

  const customerEmail = user?.email?.trim() || null;
  if (!customerEmail) {
    return { ok: false, error: "Add an email to your account before starting checkout." };
  }

  const appUrl = getAppUrl();

  try {
    const customerId = await ensureBillingCustomerForOrganization({
      organizationId: org.id,
      organizationName: org.name,
      primaryEmail: customerEmail,
    });

    const checkout = await createBillingCheckout({
      customerId,
      planId: resolved.planId,
      successUrl: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/billing/canceled`,
      customerEmail,
    });

    return {
      ok: true,
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed.";
    const unknownField = message.match(/Unknown field `[^`]+`[^\n]*/)?.[0];
    const billingApi = message.match(/Billing API error[^\n]*/)?.[0];
    const short =
      unknownField ??
      billingApi ??
      message
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean) ??
      message;
    return { ok: false, error: short };
  }
}

export async function getBillingStatusForActiveOrg(): Promise<{
  billingStatus: string | null;
  paidAt: string | null;
}> {
  const session = await requireSession();
  const organizationId = session.activeOrganizationId;
  if (!organizationId) {
    return { billingStatus: null, paidAt: null };
  }
  const billing = await getOrgBilling(organizationId);
  return {
    billingStatus: billing?.billingStatus ?? null,
    paidAt: billing?.paidAt?.toISOString() ?? null,
  };
}

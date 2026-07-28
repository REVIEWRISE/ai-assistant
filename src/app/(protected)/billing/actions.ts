"use server";

import { requireSession } from "@/lib/auth-session";
import { resolveCheckoutPlan } from "@/lib/billing-checkout";
import { getOrgBilling, type BillingInterval } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { PLAN_SLUGS, type PlanSlug } from "@/lib/pricing-plans";
import { getAppUrl, getStripe, isStripeConfigured } from "@/lib/stripe";

export type CreateCheckoutSessionResult =
  | { ok: true; clientSecret: string }
  | { ok: false; error: string };

function asPlanSlug(value: string): PlanSlug | null {
  return (PLAN_SLUGS as readonly string[]).includes(value) ? (value as PlanSlug) : null;
}

function asInterval(value: string): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function createEmbeddedCheckoutSession(input: {
  planSlug: string;
  billingInterval: string;
}): Promise<CreateCheckoutSessionResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: "Stripe is not configured yet. Ask a platform admin to enable checkout.",
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
      error:
        "This plan is not available for checkout yet (missing Stripe price). Contact support.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded_page",
      payment_method_types: ["card"],
      ...(user?.email ? { customer_email: user.email } : {}),
      line_items: [{ price: resolved.stripePriceId, quantity: 1 }],
      return_url: `${getAppUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      client_reference_id: organizationId,
      metadata: {
        organizationId,
        productId: resolved.productId,
        planId: resolved.planId,
        planSlug: resolved.planSlug,
        billingInterval: resolved.billingInterval,
      },
      subscription_data: {
        metadata: {
          organizationId,
          productId: resolved.productId,
          planId: resolved.planId,
          planSlug: resolved.planSlug,
          billingInterval: resolved.billingInterval,
        },
      },
    });

    if (!checkoutSession.client_secret) {
      return { ok: false, error: "Checkout session was created without a client secret." };
    }

    return { ok: true, clientSecret: checkoutSession.client_secret };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed.";
    return { ok: false, error: message };
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

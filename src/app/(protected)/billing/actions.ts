"use server";

import { requireSession } from "@/lib/auth-session";
import {
  clearCheckoutPendingSubscriptions,
  createBillingCheckout,
  ensureBillingCustomerForOrganization,
  isBillingConfigured,
  resolveBillingProduct,
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

function isCheckoutPendingConflict(message: string): boolean {
  return /409/i.test(message) && /checkout_pending/i.test(message);
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
      select: { email: true, fullName: true },
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
      customerName: user?.fullName?.trim() || customerEmail,
      primaryEmail: customerEmail,
    });

    const checkoutInput = {
      customerId,
      planId: resolved.planId,
      successUrl: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/billing/canceled`,
      customerEmail,
    };

    try {
      const checkout = await createBillingCheckout(checkoutInput);
      return {
        ok: true,
        checkoutUrl: checkout.checkoutUrl,
        sessionId: checkout.sessionId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!isCheckoutPendingConflict(message)) throw error;

      // Abandoned Stripe checkout left a checkout_pending sub — clear it and retry once.
      const product = await resolveBillingProduct().catch(() => null);
      const cleared = await clearCheckoutPendingSubscriptions({
        customerId,
        productId: product?.id ?? null,
      });
      if (process.env.NODE_ENV !== "production") {
        console.info("[billing/checkout] cleared checkout_pending subscriptions", {
          customerId,
          cleared,
        });
      }
      if (cleared === 0) {
        return {
          ok: false,
          error:
            "A previous checkout is still open for this workspace. Finish or cancel it in Stripe, then try again.",
        };
      }

      const checkout = await createBillingCheckout(checkoutInput);
      return {
        ok: true,
        checkoutUrl: checkout.checkoutUrl,
        sessionId: checkout.sessionId,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed.";
    if (process.env.NODE_ENV !== "production") {
      console.error("[billing/checkout]", message);
    }

    if (isCheckoutPendingConflict(message)) {
      return {
        ok: false,
        error:
          "A previous checkout is still open for this workspace. Finish or cancel it, then try again.",
      };
    }
    if (/not configured|BILLING_API_KEY/i.test(message)) {
      return {
        ok: false,
        error: "Billing is not configured yet. Ask a platform admin to finish setup.",
      };
    }
    if (/422|validation|required/i.test(message)) {
      return {
        ok: false,
        error: "Checkout could not be started with the selected plan. Try again or contact support.",
      };
    }
    if (/401|403|unauthorized|forbidden/i.test(message)) {
      return {
        ok: false,
        error: "Billing authentication failed. Ask a platform admin to check the API key.",
      };
    }
    if (/429|rate/i.test(message)) {
      return {
        ok: false,
        error: "Billing is busy right now. Please wait a moment and try again.",
      };
    }
    if (/5\d\d|unavailable|network|fetch failed/i.test(message)) {
      return {
        ok: false,
        error: "Checkout is temporarily unavailable. Please try again in a few minutes.",
      };
    }

    return {
      ok: false,
      error: "Unable to start checkout. Please try again or contact support.",
    };
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

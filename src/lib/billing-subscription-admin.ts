import "server-only";

import { prisma } from "@/lib/prisma";
import {
  billingApiErrorDetail,
  changeBillingSubscriptionPlan,
  clearCheckoutPendingSubscriptions,
  createBillingCheckout,
  ensureBillingCustomerForOrganization,
  findBillingPlanForInterval,
  getOrganizationBillingCustomerId,
  isBillingConfigured,
  listBillingSubscriptions,
  pauseBillingSubscription,
  resolveBillingProduct,
  resumeBillingSubscription,
  suspendBillingCustomer,
  type BillingPlanChangeKind,
} from "@/lib/billing-client";
import { resolveCheckoutPlan } from "@/lib/billing-checkout";
import {
  asBillingStatus,
  clearOrgCancelAtPeriodEnd,
  markOrgUnpaid,
  type BillingInterval,
} from "@/lib/entitlements";
import { getPlanBySlug, isPlanSlug, type PlanSlug } from "@/lib/pricing-plans";
import { getAppUrl } from "@/lib/stripe";

export type BillingAdminSyncResult =
  | { ok: true; billingSynced: boolean; localOnly: boolean }
  | { ok: false; error: string };

export type BillingAdminResumeResult =
  | {
      ok: true;
      mode: "resumed";
      billingSynced: boolean;
      localOnly: boolean;
      checkoutUrl?: undefined;
    }
  | {
      ok: true;
      mode: "checkout";
      billingSynced: false;
      localOnly: false;
      checkoutUrl: string;
      sessionId: string | null;
    }
  | { ok: false; error: string };

export type BillingAdminPlanChangeResult =
  | {
      ok: true;
      billingSynced: true;
      change: BillingPlanChangeKind;
      effectiveAt: string | null;
      pendingPlanId: string | null;
    }
  | { ok: true; billingSynced: false; change: null; effectiveAt: null; pendingPlanId: null }
  | { ok: false; error: string };

async function liveSubscriptionsForOrganization(
  organizationId: string,
  statuses: string[] = ["active", "trialing", "past_due"],
) {
  const customerId = await getOrganizationBillingCustomerId(organizationId);
  if (!customerId) return { customerId: null, matches: [] as Awaited<ReturnType<typeof listBillingSubscriptions>> };

  const product = await resolveBillingProduct().catch(() => null);
  let subs = await listBillingSubscriptions({
    status: statuses,
    customerId,
    limit: 50,
  });
  if (subs.length === 0) {
    subs = (
      await listBillingSubscriptions({
        status: statuses,
        limit: 50,
      })
    ).filter((sub) => sub.customerId === customerId);
  }

  const productMatches = subs.filter(
    (sub) => !product?.id || !sub.productId || sub.productId === product.id,
  );
  return { customerId, matches: productMatches.length > 0 ? productMatches : subs };
}

async function ownerEmailForOrganization(organizationId: string): Promise<{
  email: string;
  fullName: string;
} | null> {
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId, role: "owner" },
    select: {
      user: { select: { email: true, fullName: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const user = owner?.user;
  const email = user?.email?.trim();
  if (!email || !user) return null;
  return {
    email,
    fullName: user.fullName?.trim() || email,
  };
}

/**
 * Start Stripe checkout for the workspace's current plan (re-subscribe / resume payment).
 */
export async function startCheckoutForOrganizationCurrentPlan(
  organizationId: string,
): Promise<
  | { ok: true; checkoutUrl: string; sessionId: string | null; planSlug: PlanSlug; billingInterval: BillingInterval }
  | { ok: false; error: string }
> {
  if (!isBillingConfigured()) {
    return { ok: false, error: "Billing is not configured." };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, planSlug: true, billingInterval: true },
  });
  if (!org) return { ok: false, error: "Workspace not found." };
  if (!isPlanSlug(org.planSlug)) {
    return { ok: false, error: "Choose a plan before starting checkout." };
  }

  const billingInterval: BillingInterval =
    org.billingInterval === "yearly" || org.billingInterval === "monthly"
      ? org.billingInterval
      : "monthly";

  const resolved = await resolveCheckoutPlan({
    planSlug: org.planSlug,
    billingInterval,
  });
  if (!resolved) {
    return {
      ok: false,
      error: "This plan is not available for self-serve checkout.",
    };
  }

  const owner = await ownerEmailForOrganization(organizationId);
  if (!owner) {
    return { ok: false, error: "Workspace needs an owner email before checkout." };
  }

  try {
    const customerId = await ensureBillingCustomerForOrganization({
      organizationId: org.id,
      customerName: owner.fullName,
      primaryEmail: owner.email,
    });

    const appUrl = getAppUrl();
    const checkoutInput = {
      customerId,
      planId: resolved.planId,
      successUrl: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/billing/canceled`,
      customerEmail: owner.email,
    };

    try {
      const checkout = await createBillingCheckout(checkoutInput);
      return {
        ok: true,
        checkoutUrl: checkout.checkoutUrl,
        sessionId: checkout.sessionId,
        planSlug: org.planSlug,
        billingInterval: resolved.billingInterval,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/409/i.test(message) || !/checkout_pending/i.test(message)) {
        return { ok: false, error: billingApiErrorDetail(error) };
      }

      const product = await resolveBillingProduct().catch(() => null);
      await clearCheckoutPendingSubscriptions({
        customerId,
        productId: product?.id ?? null,
      });
      const checkout = await createBillingCheckout(checkoutInput);
      return {
        ok: true,
        checkoutUrl: checkout.checkoutUrl,
        sessionId: checkout.sessionId,
        planSlug: org.planSlug,
        billingInterval: resolved.billingInterval,
      };
    }
  } catch (error) {
    return { ok: false, error: billingApiErrorDetail(error) };
  }
}

/**
 * Resume a live Billing subscription in place when possible (cancel-at-period-end / paused).
 * Otherwise start checkout for the current plan so payment can restore access.
 */
export async function resumeOrganizationBillingSubscription(
  organizationId: string,
): Promise<BillingAdminResumeResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      planSlug: true,
      billingStatus: true,
      billingInterval: true,
      cancelAtPeriodEnd: true,
    },
  });
  if (!org) return { ok: false, error: "Workspace not found." };

  if (!isBillingConfigured()) {
    return { ok: false, error: "Billing is not configured." };
  }

  const status = asBillingStatus(org.billingStatus);
  const { matches: resumable } = await liveSubscriptionsForOrganization(organizationId, [
    "active",
    "trialing",
    "past_due",
    "paused",
  ]);

  const canResumeInPlace =
    resumable.length > 0 &&
    (org.cancelAtPeriodEnd ||
      resumable.some((sub) => sub.status === "paused" || sub.cancelAtPeriodEnd) ||
      (status !== "expired" && status !== "needs_plan"));

  if (canResumeInPlace && status !== "expired") {
    try {
      let billingSynced = false;
      for (const sub of resumable) {
        await resumeBillingSubscription(sub.id);
        billingSynced = true;
      }
      await clearOrgCancelAtPeriodEnd(organizationId);
      await prisma.organization.update({
        where: { id: organizationId },
        data: { billingAdminOverride: !billingSynced },
      });
      return {
        ok: true,
        mode: "resumed",
        billingSynced,
        localOnly: !billingSynced,
      };
    } catch (error) {
      return { ok: false, error: billingApiErrorDetail(error) };
    }
  }

  // Expired / no in-place resume → checkout for the current plan.
  const checkout = await startCheckoutForOrganizationCurrentPlan(organizationId);
  if (!checkout.ok) return checkout;

  return {
    ok: true,
    mode: "checkout",
    billingSynced: false,
    localOnly: false,
    checkoutUrl: checkout.checkoutUrl,
    sessionId: checkout.sessionId,
  };
}

/**
 * Change plan via PATCH /billing/admin/subscriptions/:id/change-plan.
 * Returns change kind so callers can apply upgrades now and leave downgrades pending.
 */
export async function changeOrganizationBillingPlan(input: {
  organizationId: string;
  planSlug: PlanSlug;
  billingInterval: BillingInterval;
}): Promise<BillingAdminPlanChangeResult> {
  if (!isBillingConfigured()) {
    return {
      ok: true,
      billingSynced: false,
      change: null,
      effectiveAt: null,
      pendingPlanId: null,
    };
  }

  try {
    const { matches } = await liveSubscriptionsForOrganization(input.organizationId);
    if (matches.length === 0) {
      return {
        ok: true,
        billingSynced: false,
        change: null,
        effectiveAt: null,
        pendingPlanId: null,
      };
    }

    const product = await resolveBillingProduct();
    if (!product) {
      return {
        ok: true,
        billingSynced: false,
        change: null,
        effectiveAt: null,
        pendingPlanId: null,
      };
    }

    const remote = await findBillingPlanForInterval(
      product.id,
      getPlanBySlug(input.planSlug).name,
      input.billingInterval,
    );
    if (!remote) {
      return {
        ok: false,
        error: `No Billing plan found for ${getPlanBySlug(input.planSlug).name} (${input.billingInterval}).`,
      };
    }

    const result = await changeBillingSubscriptionPlan(matches[0]!.id, remote.id);
    return {
      ok: true,
      billingSynced: true,
      change: result.change,
      effectiveAt: result.effectiveAt,
      pendingPlanId: result.subscription?.pendingPlanId ?? null,
    };
  } catch (error) {
    return { ok: false, error: billingApiErrorDetail(error) };
  }
}

/** @deprecated Prefer changeOrganizationBillingPlan — kept for callers expecting the old shape. */
export async function syncOrganizationBillingPlan(input: {
  organizationId: string;
  planSlug: PlanSlug;
  billingInterval: BillingInterval;
}): Promise<{ billingSynced: boolean }> {
  const result = await changeOrganizationBillingPlan(input);
  if (!result.ok) return { billingSynced: false };
  return { billingSynced: result.billingSynced };
}

export async function pauseOrganizationBillingSubscription(
  organizationId: string,
): Promise<BillingAdminSyncResult> {
  if (!isBillingConfigured()) {
    return { ok: false, error: "Billing is not configured." };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!org) return { ok: false, error: "Workspace not found." };

  try {
    const { matches } = await liveSubscriptionsForOrganization(organizationId);
    if (matches.length === 0) {
      return { ok: false, error: "No active Billing subscription to pause." };
    }

    for (const sub of matches) {
      await pauseBillingSubscription(sub.id);
    }

    await markOrgUnpaid(organizationId);
    return { ok: true, billingSynced: true, localOnly: false };
  } catch (error) {
    return { ok: false, error: billingApiErrorDetail(error) };
  }
}

export async function suspendOrganizationBillingCustomer(
  organizationId: string,
): Promise<BillingAdminSyncResult> {
  if (!isBillingConfigured()) {
    return { ok: false, error: "Billing is not configured." };
  }

  const customerId = await getOrganizationBillingCustomerId(organizationId);
  if (!customerId) {
    return { ok: false, error: "No Billing customer linked to this workspace." };
  }

  try {
    await suspendBillingCustomer(customerId);
    await markOrgUnpaid(organizationId);
    return { ok: true, billingSynced: true, localOnly: false };
  } catch (error) {
    return { ok: false, error: billingApiErrorDetail(error) };
  }
}

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  findBillingPlanForInterval,
  getOrganizationBillingCustomerId,
  isBillingConfigured,
  listBillingSubscriptions,
  resolveBillingProduct,
  resumeBillingSubscription,
  updateBillingSubscription,
} from "@/lib/billing-client";
import {
  addBillingPeriod,
  asBillingStatus,
  clearOrgCancelAtPeriodEnd,
  type BillingInterval,
  type BillingStatus,
} from "@/lib/entitlements";
import { getPlanBySlug, isPlanSlug, type PlanSlug } from "@/lib/pricing-plans";

export type BillingAdminSyncResult =
  | { ok: true; billingSynced: boolean; localOnly: boolean }
  | { ok: false; error: string };

async function liveSubscriptionsForOrganization(organizationId: string) {
  const customerId = await getOrganizationBillingCustomerId(organizationId);
  if (!customerId) return { customerId: null, matches: [] as Awaited<ReturnType<typeof listBillingSubscriptions>> };

  const product = await resolveBillingProduct().catch(() => null);
  let subs = await listBillingSubscriptions({
    status: ["active", "trialing", "past_due"],
    customerId,
    limit: 50,
  });
  if (subs.length === 0) {
    subs = (
      await listBillingSubscriptions({
        status: ["active", "trialing", "past_due"],
        limit: 50,
      })
    ).filter((sub) => sub.customerId === customerId);
  }

  const productMatches = subs.filter(
    (sub) => !product?.id || !sub.productId || sub.productId === product.id,
  );
  return { customerId, matches: productMatches.length > 0 ? productMatches : subs };
}

export async function resumeOrganizationBillingSubscription(
  organizationId: string,
): Promise<BillingAdminSyncResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      planSlug: true,
      billingStatus: true,
      billingInterval: true,
      paidAt: true,
      currentPeriodEndsAt: true,
      cancelAtPeriodEnd: true,
    },
  });
  if (!org) return { ok: false, error: "Workspace not found." };

  let billingSynced = false;
  if (isBillingConfigured()) {
    try {
      const { matches } = await liveSubscriptionsForOrganization(organizationId);
      for (const sub of matches) {
        await resumeBillingSubscription(sub.id);
        billingSynced = true;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not resume Billing subscription.";
      if (!org.cancelAtPeriodEnd && asBillingStatus(org.billingStatus) !== "expired") {
        return { ok: false, error: message };
      }
    }
  }

  await clearOrgCancelAtPeriodEnd(organizationId);

  const status = asBillingStatus(org.billingStatus);
  if (status === "expired") {
    if (!isPlanSlug(org.planSlug)) {
      return { ok: false, error: "Choose a plan before restoring access." };
    }
    const interval: BillingInterval =
      org.billingInterval === "yearly" || org.billingInterval === "monthly"
        ? org.billingInterval
        : "monthly";
    const periodStillOpen =
      org.currentPeriodEndsAt && org.currentPeriodEndsAt.getTime() > Date.now();
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        billingStatus: "active" satisfies BillingStatus,
        billingInterval: interval,
        paidAt: org.paidAt ?? new Date(),
        currentPeriodEndsAt: periodStillOpen
          ? org.currentPeriodEndsAt
          : addBillingPeriod(new Date(), interval),
        cancelAtPeriodEnd: false,
      },
    });
  }

  return {
    ok: true,
    billingSynced,
    localOnly: !billingSynced,
  };
}

export async function syncOrganizationBillingPlan(input: {
  organizationId: string;
  planSlug: PlanSlug;
  billingInterval: BillingInterval;
}): Promise<{ billingSynced: boolean }> {
  if (!isBillingConfigured()) return { billingSynced: false };

  try {
    const { matches } = await liveSubscriptionsForOrganization(input.organizationId);
    if (matches.length === 0) return { billingSynced: false };

    const product = await resolveBillingProduct();
    if (!product) return { billingSynced: false };

    const remote = await findBillingPlanForInterval(
      product.id,
      getPlanBySlug(input.planSlug).name,
      input.billingInterval,
    );
    if (!remote) return { billingSynced: false };

    await updateBillingSubscription(matches[0]!.id, {
      planId: remote.id,
      cancelAtPeriodEnd: false,
    });
    return { billingSynced: true };
  } catch {
    return { billingSynced: false };
  }
}

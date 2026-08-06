import "server-only";

import { prisma } from "@/lib/prisma";
import {
  cancelBillingSubscription,
  getOrganizationBillingCustomerId,
  isBillingConfigured,
  listBillingSubscriptions,
  resolveBillingProduct,
} from "@/lib/billing-client";
import { asBillingStatus, isBillingAccessAllowed, markOrgUnpaid } from "@/lib/entitlements";

export type CancelSubscriptionMode = "now" | "period_end";

export type CancelOrganizationSubscriptionResult =
  | {
      ok: true;
      mode: CancelSubscriptionMode;
      subscriptionId: string | null;
      canceledCount: number;
      localOnly: boolean;
    }
  | { ok: false; error: string };

/**
 * End paid/local entitlement immediately and clear the saved plan so cancel
 * does not leave the workspace "trialing" on the previous tier (e.g. pro_voice).
 */
async function revokeLocalWorkspaceAccess(organizationId: string): Promise<void> {
  await markOrgUnpaid(organizationId);
}

async function cancelLocalOnly(input: {
  organizationId: string;
  mode: CancelSubscriptionMode;
  currentPeriodEndsAt: Date | null;
}): Promise<CancelOrganizationSubscriptionResult> {
  const { organizationId, mode, currentPeriodEndsAt } = input;
  const periodStillOpen =
    Boolean(currentPeriodEndsAt) && currentPeriodEndsAt!.getTime() > Date.now();

  if (mode === "period_end" && periodStillOpen) {
    // Keep active until currentPeriodEndsAt; getOrgBilling expires it afterward.
    return {
      ok: true,
      mode: "period_end",
      subscriptionId: null,
      canceledCount: 0,
      localOnly: true,
    };
  }

  await revokeLocalWorkspaceAccess(organizationId);
  return {
    ok: true,
    mode: "now",
    subscriptionId: null,
    canceledCount: 0,
    localOnly: true,
  };
}

/**
 * Cancel the Billing subscription(s) for a workspace, then optionally revoke local access.
 * Uses PATCH /billing/admin/subscriptions/:id/cancel.
 *
 * If Billing has no matching subscription but the workspace is still locally
 * entitled (admin override, missed webhook, etc.), revoke or schedule local access
 * so sidebar entitlements stay in sync.
 */
export async function cancelOrganizationBillingSubscription(input: {
  organizationId: string;
  mode?: CancelSubscriptionMode;
}): Promise<CancelOrganizationSubscriptionResult> {
  const organizationId = input.organizationId.trim();
  const mode: CancelSubscriptionMode = input.mode === "now" ? "now" : "period_end";

  if (!organizationId) {
    return { ok: false, error: "Workspace is required." };
  }
  if (!isBillingConfigured()) {
    return { ok: false, error: "Billing is not configured." };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      billingStatus: true,
      paidAt: true,
      currentPeriodEndsAt: true,
    },
  });
  if (!org) {
    return { ok: false, error: "Workspace not found." };
  }

  const localStatus = asBillingStatus(org.billingStatus);
  const locallyEntitled = isBillingAccessAllowed(localStatus) || Boolean(org.paidAt);

  const customerId = await getOrganizationBillingCustomerId(organizationId);
  if (!customerId) {
    if (!locallyEntitled) {
      return {
        ok: false,
        error: "This workspace has no Billing customer yet, so there is nothing to cancel.",
      };
    }
    return cancelLocalOnly({
      organizationId,
      mode,
      currentPeriodEndsAt: org.currentPeriodEndsAt,
    });
  }

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
  const matches = productMatches.length > 0 ? productMatches : subs;

  if (matches.length === 0) {
    if (!locallyEntitled) {
      return { ok: false, error: "No active subscription found for this workspace." };
    }
    return cancelLocalOnly({
      organizationId,
      mode,
      currentPeriodEndsAt: org.currentPeriodEndsAt,
    });
  }

  const errors: string[] = [];
  let canceledCount = 0;
  let firstId = "";

  for (const sub of matches) {
    try {
      await cancelBillingSubscription(sub.id, mode);
      canceledCount += 1;
      if (!firstId) firstId = sub.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cancel failed";
      errors.push(message);
    }
  }

  if (canceledCount === 0) {
    return {
      ok: false,
      error: errors[0] ?? "Could not cancel the subscription.",
    };
  }

  if (mode === "now") {
    await revokeLocalWorkspaceAccess(organizationId);
  }

  return {
    ok: true,
    mode,
    subscriptionId: firstId,
    canceledCount,
    localOnly: false,
  };
}

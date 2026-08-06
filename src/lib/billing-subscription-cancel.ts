import "server-only";

import {
  cancelBillingSubscription,
  getOrganizationBillingCustomerId,
  isBillingConfigured,
  listBillingSubscriptions,
  resolveBillingProduct,
} from "@/lib/billing-client";
import { markOrgUnpaid } from "@/lib/entitlements";

export type CancelSubscriptionMode = "now" | "period_end";

export type CancelOrganizationSubscriptionResult =
  | {
      ok: true;
      mode: CancelSubscriptionMode;
      subscriptionId: string;
      canceledCount: number;
    }
  | { ok: false; error: string };

/**
 * Cancel the Billing subscription(s) for a workspace, then optionally revoke local access.
 * Uses PATCH /billing/admin/subscriptions/:id/cancel.
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

  const customerId = await getOrganizationBillingCustomerId(organizationId);
  if (!customerId) {
    return {
      ok: false,
      error: "This workspace has no Billing customer yet, so there is nothing to cancel.",
    };
  }

  const product = await resolveBillingProduct().catch(() => null);

  let subs = await listBillingSubscriptions({
    status: ["active", "trialing"],
    customerId,
    limit: 50,
  });
  if (subs.length === 0) {
    subs = (await listBillingSubscriptions({ status: ["active", "trialing"], limit: 50 })).filter(
      (sub) => sub.customerId === customerId,
    );
  }

  const matches = subs.filter(
    (sub) => !product?.id || !sub.productId || sub.productId === product.id,
  );
  if (matches.length === 0) {
    return { ok: false, error: "No active subscription found for this workspace." };
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

  // Immediate cancel: revoke local entitlements now.
  // Period-end: keep access until Billing sends subscription.canceled / period ends.
  if (mode === "now") {
    await markOrgUnpaid(organizationId);
  }

  return {
    ok: true,
    mode,
    subscriptionId: firstId,
    canceledCount,
  };
}

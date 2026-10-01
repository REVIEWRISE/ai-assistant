import "server-only";

import { listBillingSubscriptions } from "@/lib/billing-client";
import { prisma } from "@/lib/prisma";

/**
 * Reconciles local pending refund requests with remote Billing service state.
 * If a customer has no active subscriptions or all subscriptions are canceled in the Billing service,
 * marks the local refund request as approved and ensures the workspace is expired.
 */
export async function syncPendingRefundRequests(organizationId?: string): Promise<number> {
  try {
    const pendingRequests = await prisma.refundRequest.findMany({
      where: {
        status: "pending",
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        organization: {
          select: {
            id: true,
            billingCustomerId: true,
          },
        },
      },
      take: 50,
    });

    if (pendingRequests.length === 0) return 0;

    let syncedCount = 0;

    for (const request of pendingRequests) {
      const customerId = request.organization.billingCustomerId;
      if (!customerId) continue;

      const subs = await listBillingSubscriptions({
        customerId,
        limit: 20,
      }).catch(() => []);

      const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trialing");
      const hasCanceledSub = subs.some((s) => s.status === "canceled");

      // If there are no active subscriptions and at least one canceled subscription, the refund/cancellation was completed
      if (activeSubs.length === 0 && (hasCanceledSub || subs.length === 0)) {
        await prisma.refundRequest.update({
          where: { id: request.id },
          data: {
            status: "approved",
            reviewedAt: new Date(),
            adminNote: "Approved and synced with Billing service",
          },
        });

        await prisma.organization.update({
          where: { id: request.organizationId },
          data: {
            billingStatus: "expired",
            paidAt: null,
            currentPeriodEndsAt: null,
            cancelAtPeriodEnd: false,
          },
        });

        syncedCount += 1;
      }
    }

    return syncedCount;
  } catch (err) {
    console.error("[refund-sync] Failed to sync pending refund requests:", err);
    return 0;
  }
}

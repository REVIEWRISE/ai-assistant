import {
  getOrganizationBillingCustomerId,
  listBillingSubscriptions,
} from "@/lib/billing-client";
import { resolvePlanSlugFromBillingPlanId } from "@/lib/billing-checkout";
import { markOrgUnpaid } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

/**
 * Reconciles local workspace subscription status with remote Billing service state.
 * Syncs trialing and active statuses, period dates, or marks unpaid if canceled.
 */
export async function reconcileOrganizationSubscriptionWithBilling(
  organizationId: string,
): Promise<boolean> {
  try {
    const customerId = await getOrganizationBillingCustomerId(organizationId);
    if (!customerId) return false;

    const subs = await listBillingSubscriptions({
      customerId,
      limit: 20,
    }).catch(() => []);

    const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trialing");
    const hasCanceledSub = subs.some((s) => s.status === "canceled");

    // If all subscriptions are canceled in the Billing service and local org is still marked paid/active
    if (activeSubs.length === 0 && (hasCanceledSub || subs.length === 0)) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { paidAt: true, billingStatus: true, billingAdminOverride: true },
      });

      if (org && (org.paidAt || org.billingStatus === "active") && !org.billingAdminOverride) {
        await markOrgUnpaid(organizationId);
        return true;
      }
      return false;
    }

    if (activeSubs.length > 0) {
      const sub = activeSubs[0];
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          billingStatus: true,
          planSlug: true,
          billingInterval: true,
          trialEndsAt: true,
          currentPeriodEndsAt: true,
          paidAt: true,
          billingAdminOverride: true,
        },
      });

      if (org && !org.billingAdminOverride) {
        let planSlug = org.planSlug;
        let billingInterval = org.billingInterval;
        if (sub.planId) {
          const resolved = await resolvePlanSlugFromBillingPlanId(sub.planId);
          if (resolved) {
            planSlug = resolved.planSlug;
            billingInterval = resolved.billingInterval;
          }
        }

        if (sub.status === "trialing") {
          const trialEndsAt = sub.trialEndDate
            ? new Date(sub.trialEndDate)
            : sub.currentPeriodEnd
              ? new Date(sub.currentPeriodEnd)
              : null;
          const trialStartsAt = sub.currentPeriodStart
            ? new Date(sub.currentPeriodStart)
            : new Date();

          if (
            org.billingStatus !== "trialing" ||
            org.paidAt !== null ||
            (trialEndsAt && org.trialEndsAt?.getTime() !== trialEndsAt.getTime()) ||
            org.planSlug !== planSlug
          ) {
            await prisma.organization.update({
              where: { id: organizationId },
              data: {
                billingStatus: "trialing",
                planSlug: planSlug ?? "pro_voice",
                billingInterval: billingInterval ?? "monthly",
                paidAt: null,
                trialStartsAt,
                trialEndsAt,
                currentPeriodEndsAt: null,
                cancelAtPeriodEnd: false,
              },
            });
            return true;
          }
        } else if (sub.status === "active") {
          const periodEndsAt = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
          const paidAt = sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : new Date();

          if (
            org.billingStatus !== "active" ||
            !org.paidAt ||
            (periodEndsAt && org.currentPeriodEndsAt?.getTime() !== periodEndsAt.getTime()) ||
            org.planSlug !== planSlug
          ) {
            await prisma.organization.update({
              where: { id: organizationId },
              data: {
                billingStatus: "active",
                planSlug: planSlug ?? "pro_voice",
                billingInterval: billingInterval ?? "monthly",
                paidAt,
                currentPeriodEndsAt: periodEndsAt,
                cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
              },
            });
            return true;
          }
        }
      }
    }

    return false;
  } catch (err) {
    console.error("[billing-sync] Failed to reconcile org subscription with billing:", err);
    return false;
  }
}

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

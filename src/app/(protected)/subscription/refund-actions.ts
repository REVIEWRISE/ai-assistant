"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { isRefundReasonCode } from "@/lib/refund-reasons";
import {
  getBillingOrganizationCredits,
  getOrganizationBillingCustomerId,
  isBillingConfigured,
  listBillingSubscriptions,
  requestCustomerBillingRefund,
  type BillingOrganizationCreditsResult,
} from "@/lib/billing-client";
import { prisma } from "@/lib/prisma";

export type RequestRefundResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string };

async function assertCanManageRefunds(userId: string, organizationId: string): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const isAdmin = await userHasAdminRole(userId);
  if (isAdmin) return { ok: true };

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
    select: { role: true },
  });
  if (!membership) {
    return { ok: false, error: "You do not have access to this workspace." };
  }
  if (membership.role !== "owner") {
    return { ok: false, error: "Only workspace owners can request a refund." };
  }
  return { ok: true };
}

export type RequestWorkspaceRefundInput = {
  type?: "full" | "partial";
  amountCents?: number;
  reason: string;
  notes?: string;
};

export async function requestWorkspaceRefund(
  input: RequestWorkspaceRefundInput,
): Promise<RequestRefundResult> {
  const session = await requireSession();
  const organizationId = session.activeOrganizationId;
  if (!organizationId) {
    return { ok: false, error: "Select a workspace before requesting a refund." };
  }

  const access = await assertCanManageRefunds(session.userId, organizationId);
  if (!access.ok) return access;

  const type = input.type === "partial" ? "partial" : "full";

  let amountCents: number | null = null;
  if (type === "partial") {
    const rawAmount = Number(input.amountCents);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return { ok: false, error: "Please enter a valid partial refund amount greater than $0.00." };
    }
    amountCents = Math.round(rawAmount);
  }

  const reason = String(input.reason || "").trim();
  if (!isRefundReasonCode(reason)) {
    return { ok: false, error: "Choose a valid refund reason." };
  }

  const notes = String(input.notes || "").trim().slice(0, 1000);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      billingStatus: true,
      paidAt: true,
      name: true,
      billingCustomerId: true,
    },
  });
  if (!org) {
    return { ok: false, error: "Workspace not found." };
  }

  const canRefund =
    Boolean(org.paidAt) &&
    (org.billingStatus === "active" || org.billingStatus === "trialing");
  if (!canRefund) {
    return {
      ok: false,
      error: "Refunds are only available for paid active or trialing subscriptions.",
    };
  }

  // 30-day window check for full refunds
  if (type === "full" && org.paidAt) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (org.paidAt.getTime() < thirtyDaysAgo) {
      return {
        ok: false,
        error: "Full refunds must be requested within 30 days of purchase. For service issues or partial refund, please choose 'Partial Refund'.",
      };
    }
  }

  const existingPending = await prisma.refundRequest.findFirst({
    where: { organizationId, status: "pending" },
    select: { id: true },
  });
  if (existingPending) {
    return { ok: false, error: "A refund request is already under review for this workspace." };
  }

  try {
    const created = await prisma.refundRequest.create({
      data: {
        organizationId,
        requestedByUserId: session.userId,
        status: "pending",
        reason: type === "partial" ? `[partial] ${reason}` : reason,
        notes,
        amountCents,
        currency: "USD",
      },
      select: { id: true },
    });

    // Optionally notify Billing API if customer subscription is found
    if (isBillingConfigured()) {
      try {
        const customerId = org.billingCustomerId || (await getOrganizationBillingCustomerId(organizationId));
        if (customerId) {
          const subs = await listBillingSubscriptions({
            customerId,
            status: ["active", "trialing", "past_due"],
            limit: 5,
          });
          const activeSub = subs[0];
          if (activeSub?.id) {
            await requestCustomerBillingRefund({
              subscriptionId: activeSub.id,
              type,
              amountCents: amountCents ?? undefined,
              reason,
              message: notes || `Refund requested for workspace ${org.name}`,
            }).catch(() => undefined);
          }
        }
      } catch {
        // Log & proceed; local database record is already created safely
      }
    }

    await prisma.auditEvent
      .create({
        data: {
          organizationId,
          actorId: session.userId,
          action: "billing.refund_requested",
          metadata: {
            refundRequestId: created.id,
            reason,
            type,
            amountCents,
          },
        },
      })
      .catch(() => undefined);

    revalidatePath("/subscription");
    revalidatePath("/billing-admin/refunds");
    return { ok: true, requestId: created.id };
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "P2002") {
      return { ok: false, error: "A refund request is already under review for this workspace." };
    }
    return { ok: false, error: "Could not submit the refund request. Please try again." };
  }
}

/**
 * Retrieve credits balance for the active workspace.
 */
export async function getWorkspaceCredits(): Promise<BillingOrganizationCreditsResult | null> {
  const session = await requireSession();
  const organizationId = session.activeOrganizationId;
  if (!organizationId) return null;

  if (!isBillingConfigured()) return null;

  const customerId = await getOrganizationBillingCustomerId(organizationId);
  if (!customerId) return null;

  return getBillingOrganizationCredits(customerId);
}

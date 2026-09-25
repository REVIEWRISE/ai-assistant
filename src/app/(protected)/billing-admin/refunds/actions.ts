"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-session";
import {
  approveBillingRefund,
  createDirectBillingRefund,
  getBillingOrganizationCredits,
  getOrganizationBillingCustomerId,
  isBillingConfigured,
  listBillingSubscriptions,
  rejectBillingRefund,
  type BillingOrganizationCreditsResult,
  type BillingRefundMethod,
  type BillingRefundType,
} from "@/lib/billing-client";
import { cancelOrganizationBillingSubscription } from "@/lib/billing-subscription-cancel";
import { markOrgUnpaid } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

export type ReviewRefundResult = { ok: true } | { ok: false; error: string };

const REFUNDS_PATH = "/billing-admin/refunds";

export async function approveRefundRequest(input: {
  refundRequestId: string;
  refundMethod?: BillingRefundMethod;
  internalNotes?: string;
}): Promise<ReviewRefundResult> {
  const session = await requireAdminSession();
  const refundRequestId = String(input.refundRequestId || "").trim();
  if (!refundRequestId) {
    return { ok: false, error: "Refund request is required." };
  }

  const request = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      reason: true,
      notes: true,
      amountCents: true,
    },
  });
  if (!request) {
    return { ok: false, error: "Refund request not found." };
  }
  if (request.status !== "pending") {
    return { ok: false, error: "This refund request was already reviewed." };
  }

  const refundMethod: BillingRefundMethod =
    input.refundMethod === "payment_method" ? "payment_method" : "store_credit";
  const internalNotes = String(input.internalNotes || "").trim().slice(0, 1000) || undefined;

  let billingHandled = false;
  if (isBillingConfigured()) {
    try {
      // 1. Try approving via the standard approve endpoint
      await approveBillingRefund(request.id, {
        refundMethod,
        internalNotes,
      });
      billingHandled = true;
    } catch (approveErr) {
      // 2. If approve endpoint returned an error (e.g. request ID not found on Billing side),
      // fallback to creating a direct refund in Billing.
      try {
        const customerId = await getOrganizationBillingCustomerId(request.organizationId);
        let subscriptionId: string | null = null;
        if (customerId) {
          const subs = await listBillingSubscriptions({
            customerId,
            status: ["active", "trialing", "past_due"],
            limit: 5,
          }).catch(() => []);
          subscriptionId = subs[0]?.id ?? null;
        }

        const isPartial = request.reason.startsWith("[partial]") || Boolean(request.amountCents);
        const type: BillingRefundType =
          refundMethod === "store_credit"
            ? "store_credit"
            : isPartial
              ? "partial"
              : "full";

        await createDirectBillingRefund({
          organizationId: request.organizationId,
          subscriptionId,
          type,
          amountCents: request.amountCents ?? undefined,
          reason: request.reason.replace(/^\[partial\]\s*/, ""),
          description: internalNotes || request.notes || undefined,
          refundMethod,
        });
        billingHandled = true;
      } catch (directErr) {
        // If the remote billing microservice does not have refund endpoints deployed (e.g. 404),
        // or returns an error, do not block the admin from approving the refund locally.
        billingHandled = false;
        console.warn(
          "[approveRefundRequest] Remote billing sync skipped or failed; proceeding with local approval and entitlement update:",
          {
            approveError: approveErr instanceof Error ? approveErr.message : String(approveErr),
            directError: directErr instanceof Error ? directErr.message : String(directErr),
          },
        );
      }
    }
  }

  // If full refund via payment method, cancel subscription and end access immediately
  let cancelResult = null;
  const isFullPaymentRefund =
    refundMethod === "payment_method" && !request.reason.startsWith("[partial]");
  if (isFullPaymentRefund) {
    cancelResult = await cancelOrganizationBillingSubscription({
      organizationId: request.organizationId,
      mode: "now",
    });
    if (!cancelResult.ok) {
      await markOrgUnpaid(request.organizationId);
    }
  }

  const adminNote = internalNotes || null;

  await prisma.refundRequest.update({
    where: { id: request.id },
    data: {
      status: "approved",
      adminNote,
      reviewedByUserId: session.userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.auditEvent
    .create({
      data: {
        organizationId: request.organizationId,
        actorId: session.userId,
        action: "billing.refund_approved",
        metadata: {
          refundRequestId: request.id,
          refundMethod,
          billingHandled,
          accessEnded: isFullPaymentRefund,
          subscriptionCanceled: Boolean(cancelResult?.ok && !cancelResult?.localOnly),
        },
      },
    })
    .catch(() => undefined);

  revalidatePath(REFUNDS_PATH);
  revalidatePath("/subscription");
  revalidatePath("/billing-admin");
  revalidatePath("/billing/expired");
  revalidatePath("/billing-admin/organizations");
  return { ok: true };
}

export async function rejectRefundRequest(input: {
  refundRequestId: string;
  reason?: string;
  internalNotes?: string;
}): Promise<ReviewRefundResult> {
  const session = await requireAdminSession();
  const refundRequestId = String(input.refundRequestId || "").trim();
  if (!refundRequestId) {
    return { ok: false, error: "Refund request is required." };
  }

  const request = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    select: {
      id: true,
      status: true,
      organizationId: true,
    },
  });
  if (!request) {
    return { ok: false, error: "Refund request not found." };
  }
  if (request.status !== "pending") {
    return { ok: false, error: "This refund request was already reviewed." };
  }

  const rejectionReason = String(input.reason || "other").trim();
  const internalNotes = String(input.internalNotes || "").trim().slice(0, 1000) || undefined;

  if (isBillingConfigured()) {
    try {
      await rejectBillingRefund(request.id, {
        reason: rejectionReason,
        internalNotes,
      });
    } catch {
      // Proceed; local rejection is still recorded
    }
  }

  const adminNote =
    [rejectionReason ? `Reason: ${rejectionReason}` : null, internalNotes]
      .filter(Boolean)
      .join(" — ") || null;

  await prisma.refundRequest.update({
    where: { id: request.id },
    data: {
      status: "rejected",
      adminNote,
      reviewedByUserId: session.userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.auditEvent
    .create({
      data: {
        organizationId: request.organizationId,
        actorId: session.userId,
        action: "billing.refund_rejected",
        metadata: {
          refundRequestId: request.id,
          rejectionReason,
        },
      },
    })
    .catch(() => undefined);

  revalidatePath(REFUNDS_PATH);
  revalidatePath("/subscription");
  revalidatePath("/billing-admin");
  return { ok: true };
}

export type DirectRefundInput = {
  organizationId: string;
  subscriptionId?: string;
  type: BillingRefundType;
  amountCents?: number;
  reason: string;
  description?: string;
  refundMethod?: BillingRefundMethod;
};

export async function createDirectRefund(input: DirectRefundInput): Promise<
  | { ok: true; refundId: string }
  | { ok: false; error: string }
> {
  const session = await requireAdminSession();
  const organizationId = String(input.organizationId || "").trim();
  if (!organizationId) {
    return { ok: false, error: "Organization is required." };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, billingCustomerId: true },
  });
  if (!org) {
    return { ok: false, error: "Organization not found." };
  }

  const reason = String(input.reason || "").trim();
  if (!reason) {
    return { ok: false, error: "Refund reason is required." };
  }

  const type = input.type;
  let amountCents: number | undefined = undefined;
  if (type === "partial" || type === "store_credit") {
    if (typeof input.amountCents === "number" && input.amountCents > 0) {
      amountCents = Math.round(input.amountCents);
    }
  }

  const refundMethod = input.refundMethod ?? "store_credit";
  const description = input.description?.trim();

  let externalRefundId: string = "";

  if (isBillingConfigured()) {
    try {
      const result = await createDirectBillingRefund({
        organizationId,
        subscriptionId: input.subscriptionId,
        type,
        amountCents,
        reason,
        description,
        refundMethod,
      });
      externalRefundId = result.id;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cannot POST /api/")) {
        console.warn(
          "[createDirectRefund] Remote billing refund endpoint is not mounted on external server; creating local refund record.",
          error.message,
        );
      } else {
        const message = error instanceof Error ? error.message : "Billing direct refund failed.";
        return { ok: false, error: message };
      }
    }
  }

  const created = await prisma.refundRequest.create({
    data: {
      organizationId,
      requestedByUserId: session.userId,
      reviewedByUserId: session.userId,
      reviewedAt: new Date(),
      status: "approved",
      reason: `[admin_direct:${type}] ${reason}`,
      notes: description || `Direct ${type} refund issued by admin`,
      amountCents: amountCents ?? null,
      currency: "USD",
      adminNote: `Refund method: ${refundMethod}. ${description || ""}`.trim(),
    },
  });

  await prisma.auditEvent
    .create({
      data: {
        organizationId,
        actorId: session.userId,
        action: "billing.refund_approved",
        metadata: {
          directRefund: true,
          refundRequestId: created.id,
          externalRefundId,
          type,
          amountCents,
          refundMethod,
        },
      },
    })
    .catch(() => undefined);

  revalidatePath(REFUNDS_PATH);
  revalidatePath("/billing-admin");
  revalidatePath("/billing-admin/organizations");
  return { ok: true, refundId: created.id };
}

export async function fetchOrganizationCredits(
  organizationId: string,
): Promise<BillingOrganizationCreditsResult | null> {
  await requireAdminSession();
  const customerId = await getOrganizationBillingCustomerId(organizationId);
  if (!customerId) return null;
  return getBillingOrganizationCredits(customerId);
}

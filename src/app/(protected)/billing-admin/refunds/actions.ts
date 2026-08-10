"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-session";
import {
  createBillingRefund,
  getOrganizationBillingCustomerId,
  isBillingConfigured,
} from "@/lib/billing-client";
import { prisma } from "@/lib/prisma";

export type ReviewRefundResult = { ok: true } | { ok: false; error: string };

const REFUNDS_PATH = "/billing-admin/refunds";

export async function approveRefundRequest(input: {
  refundRequestId: string;
  adminNote?: string;
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
    },
  });
  if (!request) {
    return { ok: false, error: "Refund request not found." };
  }
  if (request.status !== "pending") {
    return { ok: false, error: "This refund request was already reviewed." };
  }

  if (!isBillingConfigured()) {
    return { ok: false, error: "Billing is not configured, so the refund cannot be processed." };
  }

  const customerId = await getOrganizationBillingCustomerId(request.organizationId);
  if (!customerId) {
    return {
      ok: false,
      error: "This workspace has no Billing customer linked, so the refund cannot be processed.",
    };
  }

  try {
    await createBillingRefund({
      customerId,
      organizationId: request.organizationId,
      reason: request.reason,
      notes: request.notes || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing refund failed.";
    return { ok: false, error: message };
  }

  const adminNote = String(input.adminNote || "").trim().slice(0, 1000) || null;

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
        metadata: { refundRequestId: request.id },
      },
    })
    .catch(() => undefined);

  revalidatePath(REFUNDS_PATH);
  revalidatePath("/subscription");
  revalidatePath("/billing-admin");
  return { ok: true };
}

export async function rejectRefundRequest(input: {
  refundRequestId: string;
  adminNote?: string;
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

  const adminNote = String(input.adminNote || "").trim().slice(0, 1000) || null;

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
        metadata: { refundRequestId: request.id },
      },
    })
    .catch(() => undefined);

  revalidatePath(REFUNDS_PATH);
  revalidatePath("/subscription");
  revalidatePath("/billing-admin");
  return { ok: true };
}

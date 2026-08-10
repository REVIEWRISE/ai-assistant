"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { isRefundReasonCode } from "@/lib/refund-reasons";
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

export async function requestWorkspaceRefund(input: {
  reason: string;
  notes?: string;
}): Promise<RequestRefundResult> {
  const session = await requireSession();
  const organizationId = session.activeOrganizationId;
  if (!organizationId) {
    return { ok: false, error: "Select a workspace before requesting a refund." };
  }

  const access = await assertCanManageRefunds(session.userId, organizationId);
  if (!access.ok) return access;

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
        reason,
        notes,
      },
      select: { id: true },
    });

    await prisma.auditEvent
      .create({
        data: {
          organizationId,
          actorId: session.userId,
          action: "billing.refund_requested",
          metadata: { refundRequestId: created.id, reason },
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

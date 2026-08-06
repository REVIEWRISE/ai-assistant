"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { cancelOrganizationBillingSubscription } from "@/lib/billing-subscription-cancel";
import { prisma } from "@/lib/prisma";

export type CancelSubscriptionResult =
  | { ok: true; mode: "now" | "period_end" }
  | { ok: false; error: string };

export async function cancelActiveWorkspaceSubscription(input: {
  mode?: "now" | "period_end";
}): Promise<CancelSubscriptionResult> {
  const session = await requireSession();
  const organizationId = session.activeOrganizationId;
  if (!organizationId) {
    return { ok: false, error: "Select a workspace before managing subscription." };
  }

  const isAdmin = await userHasAdminRole(session.userId);
  if (!isAdmin) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.userId, organizationId },
      select: { role: true },
    });
    if (!membership) {
      return { ok: false, error: "You do not have access to this workspace." };
    }
    if (membership.role !== "owner") {
      return { ok: false, error: "Only workspace owners can cancel the subscription." };
    }
  }

  const result = await cancelOrganizationBillingSubscription({
    organizationId,
    mode: input.mode,
  });
  if (!result.ok) return result;

  revalidatePath("/subscription");
  revalidatePath("/billing-admin/organizations");
  revalidatePath("/dashboard");
  return { ok: true, mode: result.mode };
}

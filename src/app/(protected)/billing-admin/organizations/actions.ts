"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-session";
import {
  addBillingPeriod,
  type BillingInterval,
  type BillingStatus,
} from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { PLAN_SLUGS, type PlanSlug } from "@/lib/pricing-plans";
import {
  resumeOrganizationBillingSubscription,
  syncOrganizationBillingPlan,
} from "@/lib/billing-subscription-admin";
import { fallbackOrganizationIdForAdmin, purgeOrganization } from "@/lib/organization-delete";

const ADMIN_ORGS_PATH = "/billing-admin/organizations";

export type AdminUpdateOrganizationPlanResult =
  | { ok: true; billingSynced: boolean }
  | { ok: false; error: string };

function asPlanSlug(value: string): PlanSlug | null {
  return (PLAN_SLUGS as readonly string[]).includes(value) ? (value as PlanSlug) : null;
}

function asInterval(value: string): BillingInterval | null {
  if (value === "monthly" || value === "yearly") return value;
  return null;
}

function asBillingStatus(value: string): BillingStatus | null {
  if (
    value === "needs_plan" ||
    value === "trialing" ||
    value === "active" ||
    value === "expired"
  ) {
    return value;
  }
  return null;
}

/**
 * Admin override: change a workspace's local plan / interval / status.
 * Tries to PATCH a matching live Billing subscription; falls back to local-only.
 */
export async function adminUpdateOrganizationPlan(input: {
  organizationId: string;
  planSlug: string;
  billingInterval: string;
  billingStatus?: string;
  resetPeriod?: boolean;
}): Promise<AdminUpdateOrganizationPlanResult> {
  await requireAdminSession();

  const organizationId = input.organizationId.trim();
  const planSlug = asPlanSlug(input.planSlug.trim());
  const billingInterval = asInterval(input.billingInterval.trim());
  if (!organizationId || !planSlug || !billingInterval) {
    return { ok: false, error: "Choose a valid plan and billing interval." };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      billingStatus: true,
      billingInterval: true,
      paidAt: true,
      currentPeriodEndsAt: true,
    },
  });
  if (!org) {
    return { ok: false, error: "Workspace not found." };
  }

  const requestedStatus = input.billingStatus
    ? asBillingStatus(input.billingStatus.trim())
    : null;
  if (input.billingStatus && !requestedStatus) {
    return { ok: false, error: "Choose a valid billing status." };
  }

  const nextStatus: BillingStatus =
    requestedStatus ??
    (org.billingStatus === "active" ||
    org.billingStatus === "trialing" ||
    org.billingStatus === "expired" ||
    org.billingStatus === "needs_plan"
      ? org.billingStatus
      : "active");

  const intervalChanged = org.billingInterval !== billingInterval;
  const shouldResetPeriod = Boolean(input.resetPeriod) || intervalChanged;

  let currentPeriodEndsAt = org.currentPeriodEndsAt;
  let paidAt = org.paidAt;

  if (nextStatus === "active") {
    if (!paidAt) paidAt = new Date();
    if (shouldResetPeriod || !currentPeriodEndsAt) {
      currentPeriodEndsAt = addBillingPeriod(paidAt, billingInterval);
    }
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      planSlug,
      billingInterval,
      billingStatus: nextStatus,
      paidAt: nextStatus === "active" ? paidAt : org.paidAt,
      currentPeriodEndsAt: nextStatus === "active" ? currentPeriodEndsAt : org.currentPeriodEndsAt,
      ...(nextStatus === "active" || nextStatus === "expired"
        ? { cancelAtPeriodEnd: false }
        : {}),
    },
  });

  const { billingSynced } =
    nextStatus === "active" || nextStatus === "trialing"
      ? await syncOrganizationBillingPlan({
          organizationId,
          planSlug,
          billingInterval,
        })
      : { billingSynced: false };

  revalidatePath(ADMIN_ORGS_PATH);
  revalidatePath("/billing-admin");
  return { ok: true, billingSynced };
}

export type AdminCancelOrganizationSubscriptionResult =
  | { ok: true; mode: "now" | "period_end" }
  | { ok: false; error: string };

/**
 * Cancel the Billing subscription for a workspace via
 * PATCH /billing/admin/subscriptions/:id/cancel.
 */
export async function adminCancelOrganizationSubscription(input: {
  organizationId: string;
  mode?: "now" | "period_end";
}): Promise<AdminCancelOrganizationSubscriptionResult> {
  await requireAdminSession();

  const { cancelOrganizationBillingSubscription } = await import(
    "@/lib/billing-subscription-cancel"
  );
  const result = await cancelOrganizationBillingSubscription({
    organizationId: input.organizationId,
    mode: input.mode,
  });

  if (!result.ok) return result;

  revalidatePath(ADMIN_ORGS_PATH);
  revalidatePath("/billing-admin");
  revalidatePath("/subscription");
  return { ok: true, mode: result.mode };
}

export type AdminRestoreOrganizationSubscriptionResult =
  | { ok: true; billingSynced: boolean; localOnly: boolean }
  | { ok: false; error: string };

export async function adminRestoreOrganizationSubscription(input: {
  organizationId: string;
}): Promise<AdminRestoreOrganizationSubscriptionResult> {
  await requireAdminSession();
  const organizationId = input.organizationId.trim();
  if (!organizationId) return { ok: false, error: "Workspace is required." };

  const result = await resumeOrganizationBillingSubscription(organizationId);
  if (!result.ok) return result;

  revalidatePath(ADMIN_ORGS_PATH);
  revalidatePath("/billing-admin");
  revalidatePath("/subscription");
  revalidatePath("/billing/expired");
  return result;
}

export type AdminDeleteOrganizationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function adminDeleteOrganization(input: {
  organizationId: string;
}): Promise<AdminDeleteOrganizationResult> {
  const session = await requireAdminSession();
  const organizationId = input.organizationId.trim();
  if (!organizationId) return { ok: false, error: "Workspace is required." };

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!organization) return { ok: false, error: "Workspace not found." };

  const fallbackOrganizationId =
    session.activeOrganizationId === organizationId
      ? await fallbackOrganizationIdForAdmin(organizationId)
      : session.activeOrganizationId;

  try {
    await purgeOrganization({
      organizationId,
      sessionId: session.id,
      fallbackOrganizationId,
    });
  } catch {
    return { ok: false, error: "Could not delete this workspace." };
  }

  revalidatePath(ADMIN_ORGS_PATH);
  revalidatePath("/billing-admin");
  revalidatePath("/appointments/organization");
  return { ok: true };
}

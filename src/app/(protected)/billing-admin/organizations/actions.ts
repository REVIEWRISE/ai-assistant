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
  changeOrganizationBillingPlan,
  pauseOrganizationBillingSubscription,
  resumeOrganizationBillingSubscription,
  suspendOrganizationBillingCustomer,
} from "@/lib/billing-subscription-admin";
import {
  cancelOrganizationBillingSubscription,
  isIgnorableCancelError,
} from "@/lib/billing-subscription-cancel";
import { isBillingConfigured, type BillingPlanChangeKind } from "@/lib/billing-client";
import { fallbackOrganizationIdForAdmin, purgeOrganization } from "@/lib/organization-delete";
import { notifyAdminsOfOrganizationPlanChange } from "@/lib/billing-admin-plan-change-email";
import { writePlatformAudit } from "@/lib/platform-audit";

const ADMIN_ORGS_PATH = "/billing-admin/organizations";

export type AdminUpdateOrganizationPlanResult =
  | {
      ok: true;
      billingSynced: boolean;
      change: BillingPlanChangeKind | null;
      effectiveAt: string | null;
      /** False when Billing scheduled a downgrade — local plan stays on the current tier. */
      localPlanApplied: boolean;
    }
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
 * Live subscriptions use PATCH .../change-plan (upgrade now / downgrade at period end).
 * Without a live sub, falls back to a protected local grant.
 */
export async function adminUpdateOrganizationPlan(input: {
  organizationId: string;
  planSlug: string;
  billingInterval: string;
  billingStatus?: string;
  resetPeriod?: boolean;
}): Promise<AdminUpdateOrganizationPlanResult> {
  const session = await requireAdminSession();

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
      name: true,
      planSlug: true,
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

  let billingSynced = false;
  let change: BillingPlanChangeKind | null = null;
  let effectiveAt: string | null = null;
  let localPlanApplied = true;

  const planOrIntervalChanged =
    org.planSlug !== planSlug || org.billingInterval !== billingInterval;

  if (nextStatus === "expired" || nextStatus === "needs_plan") {
    if (isBillingConfigured()) {
      const cancelResult = await cancelOrganizationBillingSubscription({
        organizationId,
        mode: "now",
      });
      if (!cancelResult.ok && !isIgnorableCancelError(cancelResult.error)) {
        return { ok: false, error: cancelResult.error };
      }
      billingSynced = Boolean(cancelResult.ok && !cancelResult.localOnly);
    }
  } else if (planOrIntervalChanged) {
    const sync = await changeOrganizationBillingPlan({
      organizationId,
      planSlug,
      billingInterval,
    });
    if (!sync.ok) {
      return { ok: false, error: sync.error };
    }
    billingSynced = sync.billingSynced;
    change = sync.change;
    effectiveAt = sync.effectiveAt;
    // Downgrades stay on the current plan until period end.
    if (sync.change === "downgrade") {
      localPlanApplied = false;
    }
  }

  const appliedPlanSlug = localPlanApplied
    ? planSlug
    : asPlanSlug(org.planSlug ?? "") ?? planSlug;
  const appliedInterval = localPlanApplied
    ? billingInterval
    : org.billingInterval === "yearly" || org.billingInterval === "monthly"
      ? org.billingInterval
      : billingInterval;

  const intervalChanged = org.billingInterval !== appliedInterval;
  const shouldResetPeriod =
    localPlanApplied && (Boolean(input.resetPeriod) || intervalChanged);

  let currentPeriodEndsAt = org.currentPeriodEndsAt;
  let paidAt = org.paidAt;

  if (nextStatus === "active") {
    if (!paidAt) paidAt = new Date();
    if (shouldResetPeriod || !currentPeriodEndsAt) {
      currentPeriodEndsAt = addBillingPeriod(paidAt, appliedInterval);
    }
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      planSlug: appliedPlanSlug,
      billingInterval: appliedInterval,
      billingStatus: nextStatus,
      paidAt: nextStatus === "active" ? paidAt : null,
      currentPeriodEndsAt: nextStatus === "active" ? currentPeriodEndsAt : null,
      ...(nextStatus === "active" || nextStatus === "expired"
        ? { cancelAtPeriodEnd: false }
        : {}),
      billingAdminOverride:
        (nextStatus === "active" || nextStatus === "trialing") && !billingSynced,
    },
  });

  const fromSnapshot = {
    planSlug: org.planSlug,
    billingInterval: org.billingInterval,
    billingStatus: org.billingStatus,
  };
  const toSnapshot = {
    planSlug: localPlanApplied ? planSlug : org.planSlug,
    billingInterval: appliedInterval,
    billingStatus: nextStatus,
    ...(change === "downgrade"
      ? { pendingPlanSlug: planSlug, pendingBillingInterval: billingInterval, effectiveAt }
      : {}),
  };

  await writePlatformAudit({
    actorId: session.userId,
    organizationId,
    action: "billing_admin.plan_overridden",
    metadata: {
      organizationName: org.name,
      from: fromSnapshot,
      to: toSnapshot,
      billingSynced,
      change,
      effectiveAt,
      localPlanApplied,
    },
  });

  // Notify other system admins (not the actor). Non-blocking.
  void notifyAdminsOfOrganizationPlanChange({
    actorUserId: session.userId,
    organizationId,
    organizationName: org.name,
    from: fromSnapshot,
    to: {
      planSlug: localPlanApplied ? planSlug : org.planSlug,
      billingInterval: appliedInterval,
      billingStatus: nextStatus,
    },
    billingSynced,
  });

  revalidatePath(ADMIN_ORGS_PATH);
  revalidatePath("/billing-admin");
  return { ok: true, billingSynced, change, effectiveAt, localPlanApplied };
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
  const session = await requireAdminSession();

  const result = await cancelOrganizationBillingSubscription({
    organizationId: input.organizationId,
    mode: input.mode,
  });

  if (!result.ok) return result;

  await writePlatformAudit({
    actorId: session.userId,
    organizationId: input.organizationId,
    action: "billing_admin.subscription_canceled",
    metadata: {
      mode: result.mode,
      localOnly: result.localOnly,
      canceledCount: result.canceledCount,
    },
  });

  revalidatePath(ADMIN_ORGS_PATH);
  revalidatePath("/billing-admin");
  revalidatePath("/subscription");
  return { ok: true, mode: result.mode };
}

export type AdminRestoreOrganizationSubscriptionResult =
  | {
      ok: true;
      mode: "resumed" | "checkout";
      billingSynced: boolean;
      localOnly: boolean;
      checkoutUrl?: string;
    }
  | { ok: false; error: string };

export async function adminRestoreOrganizationSubscription(input: {
  organizationId: string;
}): Promise<AdminRestoreOrganizationSubscriptionResult> {
  const session = await requireAdminSession();
  const organizationId = input.organizationId.trim();
  if (!organizationId) return { ok: false, error: "Workspace is required." };

  const result = await resumeOrganizationBillingSubscription(organizationId);
  if (!result.ok) return result;

  await writePlatformAudit({
    actorId: session.userId,
    organizationId,
    action:
      result.mode === "checkout"
        ? "billing_admin.resume_checkout_started"
        : "billing_admin.access_restored",
    metadata: {
      mode: result.mode,
      billingSynced: result.billingSynced,
      localOnly: result.localOnly,
      ...(result.mode === "checkout" ? { sessionId: result.sessionId } : {}),
    },
  });

  revalidatePath(ADMIN_ORGS_PATH);
  revalidatePath("/billing-admin");
  revalidatePath("/subscription");
  revalidatePath("/billing/expired");

  if (result.mode === "checkout") {
    return {
      ok: true,
      mode: "checkout",
      billingSynced: false,
      localOnly: false,
      checkoutUrl: result.checkoutUrl,
    };
  }

  return {
    ok: true,
    mode: "resumed",
    billingSynced: result.billingSynced,
    localOnly: result.localOnly,
  };
}

export type AdminPauseOrganizationSubscriptionResult =
  | { ok: true; billingSynced: boolean }
  | { ok: false; error: string };

/** PATCH /billing/admin/subscriptions/:id/pause */
export async function adminPauseOrganizationSubscription(input: {
  organizationId: string;
}): Promise<AdminPauseOrganizationSubscriptionResult> {
  const session = await requireAdminSession();
  const organizationId = input.organizationId.trim();
  if (!organizationId) return { ok: false, error: "Workspace is required." };

  const result = await pauseOrganizationBillingSubscription(organizationId);
  if (!result.ok) return result;

  await writePlatformAudit({
    actorId: session.userId,
    organizationId,
    action: "billing_admin.subscription_paused",
    metadata: { billingSynced: result.billingSynced },
  });

  revalidatePath(ADMIN_ORGS_PATH);
  revalidatePath("/billing-admin");
  revalidatePath("/subscription");
  return { ok: true, billingSynced: result.billingSynced };
}

export type AdminSuspendOrganizationBillingResult =
  | { ok: true }
  | { ok: false; error: string };

/** PATCH /billing/admin/customers/:id/suspend */
export async function adminSuspendOrganizationBilling(input: {
  organizationId: string;
}): Promise<AdminSuspendOrganizationBillingResult> {
  const session = await requireAdminSession();
  const organizationId = input.organizationId.trim();
  if (!organizationId) return { ok: false, error: "Workspace is required." };

  const result = await suspendOrganizationBillingCustomer(organizationId);
  if (!result.ok) return result;

  await writePlatformAudit({
    actorId: session.userId,
    organizationId,
    action: "billing_admin.customer_suspended",
    metadata: { billingSynced: result.billingSynced },
  });

  revalidatePath(ADMIN_ORGS_PATH);
  revalidatePath("/billing-admin");
  revalidatePath("/subscription");
  revalidatePath("/billing/expired");
  return { ok: true };
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
    select: { id: true, name: true },
  });
  if (!organization) return { ok: false, error: "Workspace not found." };

  const fallbackOrganizationId =
    session.activeOrganizationId === organizationId
      ? await fallbackOrganizationIdForAdmin(organizationId)
      : session.activeOrganizationId;

  await writePlatformAudit({
    actorId: session.userId,
    organizationId:
      fallbackOrganizationId && fallbackOrganizationId !== organizationId
        ? fallbackOrganizationId
        : session.activeOrganizationId,
    action: "billing_admin.organization_deleted",
    metadata: {
      deletedOrganizationId: organizationId,
      name: organization.name,
    },
  });

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

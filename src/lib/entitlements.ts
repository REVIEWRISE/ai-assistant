import "server-only";

import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import {
  getBillingCustomerEntitlements,
  getOrganizationBillingCustomerId,
  isBillingConfigured,
} from "@/lib/billing-client";
import { prisma } from "@/lib/prisma";
import {
  BILLING_RULES,
  PLAN_SLUGS,
  getPlanEntitlement,
  type PlanFeatureKey,
  type PlanSlug,
} from "@/lib/pricing-plans";

export const BILLING_STATUSES = ["needs_plan", "trialing", "active", "expired"] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];
export type BillingInterval = "monthly" | "yearly";

export type OrgBilling = {
  organizationId: string;
  planSlug: PlanSlug | null;
  billingStatus: BillingStatus;
  billingInterval: BillingInterval | null;
  trialStartsAt: Date | null;
  trialEndsAt: Date | null;
  paidAt: Date | null;
  currentPeriodEndsAt: Date | null;
};

/** Route prefixes that require a given feature when billing access is allowed. */
export const FEATURE_ROUTE_GATES: Array<{ feature: PlanFeatureKey; prefixes: string[] }> = [
  { feature: "review_channels", prefixes: ["/reviews"] },
  { feature: "knowledge_base", prefixes: ["/appointments/knowledge-base"] },
  { feature: "web_chatbot", prefixes: ["/appointments/chatbot"] },
  {
    feature: "calendar_booking",
    prefixes: ["/appointments/overview", "/appointments/organization", "/appointments"],
  },
  { feature: "ai_voice_agent", prefixes: ["/voice-agent"] },
];

const ALWAYS_ALLOWED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/users",
  "/settings",
  "/platform",
  "/billing-admin",
  "/onboarding",
  "/billing",
  "/logout",
];

/** Paths reachable while billing is locked (needs plan / expired trial). */
const BILLING_LOCKOUT_PATHS = [
  "/billing",
  "/billing/expired",
  "/onboarding/plan",
  "/profile",
  "/logout",
];

function pathMatchesPrefix(path: string, prefix: string): boolean {
  if (path === prefix || path.startsWith(`${prefix}/`)) {
    // `/appointments` must not claim chatbot / knowledge-base routes.
    if (prefix === "/appointments") {
      if (
        path.startsWith("/appointments/knowledge-base") ||
        path.startsWith("/appointments/chatbot")
      ) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function isPlanSlug(value: string | null | undefined): value is PlanSlug {
  return Boolean(value && (PLAN_SLUGS as readonly string[]).includes(value));
}

function asBillingStatus(value: string | null | undefined): BillingStatus {
  if (value && (BILLING_STATUSES as readonly string[]).includes(value)) {
    return value as BillingStatus;
  }
  return "needs_plan";
}

function asBillingInterval(value: string | null | undefined): BillingInterval | null {
  if (value === "monthly" || value === "yearly") return value;
  return null;
}

export function isBillingAccessAllowed(status: BillingStatus): boolean {
  return status === "trialing" || status === "active";
}

/** Trial runs BILLING_RULES.trialDays from an active user account's createdAt. */
export function trialEndsAtFrom(accountCreatedAt: Date): Date {
  const end = new Date(accountCreatedAt);
  end.setUTCDate(end.getUTCDate() + BILLING_RULES.trialDays);
  return end;
}

export function isTrialExpiredByCreatedAt(
  accountCreatedAt: Date,
  now: Date = new Date(),
): boolean {
  return trialEndsAtFrom(accountCreatedAt).getTime() <= now.getTime();
}

/**
 * Trial anchor = earliest active org owner account createdAt.
 * Falls back to earliest active member, then organization.createdAt.
 */
export async function getTrialAnchorForOrganization(
  organizationId: string,
): Promise<Date> {
  const owner = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      role: "owner",
      user: { accountStatus: "active" },
    },
    orderBy: { user: { createdAt: "asc" } },
    select: { user: { select: { createdAt: true } } },
  });
  if (owner?.user.createdAt) return owner.user.createdAt;

  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      user: { accountStatus: "active" },
    },
    orderBy: { user: { createdAt: "asc" } },
    select: { user: { select: { createdAt: true } } },
  });
  if (member?.user.createdAt) return member.user.createdAt;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { createdAt: true },
  });
  return org?.createdAt ?? new Date();
}

export async function getOrgBilling(organizationId: string): Promise<OrgBilling | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      planSlug: true,
      billingStatus: true,
      billingInterval: true,
      paidAt: true,
      currentPeriodEndsAt: true,
    },
  });
  if (!org) return null;

  const trialStartsAt = await getTrialAnchorForOrganization(organizationId);
  const trialEndsAt = trialEndsAtFrom(trialStartsAt);
  const planSlug = isPlanSlug(org.planSlug) ? org.planSlug : null;
  let billingStatus = asBillingStatus(org.billingStatus);
  const isPaid = Boolean(org.paidAt) && billingStatus === "active";

  // Unpaid access is only valid during the active account createdAt → +14d trial window.
  if (!isPaid && billingStatus !== "needs_plan") {
    const shouldBeExpired = isTrialExpiredByCreatedAt(trialStartsAt);
    const nextStatus: BillingStatus = shouldBeExpired ? "expired" : "trialing";
    if (billingStatus !== nextStatus) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          billingStatus: nextStatus,
          trialStartsAt,
          trialEndsAt,
        },
      });
      billingStatus = nextStatus;
    }
  }

  return {
    organizationId: org.id,
    planSlug,
    billingStatus,
    billingInterval: asBillingInterval(org.billingInterval),
    trialStartsAt,
    trialEndsAt,
    paidAt: org.paidAt,
    currentPeriodEndsAt: org.currentPeriodEndsAt,
  };
}

export function entitlementIsEnabled(value: ReturnType<typeof getPlanEntitlement>): boolean {
  if (value === undefined || value === false) return false;
  if (typeof value === "number") return value > 0;
  return true;
}

export function orgHasFeatureFromBilling(
  billing: OrgBilling,
  key: PlanFeatureKey,
): boolean {
  if (!isBillingAccessAllowed(billing.billingStatus)) return false;
  if (!billing.planSlug) return false;
  return entitlementIsEnabled(getPlanEntitlement(billing.planSlug, key));
}

async function orgHasRemoteEntitlement(
  organizationId: string,
  key: PlanFeatureKey,
): Promise<boolean | null> {
  if (!isBillingConfigured()) return null;
  const customerId = await getOrganizationBillingCustomerId(organizationId);
  if (!customerId) return null;

  try {
    const entitlements = await getBillingCustomerEntitlements(customerId);
    const needle = key.toLowerCase();
    const keys = new Set(
      [...entitlements.featureKeys, ...entitlements.moduleKeys].map((value) =>
        value.toLowerCase(),
      ),
    );
    if (keys.size === 0) return null;
    return keys.has(needle);
  } catch {
    return null;
  }
}

export async function orgHasFeature(
  organizationId: string,
  key: PlanFeatureKey,
): Promise<boolean> {
  const billing = await getOrgBilling(organizationId);
  if (!billing) return false;

  // Paid workspaces: prefer Billing entitlements (step 6). Fall back to local plan matrix.
  if (billing.billingStatus === "active") {
    const remote = await orgHasRemoteEntitlement(organizationId, key);
    if (remote != null) return remote;
  }

  return orgHasFeatureFromBilling(billing, key);
}

export async function assertOrgFeatureAccess(
  organizationId: string,
  key: PlanFeatureKey,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const session = await getValidSession();
  if (session && (await userHasAdminRole(session.userId))) {
    return { ok: true };
  }

  const billing = await getOrgBilling(organizationId);
  if (!billing || billing.billingStatus === "needs_plan") {
    return { ok: false, status: 403, error: "plan_required" };
  }
  if (billing.billingStatus === "expired" || !isBillingAccessAllowed(billing.billingStatus)) {
    return { ok: false, status: 403, error: "subscription_required" };
  }
  if (!(await orgHasFeature(organizationId, key))) {
    return { ok: false, status: 403, error: "feature_not_entitled" };
  }
  return { ok: true };
}

export async function requireOrgFeature(
  organizationId: string | null | undefined,
  key: PlanFeatureKey,
  options?: { redirectTo?: string },
): Promise<OrgBilling> {
  if (!organizationId) {
    redirect(options?.redirectTo ?? "/billing?error=organization_required");
  }

  const session = await getValidSession();
  if (session && (await userHasAdminRole(session.userId))) {
    const billing = await getOrgBilling(organizationId);
    if (billing) return billing;
    return {
      organizationId,
      planSlug: "pro_voice",
      billingStatus: "active",
      billingInterval: "monthly",
      trialStartsAt: null,
      trialEndsAt: null,
      paidAt: null,
      currentPeriodEndsAt: null,
    };
  }

  const billing = await getOrgBilling(organizationId);
  if (!billing) {
    redirect(options?.redirectTo ?? "/billing?error=organization_required");
  }
  if (billing.billingStatus === "needs_plan") {
    redirect("/onboarding/plan");
  }
  if (billing.billingStatus === "expired") {
    redirect("/billing/expired");
  }
  if (!(await orgHasFeature(organizationId, key))) {
    redirect(options?.redirectTo ?? `/billing?error=upgrade_required&feature=${key}`);
  }
  return billing;
}

export async function assertWithinLimit(
  organizationId: string,
  key: "team_members" | "locations",
  nextCount: number,
): Promise<void> {
  const session = await getValidSession();
  if (session && (await userHasAdminRole(session.userId))) {
    return;
  }

  const billing = await getOrgBilling(organizationId);
  if (!billing?.planSlug || !isBillingAccessAllowed(billing.billingStatus)) {
    throw new Error("Billing access required.");
  }
  const limit = getPlanEntitlement(billing.planSlug, key);
  if (typeof limit !== "number") return;
  if (nextCount > limit) {
    throw new Error(
      `${key === "team_members" ? "Team member" : "Location"} limit reached for ${billing.planSlug} (${limit}).`,
    );
  }
}

export function pathAllowedByPlan(pathname: string, billing: OrgBilling | null): boolean {
  const path = pathname.split("?")[0] || "/";
  if (
    ALWAYS_ALLOWED_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }

  if (!billing || !isBillingAccessAllowed(billing.billingStatus) || !billing.planSlug) {
    return (
      path === "/onboarding/plan" ||
      path === "/billing" ||
      path.startsWith("/billing/")
    );
  }

  for (const gate of FEATURE_ROUTE_GATES) {
    const matches = gate.prefixes.some((prefix) => pathMatchesPrefix(path, prefix));
    if (!matches) continue;
    return orgHasFeatureFromBilling(billing, gate.feature);
  }

  return true;
}

/** Paths that should remain reachable even when trial is expired / plan not chosen. */
export function isBillingBypassPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return (
    path === "/onboarding/plan" ||
    path.startsWith("/onboarding/plan/") ||
    path === "/billing" ||
    path.startsWith("/billing/") || // includes /billing/success for post-checkout sync
    path === "/logout" ||
    path.startsWith("/logout/") ||
    path === "/profile" ||
    path.startsWith("/profile/") ||
    path === "/platform" ||
    path.startsWith("/platform/") ||
    path === "/billing-admin" ||
    path.startsWith("/billing-admin/")
  );
}

export function billingRedirectForStatus(status: BillingStatus): string | null {
  if (status === "needs_plan") return "/onboarding/plan";
  if (status === "expired") return "/billing/expired";
  return null;
}

export async function startOrgTrial(input: {
  organizationId: string;
  planSlug: PlanSlug;
  billingInterval: BillingInterval;
}): Promise<void> {
  const trialStartsAt = await getTrialAnchorForOrganization(input.organizationId);
  const trialEndsAt = trialEndsAtFrom(trialStartsAt);
  const billingStatus: BillingStatus = isTrialExpiredByCreatedAt(trialStartsAt)
    ? "expired"
    : "trialing";

  await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      planSlug: input.planSlug,
      billingInterval: input.billingInterval,
      billingStatus,
      trialStartsAt,
      trialEndsAt,
      paidAt: null,
      currentPeriodEndsAt: null,
    },
  });
}

export async function markOrgPaid(input: {
  organizationId: string;
  planSlug?: PlanSlug;
  billingInterval?: BillingInterval;
  currentPeriodEndsAt?: Date | null;
}): Promise<void> {
  const now = new Date();

  let periodEndsAt = input.currentPeriodEndsAt;
  if (periodEndsAt === undefined) {
    let billingInterval = input.billingInterval ?? null;
    if (!billingInterval) {
      const existing = await prisma.organization.findUnique({
        where: { id: input.organizationId },
        select: { billingInterval: true },
      });
      billingInterval =
        existing?.billingInterval === "yearly" || existing?.billingInterval === "monthly"
          ? existing.billingInterval
          : "monthly";
    }
    periodEndsAt = addBillingPeriod(now, billingInterval);
  }

  await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      ...(input.planSlug ? { planSlug: input.planSlug } : {}),
      ...(input.billingInterval ? { billingInterval: input.billingInterval } : {}),
      billingStatus: "active",
      paidAt: now,
      currentPeriodEndsAt: periodEndsAt,
    },
  });
}

/** Advance by one billing period using calendar months/years (not a fixed day count). */
export function addBillingPeriod(from: Date, interval: BillingInterval): Date {
  const next = new Date(from.getTime());
  if (interval === "yearly") {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

export async function markOrgUnpaid(organizationId: string): Promise<void> {
  const trialStartsAt = await getTrialAnchorForOrganization(organizationId);
  const trialEndsAt = trialEndsAtFrom(trialStartsAt);
  const billingStatus: BillingStatus = isTrialExpiredByCreatedAt(trialStartsAt)
    ? "expired"
    : "trialing";

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      billingStatus,
      paidAt: null,
      currentPeriodEndsAt: null,
      trialStartsAt,
      trialEndsAt,
    },
  });
}

export function filterPathsByPlanEntitlements(
  paths: Set<string>,
  billing: OrgBilling | null,
  options?: { isAdmin?: boolean },
): Set<string> {
  // Platform admins keep full navigation regardless of org trial/billing status.
  if (options?.isAdmin) {
    return new Set(paths);
  }

  if (!billing || !isBillingAccessAllowed(billing.billingStatus) || !billing.planSlug) {
    const kept = new Set<string>(BILLING_LOCKOUT_PATHS);
    for (const path of paths) {
      if (
        BILLING_LOCKOUT_PATHS.some(
          (prefix) => path === prefix || path.startsWith(`${prefix}/`),
        )
      ) {
        kept.add(path);
      }
    }
    return kept;
  }

  const next = new Set(paths);
  for (const gate of FEATURE_ROUTE_GATES) {
    if (orgHasFeatureFromBilling(billing, gate.feature)) continue;
    for (const path of [...next]) {
      if (gate.prefixes.some((prefix) => pathMatchesPrefix(path, prefix))) {
        next.delete(path);
      }
    }
  }
  return next;
}

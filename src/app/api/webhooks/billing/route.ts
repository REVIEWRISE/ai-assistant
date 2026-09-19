import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolvePlanSlugFromBillingPlanId } from "@/lib/billing-checkout";
import { markOrgPaid, markOrgUnpaid, scheduleOrgCancelAtPeriodEnd } from "@/lib/entitlements";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { writePlatformAudit } from "@/lib/platform-audit";
import { PLAN_SLUGS, type PlanSlug } from "@/lib/pricing-plans";

export const runtime = "nodejs";

const log = createLogger("billing-webhook");

type BillingEvent = {
  id: string;
  eventType: string;
  organizationId: string | null;
  customerId: string | null;
  productId: string | null;
  data: Record<string, unknown>;
};

function getWebhookSecret(): string | null {
  return process.env.VYNTRISE_WEBHOOK_SECRET?.trim() || null;
}

function verifySignature(rawBody: string, sigHeader: string | null): boolean {
  const secret = getWebhookSecret();
  if (!secret || !sigHeader) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sigHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function asDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Unix seconds vs milliseconds
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return asDate(Number(trimmed));
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function readPeriodEndFromPayload(data: Record<string, unknown>): Date | null {
  const subscription = asRecord(data.subscription);
  const itemsContainer = asRecord(subscription?.items);
  const itemsList = Array.isArray(itemsContainer?.data)
    ? (itemsContainer.data as unknown[])
    : Array.isArray(subscription?.items)
      ? (subscription.items as unknown[])
      : [];
  const firstItem = asRecord(itemsList[0]);

  const candidates: unknown[] = [
    data.periodEnd,
    data.currentPeriodEndsAt,
    data.current_period_end,
    data.currentPeriodEnd,
    subscription?.periodEnd,
    subscription?.currentPeriodEndsAt,
    subscription?.current_period_end,
    subscription?.currentPeriodEnd,
    firstItem?.current_period_end,
    firstItem?.currentPeriodEnd,
  ];

  for (const candidate of candidates) {
    const date = asDate(candidate);
    if (date) return date;
  }
  return null;
}

function asPlanSlug(value: string | null | undefined): PlanSlug | null {
  if (!value) return null;
  return (PLAN_SLUGS as readonly string[]).includes(value) ? (value as PlanSlug) : null;
}

async function resolveOrganizationId(event: BillingEvent): Promise<string | null> {
  if (event.organizationId) {
    const byId = await prisma.organization.findUnique({
      where: { id: event.organizationId },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  const customerIds = [
    event.customerId,
    asString(event.data.customerId),
    asString(event.data.customer_id),
  ].filter((value): value is string => Boolean(value));

  for (const customerId of customerIds) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM organizations
      WHERE billing_customer_id = ${customerId}
      LIMIT 1
    `;
    if (rows[0]?.id) return rows[0].id;
  }

  return null;
}

async function grantAccess(event: BillingEvent): Promise<void> {
  const organizationId = await resolveOrganizationId(event);
  if (!organizationId) return;

  const planId =
    asString(event.data.planId) ??
    asString(event.data.plan_id) ??
    asString(asRecord(event.data.subscription)?.planId);

  let planSlug: PlanSlug | undefined;
  let billingInterval: "monthly" | "yearly" | undefined;
  if (planId) {
    const resolved = await resolvePlanSlugFromBillingPlanId(planId);
    if (resolved) {
      planSlug = resolved.planSlug;
      billingInterval = resolved.billingInterval;
    }
  }

  const currentPeriodEndsAt = readPeriodEndFromPayload(event.data);

  await markOrgPaid({
    organizationId,
    ...(planSlug ? { planSlug } : {}),
    ...(billingInterval ? { billingInterval } : {}),
    ...(currentPeriodEndsAt ? { currentPeriodEndsAt } : {}),
  });
}

function isScheduledPeriodEndCancel(data: Record<string, unknown>): boolean {
  const subscription = asRecord(data.subscription) ?? {};
  const cancelAtPeriodEnd =
    asBoolean(data.cancelAtPeriodEnd) ??
    asBoolean(data.cancel_at_period_end) ??
    asBoolean(subscription.cancelAtPeriodEnd) ??
    asBoolean(subscription.cancel_at_period_end) ??
    false;
  if (!cancelAtPeriodEnd) return false;

  const periodEnd = readPeriodEndFromPayload(data);
  if (periodEnd && periodEnd.getTime() > Date.now()) return true;

  const status = (asString(subscription.status) ?? asString(data.status) ?? "").toLowerCase();
  return status === "active" || status === "trialing" || status === "past_due";
}

async function revokeAccess(event: BillingEvent): Promise<void> {
  const organizationId = await resolveOrganizationId(event);
  if (!organizationId) return;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { billingAdminOverride: true },
  });
  if (org?.billingAdminOverride) {
    log.info("skipping revoke; admin grant is protecting local access", {
      organizationId,
      eventType: event.eventType,
    });
    await writePlatformAudit({
      organizationId,
      action: "billing.webhook_revoke_skipped",
      metadata: { eventType: event.eventType, eventId: event.id, reason: "admin_override" },
    });
    return;
  }

  if (event.eventType !== "subscription.paused" && isScheduledPeriodEndCancel(event.data)) {
    await scheduleOrgCancelAtPeriodEnd(organizationId);
    return;
  }
  await markOrgUnpaid(organizationId);
}

async function markRenewal(event: BillingEvent): Promise<void> {
  const organizationId = await resolveOrganizationId(event);
  if (!organizationId) return;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, planSlug: true, billingInterval: true },
  });
  if (!org) return;

  const currentPeriodEndsAt = readPeriodEndFromPayload(event.data);
  const planSlug = asPlanSlug(org.planSlug);

  await markOrgPaid({
    organizationId,
    ...(planSlug ? { planSlug } : {}),
    ...(org.billingInterval === "yearly" || org.billingInterval === "monthly"
      ? { billingInterval: org.billingInterval }
      : {}),
    ...(currentPeriodEndsAt ? { currentPeriodEndsAt } : {}),
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-vyntrise-signature");

  if (!getWebhookSecret()) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }
  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: BillingEvent;
  try {
    const parsed = JSON.parse(rawBody) as BillingEvent;
    if (!parsed?.id || !parsed?.eventType) {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }
    event = {
      id: parsed.id,
      eventType: parsed.eventType,
      organizationId: parsed.organizationId ?? null,
      customerId: asString(parsed.customerId),
      productId: parsed.productId ?? null,
      data: asRecord(parsed.data) ?? {},
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.billingWebhookEvent.findUnique({
    where: { eventId: event.id },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.eventType) {
      case "ping":
        break;
      case "subscription.activated":
      case "subscription.manually_activated":
      case "subscription.plan_changed":
      case "subscription.resumed":
        await grantAccess(event);
        break;
      case "subscription.canceled":
      case "subscription.paused":
        await revokeAccess(event);
        break;
      case "invoice.paid":
        await markRenewal(event);
        break;
      default:
        break;
    }

    const resolvedOrganizationId = await resolveOrganizationId(event);
    if (event.eventType !== "ping") {
      await writePlatformAudit({
        organizationId: resolvedOrganizationId ?? event.organizationId,
        action: `billing.webhook_${event.eventType.replace(/\./g, "_")}`,
        metadata: { eventId: event.id, eventType: event.eventType },
      });
    }

    await prisma.billingWebhookEvent.create({
      data: {
        eventId: event.id,
        eventType: event.eventType,
        organizationId: event.organizationId,
        productId: event.productId,
        payload: event as unknown as object,
      },
    });
  } catch (error) {
    log.error("processing failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

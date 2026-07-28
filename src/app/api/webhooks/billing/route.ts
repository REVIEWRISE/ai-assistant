import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolvePlanSlugFromBillingPlanId } from "@/lib/billing-checkout";
import { markOrgPaid, markOrgUnpaid } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { PLAN_SLUGS, type PlanSlug } from "@/lib/pricing-plans";

export const runtime = "nodejs";

type BillingEvent = {
  id: string;
  eventType: string;
  organizationId: string | null;
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

function asPlanSlug(value: string | null | undefined): PlanSlug | null {
  if (!value) return null;
  return (PLAN_SLUGS as readonly string[]).includes(value) ? (value as PlanSlug) : null;
}

async function grantAccess(event: BillingEvent): Promise<void> {
  if (!event.organizationId) return;
  const org = await prisma.organization.findUnique({
    where: { id: event.organizationId },
    select: { id: true },
  });
  if (!org) return;

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

  const periodEndRaw =
    asString(event.data.periodEnd) ??
    asString(event.data.currentPeriodEndsAt) ??
    asString(event.data.current_period_end);
  const currentPeriodEndsAt = periodEndRaw ? new Date(periodEndRaw) : undefined;

  await markOrgPaid({
    organizationId: event.organizationId,
    ...(planSlug ? { planSlug } : {}),
    ...(billingInterval ? { billingInterval } : {}),
    ...(currentPeriodEndsAt && !Number.isNaN(currentPeriodEndsAt.getTime())
      ? { currentPeriodEndsAt }
      : {}),
  });
}

async function revokeAccess(organizationId: string | null): Promise<void> {
  if (!organizationId) return;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!org) return;
  await markOrgUnpaid(organizationId);
}

async function markRenewal(event: BillingEvent): Promise<void> {
  if (!event.organizationId) return;
  const org = await prisma.organization.findUnique({
    where: { id: event.organizationId },
    select: { id: true, planSlug: true, billingInterval: true },
  });
  if (!org) return;

  const periodEndRaw = asString(event.data.periodEnd);
  const currentPeriodEndsAt = periodEndRaw ? new Date(periodEndRaw) : null;
  const planSlug = asPlanSlug(org.planSlug);

  await markOrgPaid({
    organizationId: event.organizationId,
    ...(planSlug ? { planSlug } : {}),
    ...(org.billingInterval === "yearly" || org.billingInterval === "monthly"
      ? { billingInterval: org.billingInterval }
      : {}),
    ...(currentPeriodEndsAt && !Number.isNaN(currentPeriodEndsAt.getTime())
      ? { currentPeriodEndsAt }
      : {}),
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
        await revokeAccess(event.organizationId);
        break;
      case "invoice.paid":
        await markRenewal(event);
        break;
      default:
        break;
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
    console.error("[billing-webhook]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

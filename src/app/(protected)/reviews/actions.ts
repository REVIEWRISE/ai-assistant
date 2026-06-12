"use server";

import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseRequiredFieldRules, syncSingleConnectedReviewProvider } from "@/lib/review-sync";

const REVIEWS_ROUTE = "/reviews";

function readTokenRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

export async function completeReviewProviderLocation(formData: FormData) {
  const providerId = String(formData.get("provider_id") || "").trim();
  const locationKey = String(formData.get("location_key") || "").trim();
  const parts = locationKey.split("::");
  const accountId = parts[0] ?? "";
  const locationId = parts[1] ?? "";
  const locationTitle = parts[2] ? decodeURIComponent(parts[2]) : "";
  const locationName = parts[3] ? decodeURIComponent(parts[3]) : "";

  if (!providerId || !accountId || !locationId) {
    redirect(`${REVIEWS_ROUTE}?error=missing_required_connection_fields`);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { userId: true, activeOrganizationId: true },
  });
  if (!session) redirect("/login");
  if (!session.activeOrganizationId) redirect(`${REVIEWS_ROUTE}?error=organization_required`);

  const provider = await prisma.provider.findFirst({
    where: { id: providerId, type: "review", status: "enabled" },
    select: { id: true, name: true },
  });
  if (!provider) redirect(`${REVIEWS_ROUTE}?error=provider_not_found`);

  const connection = await prisma.providerConnection.findUnique({
    where: { userId_providerId: { userId: session.userId, providerId: provider.id } },
    select: { tokenData: true },
  });
  if (!connection) redirect(`${REVIEWS_ROUTE}?error=provider_not_connected`);

  const mergedTokenData = {
    ...readTokenRecord(connection.tokenData),
    account_id: accountId,
    location_id: locationId,
    location_name: locationName,
    location_title: locationTitle,
  };

  await prisma.providerConnection.update({
    where: { userId_providerId: { userId: session.userId, providerId: provider.id } },
    data: {
      connected: true,
      tokenData: mergedTokenData as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: session.activeOrganizationId,
      actorId: session.userId,
      action: "organization_review_provider_connected",
      metadata: {
        providerId: provider.id,
        providerName: provider.name,
        connectionUserId: session.userId,
        accountId,
        locationId,
      },
    },
  });

  redirect(`${REVIEWS_ROUTE}?success=provider_connected`);
}

export async function connectReviewProvider(formData: FormData) {
  const providerId = String(formData.get("provider_id") || "").trim();
  const connectionDetailsRaw = String(formData.get("connection_details") || "").trim();

  if (!providerId) {
    redirect(`${REVIEWS_ROUTE}?error=provider_missing`);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { userId: true },
  });
  if (!session) redirect("/login");

  const provider = await prisma.provider.findFirst({
    where: { id: providerId, type: "review", status: "enabled" },
    select: { id: true, config: true },
  });
  if (!provider) {
    redirect(`${REVIEWS_ROUTE}?error=provider_not_found`);
  }

  let details: Record<string, string> = {};
  if (connectionDetailsRaw) {
    try {
      const parsed = JSON.parse(connectionDetailsRaw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        details = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>)
            .map(([k, v]) => [k.trim(), String(v ?? "").trim()])
            .filter(([k, v]) => k && v),
        );
      }
    } catch {
      // keep details empty on malformed payload
    }
  }

  const fieldRules = parseRequiredFieldRules(provider.config);
  if (fieldRules.length > 0) {
    const allowed = new Set(fieldRules.map((f) => f.key));
    details = Object.fromEntries(Object.entries(details).filter(([k]) => allowed.has(k)));
    const missingRequired = fieldRules
      .filter((f) => f.required)
      .some((f) => !String(details[f.key] ?? "").trim());
    if (missingRequired) {
      redirect(`${REVIEWS_ROUTE}?error=missing_required_connection_fields`);
    }
  }

  await prisma.providerConnection.upsert({
    where: {
      userId_providerId: { userId: session.userId, providerId: provider.id },
    },
    create: {
      userId: session.userId,
      providerId: provider.id,
      connected: true,
      tokenData: details as unknown as Prisma.InputJsonValue,
    },
    update: {
      connected: true,
      tokenData: details as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  redirect(`${REVIEWS_ROUTE}?success=provider_connected`);
}

export async function syncReviewProvider(formData: FormData) {
  const providerId = String(formData.get("provider_id") || "").trim();
  if (!providerId) {
    redirect(`${REVIEWS_ROUTE}?error=provider_missing`);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: {
      userId: true,
      activeOrganizationId: true,
      user: {
        select: {
          organizationMembers: {
            select: { organizationId: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!session) redirect("/login");
  const organizationId =
    session.activeOrganizationId ?? session.user.organizationMembers[0]?.organizationId ?? null;
  if (!organizationId) {
    redirect("/appointments/organization");
  }

  const result = await syncSingleConnectedReviewProvider({
    userId: session.userId,
    providerId,
    organizationId,
  });

  if (result.status === "provider_not_found") {
    redirect(`${REVIEWS_ROUTE}?error=provider_not_found`);
  }
  if (result.status === "provider_not_connected") {
    redirect(`${REVIEWS_ROUTE}?error=provider_not_connected`);
  }
  if (result.status === "missing_location") {
    redirect(`${REVIEWS_ROUTE}?error=review_sync_missing_location`);
  }
  if (result.status === "api_failed") {
    const q = encodeURIComponent(result.error.slice(0, 240));
    redirect(`${REVIEWS_ROUTE}?error=review_sync_api_failed&detail=${q}`);
  }
  if (result.status === "empty") {
    redirect(`${REVIEWS_ROUTE}?success=review_sync_empty`);
  }
  if (result.inserted === 0) {
    redirect(`${REVIEWS_ROUTE}?tab=workflow&success=review_sync_up_to_date`);
  }

  redirect(`${REVIEWS_ROUTE}?tab=workflow&success=review_sync_done`);
}

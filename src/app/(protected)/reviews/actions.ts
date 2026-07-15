"use server";

import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseRequiredFieldRules, syncSingleConnectedReviewProvider } from "@/lib/review-sync";
import { parseReviewRoutingForm } from "@/lib/review-routing";
import { parseReviewSyncCronForm } from "@/lib/review-sync-cron";
import { parseReviewReplyAutomationForm } from "@/lib/review-reply-automation";
import {
  publishReviewReply as publishReviewReplyCore,
  saveReviewResponseDraft,
  type ReviewReplyActionResult,
} from "@/lib/review-reply-publish";
import { detectReviewIntegration } from "@/lib/review-provider-integration";
import { verifyYelpConnection, cleanYelpBaseUrl } from "@/lib/yelp-fusion";

const REVIEWS_ROUTE = "/reviews";

function readTokenRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

async function requireReviewOrgSession(organizationId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { userId: true, activeOrganizationId: true },
  });
  if (!session) redirect("/login");
  if (!session.activeOrganizationId || session.activeOrganizationId !== organizationId) {
    return null;
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.userId, organizationId },
    select: { id: true },
  });
  if (!membership) return null;

  return session;
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
    select: { id: true, name: true, apiUrl: true, config: true },
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

  const fieldRules = (() => {
    const rules = parseRequiredFieldRules(provider.config);
    const integration = detectReviewIntegration(provider);
    if (rules.length > 0) return rules;
    if (integration === "yelp_fusion") {
      return [
        { key: "api_key", required: true },
        { key: "business_id", required: true },
      ];
    }
    return rules;
  })();
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

  const integration = detectReviewIntegration(provider);
  if (integration === "yelp_fusion") {
    const verify = await verifyYelpConnection(
      String(details.api_key ?? "") || String(readTokenRecord(provider.config).api_key ?? ""),
      String(details.business_id ?? ""),
      provider.apiUrl,
    );
    if (!verify.ok) {
      const q = encodeURIComponent(verify.error.slice(0, 240));
      redirect(`${REVIEWS_ROUTE}?error=yelp_connection_failed&detail=${q}`);
    }
    details = {
      ...details,
      business_name: verify.business.name,
      location_title: verify.business.name,
      location_id: verify.business.id,
    };
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

export async function saveReviewRoutingRules(formData: FormData) {
  const organizationId = String(formData.get("organization_id") || "").trim();
  if (!organizationId) {
    redirect(`${REVIEWS_ROUTE}?error=organization_required`);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { userId: true, activeOrganizationId: true },
  });
  if (!session) redirect("/login");
  if (!session.activeOrganizationId || session.activeOrganizationId !== organizationId) {
    redirect(`${REVIEWS_ROUTE}?error=organization_required`);
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.userId, organizationId },
    select: { id: true },
  });
  if (!membership) {
    redirect(`${REVIEWS_ROUTE}?error=organization_required`);
  }

  const routingRules = parseReviewRoutingForm(
    Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
    ),
  );

  await prisma.organizationReviewSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      routingRules: routingRules as unknown as Prisma.InputJsonValue,
    },
    update: {
      routingRules: routingRules as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  redirect(`${REVIEWS_ROUTE}?tab=configuration&success=review_routing_saved`);
}

export async function saveReviewSyncCron(formData: FormData) {
  const organizationId = String(formData.get("organization_id") || "").trim();
  if (!organizationId) {
    redirect(`${REVIEWS_ROUTE}?error=organization_required`);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { userId: true, activeOrganizationId: true },
  });
  if (!session) redirect("/login");
  if (!session.activeOrganizationId || session.activeOrganizationId !== organizationId) {
    redirect(`${REVIEWS_ROUTE}?error=organization_required`);
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.userId, organizationId },
    select: { id: true },
  });
  if (!membership) {
    redirect(`${REVIEWS_ROUTE}?error=organization_required`);
  }

  const formEntries = Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
  );
  const syncCron = parseReviewSyncCronForm(formEntries);
  const replyAutomation = parseReviewReplyAutomationForm(formEntries);

  await prisma.organizationReviewSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      syncCron: syncCron as unknown as Prisma.InputJsonValue,
      replyAutomation: replyAutomation as unknown as Prisma.InputJsonValue,
    },
    update: {
      syncCron: syncCron as unknown as Prisma.InputJsonValue,
      replyAutomation: replyAutomation as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  redirect(`${REVIEWS_ROUTE}?tab=configuration&success=review_sync_cron_saved`);
}

export async function saveReviewDraft(
  organizationId: string,
  reviewId: string,
  responseText: string,
): Promise<ReviewReplyActionResult> {
  const session = await requireReviewOrgSession(organizationId);
  if (!session) {
    return { ok: false, error: "You do not have access to this organization." };
  }

  return saveReviewResponseDraft({ organizationId, reviewId, responseText });
}

export async function publishReviewReply(
  organizationId: string,
  reviewId: string,
  responseText: string,
): Promise<ReviewReplyActionResult> {
  const session = await requireReviewOrgSession(organizationId);
  if (!session) {
    return { ok: false, error: "You do not have access to this organization." };
  }

  return publishReviewReplyCore({
    organizationId,
    reviewId,
    responseText,
    userId: session.userId,
  });
}

export type YelpBusinessSearchResult = {
  id: string;
  name: string;
  alias: string;
  location: string;
  rating?: number;
  image_url?: string;
};

interface YelpRawBusiness {
  id: string;
  name: string;
  alias: string;
  location?: {
    display_address?: string[];
  };
  rating?: number;
  image_url?: string;
}

export async function searchYelpBusinessesAction(
  term: string,
  location: string,
): Promise<{ ok: true; businesses: YelpBusinessSearchResult[] } | { ok: false; error: string }> {
  try {
    const provider = await prisma.provider.findFirst({
      where: { name: "Yelp", type: "review", status: "enabled" },
    });
    if (!provider) {
      return { ok: false, error: "Yelp provider is not configured." };
    }
    const config = readTokenRecord(provider.config);
    const apiKey = String(config.api_key ?? "");
    if (!apiKey) {
      return { ok: false, error: "Global Yelp API key is missing. Please add it to the Yelp Provider Settings." };
    }

    const base = cleanYelpBaseUrl(provider.apiUrl) || "https://api.yelp.com/v3";
    const params = new URLSearchParams({
      term: term.trim(),
      location: location.trim(),
      limit: "5",
    });
    const res = await fetch(`${base}/businesses/search?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      let message = text.slice(0, 200);
      try {
        const json = JSON.parse(text);
        if (json.error?.description) {
          message = json.error.description;
        } else if (json.error?.code) {
          message = json.error.code;
        }
      } catch {
        // ignore parse error
      }
      return { ok: false, error: `Yelp Search API error: ${message}` };
    }

    const data = await res.json();
    const rawBusinesses = (data.businesses || []) as YelpRawBusiness[];
    const businesses = rawBusinesses.map((b) => ({
      id: b.id,
      name: b.name,
      alias: b.alias,
      location: b.location?.display_address?.join(", ") || "",
      rating: b.rating,
      image_url: b.image_url,
    }));

    return { ok: true, businesses };
  } catch (e) {
    const error = e instanceof Error ? e.message : "An unexpected error occurred during Yelp search.";
    return { ok: false, error };
  }
}

import { prisma } from "@/lib/prisma";
import {
  resolveReviewSyncCronConfig,
  shouldRunReviewSyncCron,
  type ReviewSyncCronConfig,
} from "@/lib/review-sync-cron";
import { draftRepliesForSyncedReviews } from "@/lib/review-reply-ai";
import { autoPublishSyncedReviews } from "@/lib/review-reply-publish";
import { resolveReviewReplyAutomationConfig } from "@/lib/review-reply-automation";
import { detectReviewIntegration } from "@/lib/review-provider-integration";
import { fetchAllGbpReviewsForToken } from "@/lib/google-business-profile";
import {
  fetchYelpReviewsForConnection,
  yelpUsePrivateReviewsApi,
} from "@/lib/yelp-fusion";
import {
  asOAuthProviderConfig,
  getValidOAuthAccessToken,
  isOAuthProviderConfig,
} from "@/lib/google-oauth";

type RequiredFieldRule = { key: string; required: boolean };
type ConnectionTokenData = Record<string, unknown>;
type NormalizedIncomingReview = {
  googleReviewId: string | null;
  rating: number;
  reviewText: string;
  responseText: string | null;
  status: "pending" | "responded";
};

type FetchReviewsResult = {
  reviews: NormalizedIncomingReview[];
  error?: string;
};

export type SyncReviewProviderResult =
  | { status: "provider_not_found"; inserted: 0; fetched: 0 }
  | { status: "provider_not_connected"; inserted: 0; fetched: 0 }
  | { status: "missing_location"; inserted: 0; fetched: 0 }
  | { status: "api_failed"; inserted: 0; fetched: 0; error: string }
  | { status: "synced"; inserted: number; fetched: number }
  | { status: "empty"; inserted: 0; fetched: 0 };

export type SyncAllReviewProvidersResult = {
  totalConnections: number;
  attempted: number;
  synced: number;
  empty: number;
  failed: number;
  totalInserted: number;
  details: Array<{
    userId: string;
    providerId: string;
    providerName: string;
    organizationId: string | null;
    status: SyncReviewProviderResult["status"] | "organization_missing" | "failed";
    inserted: number;
    fetched: number;
    error?: string;
  }>;
};

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function parseGoogleStarRating(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = Math.floor(v);
    return n >= 1 && n <= 5 ? n : null;
  }
  const s = readString(v).toUpperCase();
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
    STAR_RATING_UNSPECIFIED: 0,
  };
  const n = map[s];
  return n >= 1 && n <= 5 ? n : null;
}

function normalizeGenericItem(item: Record<string, unknown>): NormalizedIncomingReview | null {
  const ratingRaw = item.rating ?? item.stars ?? item.score;
  const ratingNum =
    typeof ratingRaw === "number"
      ? Math.floor(ratingRaw)
      : /^\d+$/.test(readString(ratingRaw))
        ? parseInt(readString(ratingRaw), 10)
        : null;
  const reviewText =
    readString(item.reviewText) ||
    readString(item.review_text) ||
    readString(item.text) ||
    readString(item.comment) ||
    readString(item.content);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5 || !reviewText) return null;
  return {
    googleReviewId: null,
    rating: ratingNum,
    reviewText: reviewText.slice(0, 8000),
    responseText: null,
    status: "pending",
  };
}

function parseGoogleReviewId(rec: Record<string, unknown>): string | null {
  const direct = readString(rec.reviewId);
  if (direct) return direct.slice(0, 200);
  const name = readString(rec.name);
  const match = name.match(/\/reviews\/([^/]+)$/);
  return match?.[1]?.slice(0, 200) ?? null;
}

function normalizeGoogleBusinessProfileReview(rec: Record<string, unknown>): NormalizedIncomingReview | null {
  const rating = parseGoogleStarRating(rec.starRating);
  if (!rating) return null;

  const comment = readString(rec.comment);
  const reviewer = asRecord(rec.reviewer);
  const reviewerName = readString(reviewer.displayName);
  const reviewText =
    comment ||
    (reviewerName
      ? `${reviewerName} left a ${rating}-star review (no written comment)`
      : "(Rating only — no written comment)");
  const replyRec = asRecord(rec.reviewReply);
  const ownerReply = readString(replyRec.comment);

  return {
    googleReviewId: parseGoogleReviewId(rec),
    rating,
    reviewText: reviewText.slice(0, 8000),
    responseText: ownerReply ? ownerReply.slice(0, 8000) : null,
    status: ownerReply ? "responded" : "pending",
  };
}

async function fetchGoogleBusinessProfileReviews(
  provider: { config: unknown },
  tokenData: ConnectionTokenData,
  persistTokenData?: (next: ConnectionTokenData) => Promise<void>,
): Promise<FetchReviewsResult> {
  const config = asRecord(provider.config);
  const accountId = readString(tokenData.account_id) || readString(config.account_id);
  const locationId = readString(tokenData.location_id) || readString(config.location_id);
  if (!accountId || !locationId) {
    return { reviews: [], error: "missing_location" };
  }

  let accessToken = readString(tokenData.access_token) || readString(tokenData.api_key);
  if (isOAuthProviderConfig(provider.config) && persistTokenData) {
    const tokenResult = await getValidOAuthAccessToken({
      config: asOAuthProviderConfig(provider.config),
      tokenData,
      persist: async (next) => {
        await persistTokenData(next as ConnectionTokenData);
      },
    });
    if ("error" in tokenResult) {
      return { reviews: [], error: `Google token refresh failed: ${tokenResult.error}` };
    }
    accessToken = tokenResult.accessToken;
  }
  if (!accessToken) {
    return { reviews: [], error: "missing_access_token" };
  }

  const gbpResult = await fetchAllGbpReviewsForToken(accessToken, tokenData);
  if (!gbpResult.ok) {
    if (gbpResult.error === "missing_location") {
      return { reviews: [], error: "missing_location" };
    }
    console.error("[review-sync] Google reviews fetch failed", gbpResult.error);
    return { reviews: [], error: gbpResult.error };
  }

  const reviews: NormalizedIncomingReview[] = [];
  for (const row of gbpResult.reviews) {
    const normalized = normalizeGoogleBusinessProfileReview(row);
    if (normalized) reviews.push(normalized);
  }

  if (reviews.length === 0 && (gbpResult.totalReviewCount ?? 0) > 0) {
    return {
      reviews: [],
      error: `Google reports ${gbpResult.totalReviewCount} review(s) but we could not parse them. Try reconnecting your location.`,
    };
  }

  return { reviews };
}

async function fetchGenericHttpReviews(
  provider: { apiUrl: string | null; config: unknown },
  tokenData: ConnectionTokenData,
): Promise<FetchReviewsResult> {
  const config = asRecord(provider.config);
  const url = readString(config.reviews_url) || readString(provider.apiUrl);
  if (!url) return { reviews: [] };
  const authHeader = readString(config.auth_header) || "Authorization";
  const authTokenField = readString(config.auth_token_field) || "api_key";
  const authScheme = readString(config.auth_scheme).toLowerCase() || "bearer";
  const token = readString(tokenData[authTokenField]);
  const headers: Record<string, string> = {};
  if (token) {
    headers[authHeader] = authScheme === "none" ? token : `${authScheme} ${token}`.trim();
  }
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { reviews: [], error: `Reviews API returned HTTP ${res.status}: ${text.slice(0, 300)}` };
  }
  const json = (await res.json()) as unknown;
  const rec = asRecord(json);
  const items = Array.isArray(json)
    ? json
    : Array.isArray(rec.reviews)
      ? rec.reviews
      : Array.isArray(rec.data)
        ? rec.data
        : [];
  const reviews = items
    .map((item) => normalizeGenericItem(asRecord(item)))
    .filter((x): x is NormalizedIncomingReview => x != null);
  return { reviews };
}

async function fetchYelpFusionProviderReviews(
  provider: { config: unknown },
  tokenData: ConnectionTokenData,
): Promise<FetchReviewsResult> {
  const apiKey = readString(tokenData.api_key);
  const businessId =
    readString(tokenData.business_id) || readString(asRecord(provider.config).business_id);
  if (!businessId) {
    return { reviews: [], error: "missing_location" };
  }
  if (!apiKey) {
    return { reviews: [], error: "Yelp API key is missing. Reconnect Yelp under Integrations." };
  }

  const yelpResult = await fetchYelpReviewsForConnection({
    apiKey,
    businessId,
    usePrivateApi: yelpUsePrivateReviewsApi(provider.config),
  });
  if (!yelpResult.ok) {
    if (yelpResult.error === "missing_business") {
      return { reviews: [], error: "missing_location" };
    }
    console.error("[review-sync] Yelp reviews fetch failed", yelpResult.error);
    return { reviews: [], error: yelpResult.error };
  }

  const reviews: NormalizedIncomingReview[] = yelpResult.reviews.map((row) => ({
    googleReviewId: row.externalReviewId,
    rating: row.rating,
    reviewText: row.reviewText,
    responseText: row.responseText,
    status: row.status,
  }));

  if (reviews.length === 0 && yelpResult.total > 0) {
    return {
      reviews: [],
      error: `Yelp reports ${yelpResult.total} review(s) but we could not import them. Try reconnecting the business.`,
    };
  }

  if (reviews.length === 0 && yelpResult.source === "fusion") {
    return {
      reviews: [],
      error:
        "Yelp Fusion returned no review excerpts. Confirm your API plan includes Reviews access and that the business has public reviews.",
    };
  }

  return { reviews };
}

async function fetchReviewsByIntegration(args: {
  provider: { name: string; apiUrl: string | null; config: unknown };
  tokenData: ConnectionTokenData;
  persistTokenData?: (next: ConnectionTokenData) => Promise<void>;
}): Promise<FetchReviewsResult> {
  const integration = detectReviewIntegration(args.provider);
  if (integration === "google_business_profile") {
    return fetchGoogleBusinessProfileReviews(args.provider, args.tokenData, args.persistTokenData);
  }
  if (integration === "yelp_fusion") {
    return fetchYelpFusionProviderReviews(args.provider, args.tokenData);
  }
  if (integration === "generic_http_reviews") {
    return fetchGenericHttpReviews(args.provider, args.tokenData);
  }
  return { reviews: [], error: "Review provider integration is not configured." };
}

export function parseRequiredFieldRules(rawConfig: unknown): RequiredFieldRule[] {
  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) return [];
  const arr = (rawConfig as Record<string, unknown>).connection_required_fields;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((entry): RequiredFieldRule | null => {
      if (typeof entry === "string") {
        const key = entry.trim();
        if (!key) return null;
        return { key, required: true };
      }
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const rec = entry as Record<string, unknown>;
      const key = String(rec.key ?? "").trim();
      if (!key) return null;
      return { key, required: rec.required !== false };
    })
    .filter((x): x is RequiredFieldRule => x != null)
    .slice(0, 12);
}

export async function syncSingleConnectedReviewProvider(args: {
  userId: string;
  providerId: string;
  organizationId: string;
}): Promise<SyncReviewProviderResult> {
  const provider = await prisma.provider.findFirst({
    where: { id: args.providerId, type: "review", status: "enabled" },
    select: { id: true, name: true, apiUrl: true, config: true },
  });
  if (!provider) return { status: "provider_not_found", inserted: 0, fetched: 0 };

  const connection = await prisma.providerConnection.findUnique({
    where: { userId_providerId: { userId: args.userId, providerId: provider.id } },
    select: { id: true, connected: true, tokenData: true },
  });
  if (!connection?.connected) return { status: "provider_not_connected", inserted: 0, fetched: 0 };

  const tokenData = asRecord(connection.tokenData);
  const fetchResult = await fetchReviewsByIntegration({
    provider,
    tokenData,
    persistTokenData: async (next) => {
      await prisma.providerConnection.update({
        where: { userId_providerId: { userId: args.userId, providerId: provider.id } },
        data: { tokenData: next as object, updatedAt: new Date() },
      });
    },
  });

  if (fetchResult.error === "missing_location") {
    return { status: "missing_location", inserted: 0, fetched: 0 };
  }
  if (fetchResult.error) {
    return { status: "api_failed", inserted: 0, fetched: 0, error: fetchResult.error };
  }

  const candidates = fetchResult.reviews.slice(0, 200);
  if (candidates.length === 0) {
    await prisma.providerConnection.update({
      where: { userId_providerId: { userId: args.userId, providerId: provider.id } },
      data: { updatedAt: new Date() },
    });
    return { status: "empty", inserted: 0, fetched: 0 };
  }

  const existing = await prisma.review.findMany({
    where: { organizationId: args.organizationId, provider: provider.name },
    select: { reviewText: true, rating: true, externalReviewId: true },
    take: 5000,
  });
  const existingByGoogleId = new Set(
    existing.map((r) => r.externalReviewId).filter((id): id is string => Boolean(id)),
  );
  const existingByContent = new Set(existing.map((r) => `${r.rating}::${r.reviewText.trim()}`));
  const toInsert = candidates.filter((r) => {
    if (r.googleReviewId && existingByGoogleId.has(r.googleReviewId)) return false;
    return !existingByContent.has(`${r.rating}::${r.reviewText.trim()}`);
  });

  if (toInsert.length > 0) {
    const insertedSince = new Date();
    await prisma.review.createMany({
      data: toInsert.map((r) => ({
        organizationId: args.organizationId,
        provider: provider.name,
        externalReviewId: r.googleReviewId,
        rating: r.rating,
        reviewText: r.reviewText,
        responseText: r.responseText,
        status: r.status,
      })),
    });

    const settingsRow = await prisma.organizationReviewSettings.findUnique({
      where: { organizationId: args.organizationId },
      select: { replyAutomation: true },
    });
    const automation = resolveReviewReplyAutomationConfig(settingsRow?.replyAutomation);
    const draftResult = await draftRepliesForSyncedReviews({
      organizationId: args.organizationId,
      providerName: provider.name,
      since: insertedSince,
      automation,
    });
    if (draftResult.drafted > 0) {
      console.info(
        `[review-sync] drafted ${draftResult.drafted} AI reply(s) for org ${args.organizationId.slice(0, 8)}`,
      );
    }

    const publishResult = await autoPublishSyncedReviews({
      organizationId: args.organizationId,
      providerName: provider.name,
      userId: args.userId,
      since: insertedSince,
    });
    if (publishResult.published > 0) {
      console.info(
        `[review-sync] auto-published ${publishResult.published} reply(s) for org ${args.organizationId.slice(0, 8)}`,
      );
    }
    if (publishResult.failed > 0) {
      console.warn(
        `[review-sync] ${publishResult.failed} auto-publish attempt(s) failed for org ${args.organizationId.slice(0, 8)}`,
      );
    }
  }

  await prisma.providerConnection.update({
    where: { userId_providerId: { userId: args.userId, providerId: provider.id } },
    data: { updatedAt: new Date() },
  });

  return { status: "synced", inserted: toInsert.length, fetched: candidates.length };
}

export async function syncAllConnectedReviewProviders(): Promise<SyncAllReviewProvidersResult> {
  const connections = await prisma.providerConnection.findMany({
    where: {
      connected: true,
      provider: { type: "review", status: "enabled" },
    },
    select: {
      userId: true,
      providerId: true,
      provider: { select: { name: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  const result: SyncAllReviewProvidersResult = {
    totalConnections: connections.length,
    attempted: 0,
    synced: 0,
    empty: 0,
    failed: 0,
    totalInserted: 0,
    details: [],
  };

  for (const row of connections) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: row.userId },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });
    if (!membership?.organizationId) {
      result.failed += 1;
      result.details.push({
        userId: row.userId,
        providerId: row.providerId,
        providerName: row.provider.name,
        organizationId: null,
        status: "organization_missing",
        inserted: 0,
        fetched: 0,
      });
      continue;
    }

    result.attempted += 1;
    try {
      const syncResult = await syncSingleConnectedReviewProvider({
        userId: row.userId,
        providerId: row.providerId,
        organizationId: membership.organizationId,
      });
      if (syncResult.status === "synced") {
        result.synced += 1;
        result.totalInserted += syncResult.inserted;
      } else if (syncResult.status === "empty") {
        result.empty += 1;
      } else {
        result.failed += 1;
      }

      result.details.push({
        userId: row.userId,
        providerId: row.providerId,
        providerName: row.provider.name,
        organizationId: membership.organizationId,
        status: syncResult.status,
        inserted: syncResult.inserted,
        fetched: syncResult.fetched,
      });
    } catch (error) {
      result.failed += 1;
      result.details.push({
        userId: row.userId,
        providerId: row.providerId,
        providerName: row.provider.name,
        organizationId: membership.organizationId,
        status: "failed",
        inserted: 0,
        fetched: 0,
        error: error instanceof Error ? error.message : "Unknown sync error",
      });
    }
  }

  return result;
}

async function markReviewSyncCronRun(organizationId: string, existing: ReviewSyncCronConfig) {
  const nextConfig: ReviewSyncCronConfig = {
    ...existing,
    lastRunAt: new Date().toISOString(),
  };
  await prisma.organizationReviewSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      syncCron: nextConfig as unknown as object,
    },
    update: {
      syncCron: nextConfig as unknown as object,
      updatedAt: new Date(),
    },
  });
}

/** Sync review providers for organizations with scheduled sync enabled and due for a run. */
export async function syncScheduledReviewProviders(): Promise<SyncAllReviewProvidersResult> {
  const orgSettings = await prisma.organizationReviewSettings.findMany({
    select: { organizationId: true, syncCron: true },
  });

  const nowMs = Date.now();
  const dueOrgIds = new Set<string>();
  const cronConfigByOrg = new Map<string, ReviewSyncCronConfig>();

  for (const row of orgSettings) {
    const config = resolveReviewSyncCronConfig(row.syncCron);
    cronConfigByOrg.set(row.organizationId, config);
    if (shouldRunReviewSyncCron(config, nowMs)) {
      dueOrgIds.add(row.organizationId);
    }
  }

  if (dueOrgIds.size === 0) {
    return {
      totalConnections: 0,
      attempted: 0,
      synced: 0,
      empty: 0,
      failed: 0,
      totalInserted: 0,
      details: [],
    };
  }

  const connections = await prisma.providerConnection.findMany({
    where: {
      connected: true,
      provider: { type: "review", status: "enabled" },
    },
    select: {
      userId: true,
      providerId: true,
      provider: { select: { name: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  const result: SyncAllReviewProvidersResult = {
    totalConnections: connections.length,
    attempted: 0,
    synced: 0,
    empty: 0,
    failed: 0,
    totalInserted: 0,
    details: [],
  };

  const orgsAttempted = new Set<string>();

  for (const row of connections) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: row.userId },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });
    if (!membership?.organizationId) {
      result.failed += 1;
      result.details.push({
        userId: row.userId,
        providerId: row.providerId,
        providerName: row.provider.name,
        organizationId: null,
        status: "organization_missing",
        inserted: 0,
        fetched: 0,
      });
      continue;
    }

    if (!dueOrgIds.has(membership.organizationId)) {
      continue;
    }

    result.attempted += 1;
    orgsAttempted.add(membership.organizationId);

    try {
      const syncResult = await syncSingleConnectedReviewProvider({
        userId: row.userId,
        providerId: row.providerId,
        organizationId: membership.organizationId,
      });
      if (syncResult.status === "synced") {
        result.synced += 1;
        result.totalInserted += syncResult.inserted;
      } else if (syncResult.status === "empty") {
        result.empty += 1;
      } else {
        result.failed += 1;
      }

      result.details.push({
        userId: row.userId,
        providerId: row.providerId,
        providerName: row.provider.name,
        organizationId: membership.organizationId,
        status: syncResult.status,
        inserted: syncResult.inserted,
        fetched: syncResult.fetched,
        ...(syncResult.status === "api_failed" ? { error: syncResult.error } : {}),
      });
    } catch (error) {
      result.failed += 1;
      result.details.push({
        userId: row.userId,
        providerId: row.providerId,
        providerName: row.provider.name,
        organizationId: membership.organizationId,
        status: "failed",
        inserted: 0,
        fetched: 0,
        error: error instanceof Error ? error.message : "Unknown sync error",
      });
    }
  }

  for (const organizationId of orgsAttempted) {
    const config = cronConfigByOrg.get(organizationId) ?? resolveReviewSyncCronConfig(null);
    await markReviewSyncCronRun(organizationId, config);
  }

  return result;
}

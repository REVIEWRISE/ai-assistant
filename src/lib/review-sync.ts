import { prisma } from "@/lib/prisma";
import { buildGbpReviewsUrl } from "@/lib/google-business-profile";
import {
  asOAuthProviderConfig,
  getValidOAuthAccessToken,
  isOAuthProviderConfig,
} from "@/lib/google-oauth";

type RequiredFieldRule = { key: string; required: boolean };
type ProviderConfig = Record<string, unknown>;
type ConnectionTokenData = Record<string, unknown>;
type NormalizedIncomingReview = {
  rating: number;
  reviewText: string;
};

export type SyncReviewProviderResult =
  | { status: "provider_not_found"; inserted: 0; fetched: 0 }
  | { status: "provider_not_connected"; inserted: 0; fetched: 0 }
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

function parseIntegration(config: ProviderConfig): string {
  return readString(config.integration).toLowerCase().replace(/-/g, "_");
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
  return { rating: ratingNum, reviewText: reviewText.slice(0, 8000) };
}

async function fetchGoogleBusinessProfileReviews(
  provider: { config: unknown },
  tokenData: ConnectionTokenData,
  persistTokenData?: (next: ConnectionTokenData) => Promise<void>,
): Promise<NormalizedIncomingReview[]> {
  const config = asRecord(provider.config);
  const accountId = readString(tokenData.account_id) || readString(config.account_id);
  const locationId = readString(tokenData.location_id) || readString(config.location_id);
  if (!accountId || !locationId) return [];

  let accessToken = readString(tokenData.access_token) || readString(tokenData.api_key);
  if (isOAuthProviderConfig(provider.config) && persistTokenData) {
    const tokenResult = await getValidOAuthAccessToken({
      config: asOAuthProviderConfig(provider.config),
      tokenData,
      persist: async (next) => {
        await persistTokenData(next as ConnectionTokenData);
      },
    });
    if ("error" in tokenResult) return [];
    accessToken = tokenResult.accessToken;
  }
  if (!accessToken) return [];

  const reviews: NormalizedIncomingReview[] = [];
  let pageToken = "";
  for (let page = 0; page < 5; page += 1) {
    const url = buildGbpReviewsUrl(accountId, locationId, pageToken || undefined);
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const json = (await res.json()) as Record<string, unknown>;
    const rows = Array.isArray(json.reviews) ? json.reviews : [];
    for (const row of rows) {
      const rec = asRecord(row);
      const rating = parseGoogleStarRating(rec.starRating);
      const reviewText = readString(rec.comment);
      if (!rating || !reviewText) continue;
      reviews.push({ rating, reviewText: reviewText.slice(0, 8000) });
    }
    pageToken = readString(json.nextPageToken);
    if (!pageToken) break;
  }
  return reviews;
}

async function fetchGenericHttpReviews(
  provider: { apiUrl: string | null; config: unknown },
  tokenData: ConnectionTokenData,
): Promise<NormalizedIncomingReview[]> {
  const config = asRecord(provider.config);
  const url = readString(config.reviews_url) || readString(provider.apiUrl);
  if (!url) return [];
  const authHeader = readString(config.auth_header) || "Authorization";
  const authTokenField = readString(config.auth_token_field) || "api_key";
  const authScheme = readString(config.auth_scheme).toLowerCase() || "bearer";
  const token = readString(tokenData[authTokenField]);
  const headers: Record<string, string> = {};
  if (token) {
    headers[authHeader] = authScheme === "none" ? token : `${authScheme} ${token}`.trim();
  }
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) return [];
  const json = (await res.json()) as unknown;
  const rec = asRecord(json);
  const items = Array.isArray(json)
    ? json
    : Array.isArray(rec.reviews)
      ? rec.reviews
      : Array.isArray(rec.data)
        ? rec.data
        : [];
  return items
    .map((item) => normalizeGenericItem(asRecord(item)))
    .filter((x): x is NormalizedIncomingReview => x != null);
}

async function fetchReviewsByIntegration(args: {
  provider: { apiUrl: string | null; config: unknown };
  tokenData: ConnectionTokenData;
  persistTokenData?: (next: ConnectionTokenData) => Promise<void>;
}): Promise<NormalizedIncomingReview[]> {
  const config = asRecord(args.provider.config);
  const integration = parseIntegration(config);
  if (integration === "google_business_profile") {
    return fetchGoogleBusinessProfileReviews(args.provider, args.tokenData, args.persistTokenData);
  }
  if (integration === "generic_http_reviews" || integration === "custom_http_json" || integration === "") {
    return fetchGenericHttpReviews(args.provider, args.tokenData);
  }
  return [];
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
  const fetched = await fetchReviewsByIntegration({
    provider,
    tokenData,
    persistTokenData: async (next) => {
      await prisma.providerConnection.update({
        where: { userId_providerId: { userId: args.userId, providerId: provider.id } },
        data: { tokenData: next as object, updatedAt: new Date() },
      });
    },
  });
  const candidates = fetched.slice(0, 200);
  if (candidates.length === 0) {
    await prisma.providerConnection.update({
      where: { userId_providerId: { userId: args.userId, providerId: provider.id } },
      data: { updatedAt: new Date() },
    });
    return { status: "empty", inserted: 0, fetched: 0 };
  }

  const existing = await prisma.review.findMany({
    where: { organizationId: args.organizationId, provider: provider.name },
    select: { reviewText: true, rating: true },
    take: 5000,
  });
  const existingSet = new Set(existing.map((r) => `${r.rating}::${r.reviewText.trim()}`));
  const toInsert = candidates.filter((r) => !existingSet.has(`${r.rating}::${r.reviewText.trim()}`));

  if (toInsert.length > 0) {
    await prisma.review.createMany({
      data: toInsert.map((r) => ({
        organizationId: args.organizationId,
        provider: provider.name,
        rating: r.rating,
        reviewText: r.reviewText,
        status: "pending",
      })),
    });
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

const YELP_FUSION_BASE = "https://api.yelp.com/v3";
const YELP_PARTNER_BASE = "https://partner-api.yelp.com";

export type YelpBusinessDetails = {
  id: string;
  name: string;
  alias: string;
  url: string;
  rating: number;
  reviewCount: number;
};

export type YelpNormalizedReview = {
  externalReviewId: string;
  rating: number;
  reviewText: string;
  responseText: string | null;
  status: "pending" | "responded";
};

type FetchResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; body: string };

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function summarizeYelpError(result: Extract<FetchResult, { ok: false }>): string {
  try {
    const json = JSON.parse(result.body) as Record<string, unknown>;
    const err = asRecord(json.error);
    const description = readString(err.description) || readString(err.code);
    if (description) return description;
  } catch {
    // ignore parse errors
  }
  return result.body || `HTTP ${result.status}`;
}

/** Yelp Fusion API keys are exactly 128 URL-safe characters. */
export function isValidYelpApiKeyFormat(apiKey: string): boolean {
  return /^[A-Za-z0-9\-_]{128}$/.test(readString(apiKey));
}

export function yelpApiKeyFormatError(): string {
  return "Yelp API keys must be exactly 128 characters (letters, numbers, hyphens, or underscores). Copy the full key from yelp.com/developers — do not use a placeholder.";
}

function assertYelpApiKey(apiKey: string): { ok: true } | { ok: false; error: string } {
  if (!readString(apiKey)) {
    return { ok: false, error: "Yelp API key is required." };
  }
  if (!isValidYelpApiKeyFormat(apiKey)) {
    return { ok: false, error: yelpApiKeyFormatError() };
  }
  return { ok: true };
}

async function fetchYelpJson(
  url: string,
  apiKey: string,
  options: RequestInit = {},
): Promise<FetchResult> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: body.slice(0, 800) };
  }
  try {
    return { ok: true, data: asRecord(JSON.parse(body)) };
  } catch {
    return { ok: false, status: res.status, body: "Invalid JSON from Yelp API" };
  }
}

export function extractYelpReviewId(rec: Record<string, unknown>): string | null {
  const direct = readString(rec.id);
  if (direct) return direct.slice(0, 200);

  const url = readString(rec.url);
  if (url) {
    try {
      const parsed = new URL(url);
      const hrid = parsed.searchParams.get("hrid");
      if (hrid) return hrid.slice(0, 200);
    } catch {
      // ignore malformed url
    }
  }

  const text = readString(rec.text);
  const rating = rec.rating;
  if (text && typeof rating === "number") {
    return `${rating}::${text.slice(0, 120)}`;
  }

  return null;
}

function parseYelpRating(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = Math.round(v);
    return n >= 1 && n <= 5 ? n : null;
  }
  const parsed = parseInt(readString(v), 10);
  return parsed >= 1 && parsed <= 5 ? parsed : null;
}

export function normalizeYelpFusionReview(rec: Record<string, unknown>): YelpNormalizedReview | null {
  const rating = parseYelpRating(rec.rating);
  if (!rating) return null;

  const text = readString(rec.text);
  const user = asRecord(rec.user);
  const reviewerName = readString(user.name);
  const reviewText =
    text ||
    (reviewerName
      ? `${reviewerName} left a ${rating}-star review (no written comment)`
      : "(Rating only — no written comment)");

  const externalReviewId = extractYelpReviewId(rec);
  if (!externalReviewId) return null;

  return {
    externalReviewId,
    rating,
    reviewText: reviewText.slice(0, 8000),
    responseText: null,
    status: "pending",
  };
}

export function normalizeYelpPrivateReview(rec: Record<string, unknown>): YelpNormalizedReview | null {
  const rating = parseYelpRating(rec.rating);
  if (!rating) return null;

  const text = readString(rec.text);
  const user = asRecord(rec.user);
  const reviewerName = readString(user.name);
  const reviewText =
    text ||
    (reviewerName
      ? `${reviewerName} left a ${rating}-star review (no written comment)`
      : "(Rating only — no written comment)");

  const externalReviewId = extractYelpReviewId(rec);
  if (!externalReviewId) return null;

  const publicResponse = asRecord(rec.public_response);
  const ownerReply = readString(publicResponse.text);

  return {
    externalReviewId,
    rating,
    reviewText: reviewText.slice(0, 8000),
    responseText: ownerReply ? ownerReply.slice(0, 8000) : null,
    status: ownerReply ? "responded" : "pending",
  };
}

export async function fetchYelpBusinessDetails(
  apiKey: string,
  businessId: string,
): Promise<{ ok: true; business: YelpBusinessDetails } | { ok: false; error: string }> {
  const id = readString(businessId);
  if (!id) return { ok: false, error: "Yelp business ID is required." };
  const keyCheck = assertYelpApiKey(apiKey);
  if (!keyCheck.ok) return keyCheck;

  const result = await fetchYelpJson(
    `${YELP_FUSION_BASE}/businesses/${encodeURIComponent(id)}`,
    apiKey,
  );
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return {
        ok: false,
        error: `Yelp rejected the API key (${result.status}). Confirm your Fusion API key and plan.`,
      };
    }
    if (result.status === 404) {
      return {
        ok: false,
        error: "Yelp could not find that business ID. Use the business alias from the Yelp URL.",
      };
    }
    return { ok: false, error: `Yelp business lookup failed: ${summarizeYelpError(result)}` };
  }

  const name = readString(result.data.name);
  if (!name) {
    return { ok: false, error: "Yelp returned a business without a name." };
  }

  return {
    ok: true,
    business: {
      id: readString(result.data.id) || id,
      name,
      alias: readString(result.data.alias),
      url: readString(result.data.url),
      rating: typeof result.data.rating === "number" ? result.data.rating : 0,
      reviewCount: typeof result.data.review_count === "number" ? result.data.review_count : 0,
    },
  };
}

export async function verifyYelpConnection(
  apiKey: string,
  businessId: string,
): Promise<
  | { ok: true; business: YelpBusinessDetails }
  | { ok: false; error: string }
> {
  return fetchYelpBusinessDetails(apiKey, businessId);
}

export async function fetchYelpFusionReviews(
  apiKey: string,
  businessId: string,
): Promise<
  | { ok: true; reviews: Record<string, unknown>[]; total: number }
  | { ok: false; error: string }
> {
  const id = readString(businessId);
  if (!id) return { ok: false, error: "missing_business" };
  const keyCheck = assertYelpApiKey(apiKey);
  if (!keyCheck.ok) return { ok: false, error: keyCheck.error };

  const result = await fetchYelpJson(
    `${YELP_FUSION_BASE}/businesses/${encodeURIComponent(id)}/reviews`,
    apiKey,
  );
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return {
        ok: false,
        error: `Yelp reviews access denied (${result.status}). Fusion Reviews requires Enhanced or Premium plan access.`,
      };
    }
    if (result.status === 404) {
      return { ok: false, error: "Yelp could not find reviews for that business ID." };
    }
    return { ok: false, error: `Yelp reviews API failed: ${summarizeYelpError(result)}` };
  }

  const reviews = Array.isArray(result.data.reviews)
    ? result.data.reviews.map(asRecord)
    : [];
  const total = typeof result.data.total === "number" ? result.data.total : reviews.length;

  return { ok: true, reviews, total };
}

export async function fetchYelpPrivateReviews(
  apiKey: string,
  businessId: string,
  locale = "en_US",
): Promise<
  | { ok: true; reviews: Record<string, unknown>[]; total: number }
  | { ok: false; error: string; partnerRequired?: boolean }
> {
  const id = readString(businessId);
  if (!id) return { ok: false, error: "missing_business" };
  const keyCheck = assertYelpApiKey(apiKey);
  if (!keyCheck.ok) return { ok: false, error: keyCheck.error };

  const params = new URLSearchParams({ locale });
  const result = await fetchYelpJson(
    `${YELP_FUSION_BASE}/private/businesses/${encodeURIComponent(id)}/reviews?${params}`,
    apiKey,
  );
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      return {
        ok: false,
        partnerRequired: true,
        error:
          "Yelp Private Reviews API is not available for this API key. Partner access is required for full review sync.",
      };
    }
    return { ok: false, error: `Yelp private reviews API failed: ${summarizeYelpError(result)}` };
  }

  const reviews = Array.isArray(result.data.reviews)
    ? result.data.reviews.map(asRecord)
    : [];
  const total = typeof result.data.total === "number" ? result.data.total : reviews.length;

  return { ok: true, reviews, total };
}

export async function fetchYelpReviewsForConnection(args: {
  apiKey: string;
  businessId: string;
  usePrivateApi?: boolean;
}): Promise<
  | { ok: true; reviews: YelpNormalizedReview[]; total: number; source: "fusion" | "private" }
  | { ok: false; error: string }
> {
  if (args.usePrivateApi) {
    const privateResult = await fetchYelpPrivateReviews(args.apiKey, args.businessId);
    if (!privateResult.ok) {
      if (privateResult.partnerRequired) {
        const fusionFallback = await fetchYelpFusionReviews(args.apiKey, args.businessId);
        if (!fusionFallback.ok) {
          return { ok: false, error: privateResult.error };
        }
        const reviews = fusionFallback.reviews
          .map(normalizeYelpFusionReview)
          .filter((x): x is YelpNormalizedReview => x != null);
        return {
          ok: true,
          reviews,
          total: fusionFallback.total,
          source: "fusion",
        };
      }
      return { ok: false, error: privateResult.error };
    }

    const reviews = privateResult.reviews
      .map(normalizeYelpPrivateReview)
      .filter((x): x is YelpNormalizedReview => x != null);
    return { ok: true, reviews, total: privateResult.total, source: "private" };
  }

  const fusionResult = await fetchYelpFusionReviews(args.apiKey, args.businessId);
  if (!fusionResult.ok) {
    return { ok: false, error: fusionResult.error };
  }

  const reviews = fusionResult.reviews
    .map(normalizeYelpFusionReview)
    .filter((x): x is YelpNormalizedReview => x != null);

  if (reviews.length === 0 && fusionResult.total > 0) {
    return {
      ok: false,
      error: `Yelp reports ${fusionResult.total} review(s) but we could not parse them. Try reconnecting the business.`,
    };
  }

  return { ok: true, reviews, total: fusionResult.total, source: "fusion" };
}

export async function publishYelpReviewReply(args: {
  partnerAccessToken: string;
  reviewId: string;
  responseText: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const reviewId = readString(args.reviewId);
  const responseText = args.responseText.trim();
  const token = readString(args.partnerAccessToken);

  if (!reviewId) {
    return { ok: false, status: 400, error: "Missing Yelp review id." };
  }
  if (!responseText) {
    return { ok: false, status: 400, error: "Response text is required." };
  }
  if (!token) {
    return {
      ok: false,
      status: 400,
      error:
        "Yelp Partner access token is required to publish replies. Add partner_access_token when connecting Yelp.",
    };
  }

  const res = await fetch(`${YELP_PARTNER_BASE}/reviews/v1/${encodeURIComponent(reviewId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      response_text: responseText.slice(0, 5000),
      response_type: "public_comment",
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    let message = body.slice(0, 500);
    try {
      const json = JSON.parse(body) as Record<string, unknown>;
      const err = asRecord(json.error);
      message = readString(err.description) || readString(err.code) || message;
    } catch {
      // keep raw body
    }
    return { ok: false, status: res.status, error: message || `Yelp partner API HTTP ${res.status}` };
  }

  return { ok: true };
}

export function yelpPartnerRepliesEnabled(config: unknown): boolean {
  const rec = asRecord(config);
  return rec.partner_replies_enabled === true || rec.partner_replies_enabled === "true";
}

export function yelpUsePrivateReviewsApi(config: unknown): boolean {
  const rec = asRecord(config);
  return rec.use_private_reviews_api === true || rec.use_private_reviews_api === "true";
}

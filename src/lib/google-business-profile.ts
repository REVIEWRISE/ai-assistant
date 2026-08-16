import { createLogger } from "@/lib/logger";

const log = createLogger("google-business-profile");

export type GbpLocationOption = {
  accountId: string;
  locationId: string;
  title: string;
  accountName: string;
  locationName: string;
};

export type GbpLocationListResult = {
  locations: GbpLocationOption[];
  error?:
    | "accounts_api_failed"
    | "rate_limited"
    | "no_accounts"
    | "locations_api_failed"
    | "no_locations";
  detail?: string;
};

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function parseResourceId(name: string, prefix: string): string | null {
  const trimmed = name.trim();
  const expected = `${prefix}/`;
  if (!trimmed.startsWith(expected)) return null;
  const id = trimmed.slice(expected.length).trim();
  return id || null;
}

function parseLocationId(name: string): string | null {
  const trimmed = name.trim();
  const direct = parseResourceId(trimmed, "locations");
  if (direct) return direct;
  const match = trimmed.match(/\/locations\/([^/]+)$/);
  return match?.[1]?.trim() || null;
}

type FetchResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; body: string };

async function fetchGoogleJson(url: string, accessToken: string): Promise<FetchResult> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  }
  try {
    return { ok: true, data: asRecord(JSON.parse(body)) };
  } catch {
    return { ok: false, status: res.status, body: "Invalid JSON response" };
  }
}

function summarizeApiError(result: Extract<FetchResult, { ok: false }>): string {
  try {
    const json = JSON.parse(result.body) as Record<string, unknown>;
    const err = asRecord(json.error);
    const message = readString(err.message);
    if (message) return message;
  } catch {
    // ignore parse errors
  }
  return result.body || `HTTP ${result.status}`;
}

function isRateLimited(result: Extract<FetchResult, { ok: false }>): boolean {
  return result.status === 429 || /quota exceeded/i.test(result.body);
}

function locationKey(accountId: string, locationId: string): string {
  return `${accountId}::${locationId}`;
}

function addLocation(
  map: Map<string, GbpLocationOption>,
  args: {
    accountId: string;
    locationId: string;
    title: string;
    accountName: string;
    locationName: string;
  },
) {
  map.set(locationKey(args.accountId, args.locationId), args);
}

async function listAccountsV1(accessToken: string): Promise<FetchResult & { accounts?: Record<string, unknown>[] }> {
  const accounts: Record<string, unknown>[] = [];
  let pageToken = "";
  let lastResult: FetchResult = { ok: true, data: {} };

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const result = await fetchGoogleJson(
      `https://mybusinessaccountmanagement.googleapis.com/v1/accounts?${params}`,
      accessToken,
    );
    lastResult = result;
    if (!result.ok) return result;
    const rows = Array.isArray(result.data.accounts) ? result.data.accounts : [];
    accounts.push(...rows.map(asRecord));
    pageToken = readString(result.data.nextPageToken);
  } while (pageToken);

  return { ...lastResult, accounts };
}

async function listAccountsV4(accessToken: string): Promise<FetchResult & { accounts?: Record<string, unknown>[] }> {
  const accounts: Record<string, unknown>[] = [];
  let pageToken = "";
  let lastResult: FetchResult = { ok: true, data: {} };

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const result = await fetchGoogleJson(
      `https://mybusiness.googleapis.com/v4/accounts?${params}`,
      accessToken,
    );
    lastResult = result;
    if (!result.ok) return result;
    const rows = Array.isArray(result.data.accounts) ? result.data.accounts : [];
    accounts.push(...rows.map(asRecord));
    pageToken = readString(result.data.nextPageToken);
  } while (pageToken);

  return { ...lastResult, accounts };
}

async function listLocationsV1(
  accessToken: string,
  accountName: string,
  accountId: string,
  map: Map<string, GbpLocationOption>,
): Promise<boolean> {
  let pageToken = "";
  let sawSuccess = false;

  do {
    const params = new URLSearchParams({
      readMask: "name,title,storefrontAddress",
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const result = await fetchGoogleJson(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?${params}`,
      accessToken,
    );
    if (!result.ok) return sawSuccess;
    sawSuccess = true;
    const rows = Array.isArray(result.data.locations) ? result.data.locations : [];
    for (const locationRow of rows) {
      const location = asRecord(locationRow);
      const locationName = readString(location.name);
      const locationId = locationName ? parseLocationId(locationName) : null;
      if (!locationName || !locationId) continue;
      addLocation(map, {
        accountId,
        locationId,
        title: readString(location.title) || readString(location.locationName) || locationId,
        accountName,
        locationName,
      });
    }
    pageToken = readString(result.data.nextPageToken);
  } while (pageToken);

  return sawSuccess;
}

async function listLocationsV4(
  accessToken: string,
  accountId: string,
  map: Map<string, GbpLocationOption>,
): Promise<boolean> {
  let pageToken = "";
  let sawSuccess = false;
  const accountName = `accounts/${accountId}`;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const result = await fetchGoogleJson(
      `https://mybusiness.googleapis.com/v4/${accountName}/locations?${params}`,
      accessToken,
    );
    if (!result.ok) return sawSuccess;
    sawSuccess = true;
    const rows = Array.isArray(result.data.locations) ? result.data.locations : [];
    for (const locationRow of rows) {
      const location = asRecord(locationRow);
      const locationName = readString(location.name);
      const locationId = locationName ? parseLocationId(locationName) : null;
      if (!locationName || !locationId) continue;
      addLocation(map, {
        accountId,
        locationId,
        title: readString(location.locationName) || readString(location.title) || locationId,
        accountName,
        locationName,
      });
    }
    pageToken = readString(result.data.nextPageToken);
  } while (pageToken);

  return sawSuccess;
}

export async function listGoogleBusinessProfileLocationsWithResult(
  accessToken: string,
): Promise<GbpLocationListResult> {
  const locationMap = new Map<string, GbpLocationOption>();

  let accountsResult = await listAccountsV1(accessToken);
  if (!accountsResult.ok) {
    if (isRateLimited(accountsResult)) {
      const detail = summarizeApiError(accountsResult);
      console.warn("[gbp] accounts API rate limited", detail);
      return { locations: [], error: "rate_limited", detail };
    }

    const v4Accounts = await listAccountsV4(accessToken);
    if (!v4Accounts.ok) {
      if (isRateLimited(v4Accounts)) {
        const detail = summarizeApiError(v4Accounts);
        console.warn("[gbp] accounts API rate limited (v4)", detail);
        return { locations: [], error: "rate_limited", detail };
      }
      const v1Detail = summarizeApiError(accountsResult);
      const v4Detail = summarizeApiError(v4Accounts);
      const detail = [v1Detail, v4Detail].filter(Boolean).join(" | ");
      log.error("accounts API failed", { v1Status: accountsResult.status, v4Status: v4Accounts.status, detail });
      return {
        locations: [],
        error: "accounts_api_failed",
        detail,
      };
    }
    accountsResult = v4Accounts;
  }

  const accounts = accountsResult.accounts ?? [];
  if (accounts.length === 0) {
    return {
      locations: [],
      error: "no_accounts",
      detail: "No Google Business Profile accounts were found for this Google user.",
    };
  }

  let anyLocationsApiSuccess = false;
  let anyLocationsApiFailure = false;

  for (const accountRow of accounts) {
    const account = asRecord(accountRow);
    const accountName = readString(account.name);
    const accountId = accountName ? parseResourceId(accountName, "accounts") : null;
    if (!accountName || !accountId) continue;

    const countBefore = locationMap.size;
    const v1Ok = await listLocationsV1(accessToken, accountName, accountId, locationMap);
    if (v1Ok) anyLocationsApiSuccess = true;
    else anyLocationsApiFailure = true;

    if (locationMap.size === countBefore) {
      const v4Ok = await listLocationsV4(accessToken, accountId, locationMap);
      if (v4Ok) anyLocationsApiSuccess = true;
      else anyLocationsApiFailure = true;
    }
  }

  const locations = Array.from(locationMap.values());
  if (locations.length > 0) {
    return { locations };
  }

  if (anyLocationsApiFailure && !anyLocationsApiSuccess) {
    return {
      locations: [],
      error: "locations_api_failed",
      detail:
        "Google returned an API error while listing business locations. Confirm My Business Account Management API and My Business Business Information API are enabled for your Google Cloud project.",
    };
  }

  return {
    locations: [],
    error: "no_locations",
    detail:
      "Google authenticated successfully, but no business locations were returned for this account. Use the same Google account that owns your Business Profile in Google Maps.",
  };
}

export async function listGoogleBusinessProfileLocations(accessToken: string): Promise<GbpLocationOption[]> {
  const result = await listGoogleBusinessProfileLocationsWithResult(accessToken);
  return result.locations;
}

export type GbpReviewsListPage = {
  reviews: Record<string, unknown>[];
  totalReviewCount: number | null;
  nextPageToken: string | null;
};

function isGbpLocationParent(value: string): boolean {
  return /^accounts\/[^/]+\/locations\/[^/]+$/.test(value.trim());
}

export function buildGbpReviewsUrlFromParent(parent: string, pageToken?: string): string {
  const normalized = parent.trim().replace(/^\/+/, "");
  const params = new URLSearchParams({ pageSize: "50" });
  if (pageToken) params.set("pageToken", pageToken);
  return `https://mybusiness.googleapis.com/v4/${normalized}/reviews?${params}`;
}

/** @deprecated Use buildGbpReviewsUrlFromParent with full parent resource name. */
export function buildGbpReviewsUrl(accountId: string, locationId: string, pageToken?: string) {
  return buildGbpReviewsUrlFromParent(`accounts/${accountId}/locations/${locationId}`, pageToken);
}

export function gbpLocationParentFromToken(tokenData: Record<string, unknown>): string[] {
  const accountId = readString(tokenData.account_id);
  const locationId = readString(tokenData.location_id);
  const locationName = readString(tokenData.location_name);
  const candidates: string[] = [];
  if (isGbpLocationParent(locationName)) candidates.push(locationName);
  if (accountId && locationId) candidates.push(`accounts/${accountId}/locations/${locationId}`);
  if (accountId && locationName.startsWith("locations/")) {
    candidates.push(`accounts/${accountId}/${locationName}`);
  }
  return [...new Set(candidates)];
}

/** Resolve GBP review list parents — v1 location ids may not work with v4 reviews; include v4 fallbacks. */
export async function resolveGbpReviewsParentCandidates(
  accessToken: string,
  tokenData: Record<string, unknown>,
): Promise<string[]> {
  const candidates = gbpLocationParentFromToken(tokenData);
  const accountId = readString(tokenData.account_id);
  const locationId = readString(tokenData.location_id);
  const locationTitle = readString(tokenData.location_title).toLowerCase();

  if (accountId) {
    const map = new Map<string, GbpLocationOption>();
    await listLocationsV4(accessToken, accountId, map);
    for (const loc of map.values()) {
      const parent = `accounts/${loc.accountId}/locations/${loc.locationId}`;
      const matchesId = Boolean(locationId && loc.locationId === locationId);
      const matchesTitle = Boolean(locationTitle && loc.title.toLowerCase() === locationTitle);
      if (!locationId || matchesId || matchesTitle) {
        candidates.push(parent);
        if (isGbpLocationParent(loc.locationName)) candidates.push(loc.locationName);
      }
    }
  }

  return [...new Set(candidates.filter(isGbpLocationParent))];
}

export async function fetchGbpReviewsListPage(
  accessToken: string,
  parent: string,
  pageToken?: string,
): Promise<
  | { ok: true; page: GbpReviewsListPage }
  | { ok: false; status: number; body: string }
> {
  const res = await fetch(buildGbpReviewsUrlFromParent(parent, pageToken), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  }
  let json: Record<string, unknown>;
  try {
    json = asRecord(JSON.parse(body));
  } catch {
    return { ok: false, status: res.status, body: "Invalid JSON from Google reviews API" };
  }
  const rows = Array.isArray(json.reviews) ? json.reviews.map(asRecord) : [];
  const totalRaw = json.totalReviewCount;
  const totalReviewCount =
    typeof totalRaw === "number" && Number.isFinite(totalRaw) ? Math.floor(totalRaw) : null;
  return {
    ok: true,
    page: {
      reviews: rows,
      totalReviewCount,
      nextPageToken: readString(json.nextPageToken) || null,
    },
  };
}

export function buildGbpReviewReplyUrl(accountId: string, locationId: string, reviewId: string): string {
  const account = accountId.trim();
  const location = locationId.trim();
  const review = reviewId.trim();
  return `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(account)}/locations/${encodeURIComponent(location)}/reviews/${encodeURIComponent(review)}/reply`;
}

export async function publishGbpReviewReply(
  accessToken: string,
  accountId: string,
  locationId: string,
  reviewId: string,
  comment: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const trimmed = comment.trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: "Reply text is required." };
  }
  if (!accountId.trim() || !locationId.trim() || !reviewId.trim()) {
    return { ok: false, status: 400, error: "Missing Google review location or review id." };
  }

  const res = await fetch(buildGbpReviewReplyUrl(accountId, locationId, reviewId), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment: trimmed }),
  });
  const body = await res.text().catch(() => "");
  if (!res.ok) {
    const error = summarizeApiError({ ok: false, status: res.status, body: body.slice(0, 500) });
    return { ok: false, status: res.status, error };
  }
  return { ok: true };
}

export async function fetchAllGbpReviewsForToken(
  accessToken: string,
  tokenData: Record<string, unknown>,
): Promise<
  | { ok: true; reviews: Record<string, unknown>[]; parent: string; totalReviewCount: number | null }
  | { ok: false; error: string }
> {
  const parents = await resolveGbpReviewsParentCandidates(accessToken, tokenData);
  if (parents.length === 0) {
    return { ok: false, error: "missing_location" };
  }

  let lastError = "Google reviews API returned no data";
  for (const parent of parents) {
    const collected: Record<string, unknown>[] = [];
    let pageToken: string | undefined;
    let totalReviewCount: number | null = null;
    let sawSuccess = false;

    for (let page = 0; page < 20; page += 1) {
      const result = await fetchGbpReviewsListPage(accessToken, parent, pageToken);
      if (!result.ok) {
        lastError = `Google reviews API (${parent}) HTTP ${result.status}: ${result.body}`;
        break;
      }
      sawSuccess = true;
      if (result.page.totalReviewCount != null) totalReviewCount = result.page.totalReviewCount;
      collected.push(...result.page.reviews);
      pageToken = result.page.nextPageToken ?? undefined;
      if (!pageToken) break;
    }

    if (collected.length > 0) {
      return { ok: true, reviews: collected, parent, totalReviewCount };
    }

    if (sawSuccess && (totalReviewCount ?? 0) > 0) {
      return {
        ok: false,
        error: `Google reports ${totalReviewCount} review(s) for this location but returned an empty list. Confirm the business is verified in Google Business Profile and reconnect the location.`,
      };
    }

    if (sawSuccess && collected.length === 0 && (totalReviewCount ?? 0) === 0) {
      return { ok: true, reviews: [], parent, totalReviewCount: 0 };
    }
  }

  return { ok: false, error: lastError };
}

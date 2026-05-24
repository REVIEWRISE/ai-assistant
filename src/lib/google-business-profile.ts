export type GbpLocationOption = {
  accountId: string;
  locationId: string;
  title: string;
  accountName: string;
  locationName: string;
};

export type GbpLocationListResult = {
  locations: GbpLocationOption[];
  error?: "accounts_api_failed" | "no_accounts" | "locations_api_failed" | "no_locations";
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
    const v4Accounts = await listAccountsV4(accessToken);
    if (!v4Accounts.ok) {
      const detail = summarizeApiError(accountsResult.ok === false ? accountsResult : v4Accounts);
      return {
        locations: [],
        error: accountsResult.status === 403 || v4Accounts.status === 403 ? "accounts_api_failed" : "accounts_api_failed",
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

    const v1Ok = await listLocationsV1(accessToken, accountName, accountId, locationMap);
    if (v1Ok) anyLocationsApiSuccess = true;
    else anyLocationsApiFailure = true;

    const v4Ok = await listLocationsV4(accessToken, accountId, locationMap);
    if (v4Ok) anyLocationsApiSuccess = true;
    else anyLocationsApiFailure = true;
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

export function buildGbpReviewsUrl(accountId: string, locationId: string, pageToken?: string) {
  const params = new URLSearchParams({
    pageSize: "50",
    orderBy: "updateTime desc",
  });
  if (pageToken) params.set("pageToken", pageToken);
  return `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews?${params}`;
}

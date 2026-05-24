export type OAuthProviderConfig = {
  auth_url?: string;
  token_url?: string;
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
  scopes?: string | string[];
  scope?: string;
};

export type TokenData = Record<string, unknown> & {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
};

export function asOAuthProviderConfig(raw: unknown): OAuthProviderConfig {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as OAuthProviderConfig) : {};
}

export function parseOAuthScopes(config: OAuthProviderConfig): string {
  const scopesValue = config.scopes ?? config.scope;
  if (Array.isArray(scopesValue)) return scopesValue.join(" ");
  if (typeof scopesValue === "string") {
    return scopesValue
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

export function isOAuthProviderConfig(raw: unknown): boolean {
  const config = asOAuthProviderConfig(raw);
  return Boolean(
    config.auth_url?.trim() &&
      config.token_url?.trim() &&
      config.client_id?.trim() &&
      config.client_secret?.trim() &&
      config.redirect_uri?.trim() &&
      parseOAuthScopes(config),
  );
}

export function buildAuthUrl(baseUrl: string, params: Record<string, string>) {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export function annotateTokenExpiry(tokenData: TokenData): TokenData {
  const next = { ...tokenData };
  if (typeof next.expires_in === "number" && next.expires_at == null) {
    next.expires_at = Date.now() + next.expires_in * 1000;
  }
  return next;
}

export function tokenNeedsRefresh(tokenData: TokenData, skewMs = 120_000): boolean {
  const exp = tokenData.expires_at;
  if (exp == null || typeof exp !== "number") return true;
  return Date.now() + skewMs >= exp;
}

export async function exchangeAuthorizationCode(args: {
  config: OAuthProviderConfig;
  code: string;
}): Promise<TokenData | null> {
  const tokenUrl = args.config.token_url?.trim();
  const clientId = args.config.client_id?.trim();
  const clientSecret = args.config.client_secret?.trim();
  const redirectUri = args.config.redirect_uri?.trim();
  if (!tokenUrl || !clientId || !clientSecret || !redirectUri) return null;

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: args.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as TokenData;
  return annotateTokenExpiry(json);
}

export async function refreshOAuthTokens(
  config: OAuthProviderConfig,
  tokenData: TokenData,
): Promise<TokenData | null> {
  const tokenUrl = config.token_url?.trim();
  const clientId = config.client_id?.trim();
  const clientSecret = config.client_secret?.trim();
  const refreshToken = typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : "";
  if (!tokenUrl || !clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;
  const merged: TokenData = { ...tokenData, ...json };
  if (typeof json.expires_in === "number") {
    merged.expires_at = Date.now() + json.expires_in * 1000;
  }
  if (typeof json.access_token === "string") merged.access_token = json.access_token;
  if (typeof json.refresh_token === "string") merged.refresh_token = json.refresh_token;
  return merged;
}

export async function getValidOAuthAccessToken(args: {
  config: OAuthProviderConfig;
  tokenData: unknown;
  persist: (next: TokenData) => Promise<void>;
}): Promise<{ accessToken: string } | { error: string }> {
  const td = (args.tokenData && typeof args.tokenData === "object" ? args.tokenData : {}) as TokenData;
  const access = td.access_token;
  if (typeof access === "string" && access.length > 0 && !tokenNeedsRefresh(td)) {
    return { accessToken: access };
  }
  if (typeof td.refresh_token !== "string" || !td.refresh_token) {
    return { error: "Missing refresh token; reconnect the provider." };
  }
  const next = await refreshOAuthTokens(args.config, td);
  if (!next || typeof next.access_token !== "string") {
    return { error: "Could not refresh OAuth access token." };
  }
  await args.persist(next);
  return { accessToken: next.access_token };
}

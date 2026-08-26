import { getAppUrl } from "@/lib/stripe";
import {
  asOAuthProviderConfig,
  buildAuthUrl,
  exchangeAuthorizationCode,
  type OAuthProviderConfig,
} from "@/lib/google-oauth";
import { prisma } from "@/lib/prisma";

export const GOOGLE_AUTH_PROVIDER = "google";

export type GoogleAuthProfile = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

function loginRedirectUri(): string {
  return (
    process.env.GOOGLE_AUTH_REDIRECT_URI?.trim() ||
    `${getAppUrl().replace(/\/$/, "")}/auth/google/callback`
  );
}

function configFromCredentials(clientId: string, clientSecret: string): OAuthProviderConfig {
  return asOAuthProviderConfig({
    auth_url: "https://accounts.google.com/o/oauth2/v2/auth",
    token_url: "https://oauth2.googleapis.com/token",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: loginRedirectUri(),
    scopes: ["openid", "email", "profile"],
  });
}

function envGoogleAuthConfig(): OAuthProviderConfig | null {
  const clientId =
    process.env.GOOGLE_AUTH_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_AUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return configFromCredentials(clientId, clientSecret);
}

function isLikelyGoogleOAuthConfig(config: OAuthProviderConfig, providerName: string): boolean {
  const authUrl = config.auth_url?.toLowerCase() ?? "";
  const name = providerName.toLowerCase();
  return (
    name.includes("google") ||
    authUrl.includes("accounts.google.com") ||
    authUrl.includes("google.com/o/oauth")
  );
}

/** Prefer an enabled Google calendar/review provider's client_id + client_secret. */
async function providerGoogleAuthConfig(): Promise<OAuthProviderConfig | null> {
  const providers = await prisma.provider.findMany({
    where: {
      status: "enabled",
      type: { in: ["calendar", "review"] },
    },
    select: { name: true, type: true, config: true },
    orderBy: { createdAt: "asc" },
  });

  const scored: Array<{ score: number; config: OAuthProviderConfig }> = [];

  for (const provider of providers) {
    const config = asOAuthProviderConfig(provider.config);
    const clientId = config.client_id?.trim();
    const clientSecret = config.client_secret?.trim();
    if (!clientId || !clientSecret) continue;

    let score = 1;
    if (isLikelyGoogleOAuthConfig(config, provider.name)) score += 10;
    if (provider.type === "calendar") score += 2;

    scored.push({
      score,
      config: configFromCredentials(clientId, clientSecret),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.config ?? null;
}

export async function getGoogleAuthConfig(): Promise<OAuthProviderConfig | null> {
  return (await providerGoogleAuthConfig()) ?? envGoogleAuthConfig();
}

export async function isGoogleAuthConfigured(): Promise<boolean> {
  return Boolean(await getGoogleAuthConfig());
}

export async function buildGoogleAuthUrl(state: string): Promise<string | null> {
  const config = await getGoogleAuthConfig();
  const authUrl = config?.auth_url?.trim();
  const clientId = config?.client_id?.trim();
  const redirectUri = config?.redirect_uri?.trim();
  if (!config || !authUrl || !clientId || !redirectUri) return null;

  return buildAuthUrl(authUrl, {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
}

export async function exchangeGoogleAuthCode(code: string) {
  const config = await getGoogleAuthConfig();
  if (!config) return null;
  return exchangeAuthorizationCode({ config, code });
}

export async function fetchGoogleAuthProfile(
  accessToken: string,
): Promise<GoogleAuthProfile | null> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
  };

  const id = typeof json.sub === "string" ? json.sub.trim() : "";
  const email = typeof json.email === "string" ? json.email.trim().toLowerCase() : "";
  if (!id || !email) return null;

  return {
    id,
    email,
    name: typeof json.name === "string" && json.name.trim() ? json.name.trim() : email.split("@")[0] || "User",
    emailVerified: json.email_verified === true,
  };
}

export function defaultWorkspaceName(fullName: string): string {
  const base = fullName.trim() || "My";
  const name = `${base}'s workspace`;
  return name.length > 100 ? name.slice(0, 100) : name;
}

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  asOAuthProviderConfig,
  refreshOAuthTokens,
  tokenNeedsRefresh,
  type OAuthProviderConfig,
  type TokenData,
} from "@/lib/google-oauth";

export type CalendarConnectionDisplay = {
  status: "Connected" | "Reconnect required" | "Not connected";
  synced: string;
  tone: "vr-app-status-success" | "vr-app-status-warning" | "vr-app-status-muted";
};

function asTokenData(raw: unknown): TokenData {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as TokenData) : {};
}

export function readAccessTokenExpiresAtMs(tokenData: unknown): number | null {
  const exp = asTokenData(tokenData).expires_at as string | number | undefined;
  if (exp == null) return null;
  if (typeof exp === "number" && Number.isFinite(exp)) return exp;
  if (typeof exp === "string") {
    const trimmed = exp.trim();
    if (!trimmed) return null;
    const t = new Date(trimmed).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export function hasOAuthRefreshToken(tokenData: unknown): boolean {
  const refresh = asTokenData(tokenData).refresh_token;
  return typeof refresh === "string" && refresh.trim().length > 0;
}

/** Google/Microsoft access tokens are short-lived (~1h). Refresh token keeps the link alive. */
export function isAccessTokenExpired(tokenData: unknown, nowMs = Date.now(), skewMs = 120_000): boolean {
  const td = asTokenData(tokenData);
  const exp = readAccessTokenExpiresAtMs(td);
  if (exp == null) return !hasOAuthRefreshToken(td);
  return nowMs + skewMs >= exp;
}

export function calendarConnectionIsUsable(tokenData: unknown, nowMs = Date.now()): boolean {
  if (!isAccessTokenExpired(tokenData, nowMs)) return true;
  return hasOAuthRefreshToken(tokenData);
}

export function calendarConnectionDisplay(
  connected: boolean,
  tokenData: unknown,
  nowMs = Date.now(),
): CalendarConnectionDisplay {
  if (!connected) {
    return {
      status: "Not connected",
      synced: "0 synced",
      tone: "vr-app-status-muted",
    };
  }

  if (!hasOAuthRefreshToken(tokenData) && isAccessTokenExpired(tokenData, nowMs)) {
    return {
      status: "Reconnect required",
      synced: "No refresh token — connect again",
      tone: "vr-app-status-warning",
    };
  }

  if (isAccessTokenExpired(tokenData, nowMs)) {
    return {
      status: "Connected",
      synced: "Access token renews automatically",
      tone: "vr-app-status-success",
    };
  }

  return {
    status: "Connected",
    synced: "API connected",
    tone: "vr-app-status-success",
  };
}

export function mergeOAuthTokenData(existing: unknown, incoming: TokenData): TokenData {
  const prev = asTokenData(existing);
  const next = { ...prev, ...incoming };
  if (!incoming.refresh_token && prev.refresh_token) {
    next.refresh_token = prev.refresh_token;
  }
  if (typeof incoming.expires_in === "number") {
    next.expires_at = Date.now() + incoming.expires_in * 1000;
  }
  return next;
}

export async function ensureCalendarConnectionTokenFresh(args: {
  userId: string;
  providerId: string;
  providerConfig: unknown;
  tokenData: unknown;
}): Promise<TokenData | null> {
  const config = asOAuthProviderConfig(args.providerConfig);
  const td = asTokenData(args.tokenData);
  if (!tokenNeedsRefresh(td)) return td;
  if (!hasOAuthRefreshToken(td)) return null;

  const next = await refreshOAuthTokens(config, td);
  if (!next || typeof next.access_token !== "string") return null;

  await prisma.providerConnection.update({
    where: {
      userId_providerId: {
        userId: args.userId,
        providerId: args.providerId,
      },
    },
    data: {
      tokenData: next as Prisma.InputJsonValue,
      connected: true,
      updatedAt: new Date(),
    },
  });

  return next;
}

export async function refreshCalendarConnectionsForUser(userId: string): Promise<void> {
  const connections = await prisma.providerConnection.findMany({
    where: {
      userId,
      connected: true,
      provider: { type: "calendar", status: "enabled" },
    },
    select: {
      userId: true,
      providerId: true,
      tokenData: true,
      provider: { select: { config: true } },
    },
  });

  await Promise.all(
    connections.map((conn) =>
      ensureCalendarConnectionTokenFresh({
        userId: conn.userId,
        providerId: conn.providerId,
        providerConfig: conn.provider.config,
        tokenData: conn.tokenData,
      }),
    ),
  );
}

export async function refreshOrgMemberCalendarConnections(organizationId: string): Promise<void> {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const userIds = [...new Set(members.map((m) => m.userId))];
  await Promise.all(userIds.map((userId) => refreshCalendarConnectionsForUser(userId)));
}

export type { OAuthProviderConfig, TokenData };

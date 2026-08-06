/**
 * Outbound calendar writes for chatbot bookings (Google Calendar API v3, Microsoft Graph /me/events).
 * OAuth scopes required when connecting:
 * - Google: https://www.googleapis.com/auth/calendar.events (or calendar)
 * - Microsoft: Calendars.ReadWrite (offline_access for refresh_token)
 *
 * Optional provider `config` JSON keys: `integration` (google_calendar | microsoft_graph), `calendar_id`
 * (Google, default primary), `graph_base_url` (Microsoft, default https://graph.microsoft.com/v1.0).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptTokenData, decryptTokenData } from "@/lib/token-encryption";

type TokenData = Record<string, unknown> & {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
};

type ProviderConfig = {
  token_url?: string;
  client_id?: string;
  client_secret?: string;
  integration?: string;
  calendar_id?: string;
  tenant_id?: string;
  graph_base_url?: string;
};

export type SyncAppointmentCalendarParams = {
  appointmentId: string;
  organizationId: string;
  organizationName: string;
  providerId: string;
  connectionUserId: string;
};

export type CalendarAvailabilityParams = {
  providerId: string;
  connectionUserId: string;
  start: Date;
  end: Date;
};

function asProviderConfig(raw: unknown): ProviderConfig {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as ProviderConfig) : {};
}

export function detectCalendarIntegration(provider: {
  name: string;
  apiUrl: string | null;
  config: unknown;
}): "google" | "microsoft" | null {
  const c = asProviderConfig(provider.config);
  const integration = String(c.integration ?? "")
    .toLowerCase()
    .replace(/-/g, "_");
  if (integration === "google" || integration === "google_calendar") return "google";
  if (integration === "microsoft" || integration === "microsoft_graph" || integration === "outlook")
    return "microsoft";
  const n = provider.name.toLowerCase();
  if (n.includes("google")) return "google";
  if (n.includes("microsoft") || n.includes("outlook") || n.includes("office")) return "microsoft";
  const api = (provider.apiUrl ?? "").toLowerCase();
  if (api.includes("googleapis.com")) return "google";
  if (api.includes("graph.microsoft.com")) return "microsoft";
  return null;
}

function tokenNeedsRefresh(tokenData: TokenData, skewMs = 120_000): boolean {
  const exp = tokenData.expires_at;
  if (exp == null || typeof exp !== "number") return true;
  return Date.now() + skewMs >= exp;
}

async function refreshOAuthTokens(
  config: ProviderConfig,
  tokenData: TokenData,
): Promise<TokenData | null> {
  const tokenUrl = config.token_url?.trim();
  const clientId = config.client_id?.trim();
  const clientSecret = config.client_secret?.trim();
  const refreshToken = typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : "";
  if (!tokenUrl || !clientId || !clientSecret || !refreshToken) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
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

async function getValidAccessToken(
  config: ProviderConfig,
  tokenData: unknown,
  persist: (next: TokenData) => Promise<void>,
): Promise<{ accessToken: string } | { error: string }> {
  const td = (tokenData && typeof tokenData === "object" ? tokenData : {}) as TokenData;
  const access = td.access_token;
  if (typeof access === "string" && access.length > 0 && !tokenNeedsRefresh(td)) {
    return { accessToken: access };
  }
  if (typeof td.refresh_token !== "string" || !td.refresh_token) {
    return { error: "Missing refresh token; reconnect the calendar provider." };
  }
  const next = await refreshOAuthTokens(config, td);
  if (!next || typeof next.access_token !== "string") {
    return { error: "Could not refresh OAuth access token." };
  }
  await persist(next);
  return { accessToken: next.access_token };
}

function buildEventCopy(args: {
  organizationName: string;
  customerName: string;
  serviceDescription: string | null;
  partySize: number | null;
  rawMessage: string | null;
}): { title: string; description: string } {
  const parts = [
    `Organization: ${args.organizationName}`,
    `Guest: ${args.customerName}`,
    args.serviceDescription ? `Service: ${args.serviceDescription}` : null,
    args.partySize != null ? `Party size: ${args.partySize}` : null,
    args.rawMessage ? `Original message:\n${args.rawMessage}` : null,
  ].filter(Boolean);
  const title = `Booking: ${args.serviceDescription || "Reservation"} — ${args.customerName}`;
  return { title: title.slice(0, 200), description: parts.join("\n").slice(0, 8000) };
}

async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  title: string,
  description: string,
  start: Date,
  end: Date,
): Promise<{ id: string } | { error: string }> {
  const cal = calendarId.trim() || "primary";
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: title,
      description,
      start: { dateTime: start.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: text.slice(0, 800) || `Google Calendar API error (${res.status})` };
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) return { error: "Google Calendar did not return an event id." };
  return { id: json.id };
}

async function hasGoogleCalendarConflict(
  accessToken: string,
  calendarId: string,
  start: Date,
  end: Date,
): Promise<{ conflict: boolean } | { error: string }> {
  const cal = calendarId.trim() || "primary";
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: "UTC",
      items: [{ id: cal }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: text.slice(0, 800) || `Google freeBusy API error (${res.status})` };
  }
  const json = (await res.json()) as {
    calendars?: Record<string, { busy?: Array<{ start?: string; end?: string }> }>;
  };
  const busy = json.calendars?.[cal]?.busy ?? [];
  return { conflict: busy.length > 0 };
}

async function createMicrosoftGraphEvent(
  accessToken: string,
  graphBase: string,
  title: string,
  description: string,
  start: Date,
  end: Date,
): Promise<{ id: string } | { error: string }> {
  const base = (graphBase.trim().replace(/\/$/, "") || "https://graph.microsoft.com/v1.0").replace(/\/$/, "");
  const url = `${base}/me/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: title,
      body: { contentType: "Text", content: description },
      start: { dateTime: start.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: text.slice(0, 800) || `Microsoft Graph error (${res.status})` };
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) return { error: "Microsoft Graph did not return an event id." };
  return { id: json.id };
}

async function hasMicrosoftCalendarConflict(
  accessToken: string,
  graphBase: string,
  start: Date,
  end: Date,
): Promise<{ conflict: boolean } | { error: string }> {
  const base = (graphBase.trim().replace(/\/$/, "") || "https://graph.microsoft.com/v1.0").replace(/\/$/, "");
  const qs = new URLSearchParams({
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    $top: "50",
    $select: "id,showAs,start,end",
  });
  const url = `${base}/me/calendarView?${qs.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: text.slice(0, 800) || `Microsoft calendarView API error (${res.status})` };
  }
  const json = (await res.json()) as {
    value?: Array<{ showAs?: string | null }>;
  };
  const events = json.value ?? [];
  const conflict = events.some((e) => {
    const showAs = String(e.showAs ?? "").toLowerCase();
    return showAs !== "free";
  });
  return { conflict };
}

type CalendarAvailabilityResult =
  | { ok: true; conflict: boolean }
  | { ok: false; error: string };

async function checkProviderCalendarAvailability(
  params: CalendarAvailabilityParams,
): Promise<CalendarAvailabilityResult> {
  const { providerId, connectionUserId, start, end } = params;
  const [provider, connection] = await Promise.all([
    prisma.provider.findFirst({
      where: { id: providerId, type: "calendar", status: "enabled" },
      select: { id: true, name: true, apiUrl: true, config: true },
    }),
    prisma.providerConnection.findUnique({
      where: {
        userId_providerId: { userId: connectionUserId, providerId },
      },
    }),
  ]);

  if (!provider || !connection?.connected) {
    return { ok: false, error: "Calendar provider or connection not found." };
  }

  const integration = detectCalendarIntegration(provider);
  if (!integration) {
    return {
      ok: false,
      error:
        "Calendar provider type not recognized. Set config key `integration` to `google_calendar` or `microsoft_graph`, or name the provider Google/Microsoft.",
    };
  }

  const config = asProviderConfig(provider.config);
  const tokenResult = await getValidAccessToken(config, decryptTokenData(connection.tokenData), async (next) => {
    await prisma.providerConnection.update({
      where: {
        userId_providerId: { userId: connectionUserId, providerId },
      },
      data: {
        tokenData: encryptTokenData(next) as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  });
  if ("error" in tokenResult) {
    return { ok: false, error: tokenResult.error };
  }

  if (integration === "google") {
    const calendarId = String(config.calendar_id ?? "primary");
    const availability = await hasGoogleCalendarConflict(tokenResult.accessToken, calendarId, start, end);
    if ("error" in availability) return { ok: false, error: availability.error };
    return { ok: true, conflict: availability.conflict };
  }

  const graphBase = String(config.graph_base_url ?? "https://graph.microsoft.com/v1.0");
  const availability = await hasMicrosoftCalendarConflict(tokenResult.accessToken, graphBase, start, end);
  if ("error" in availability) return { ok: false, error: availability.error };
  return { ok: true, conflict: availability.conflict };
}

export async function checkCalendarAvailabilityForRoute(
  params: CalendarAvailabilityParams,
): Promise<CalendarAvailabilityResult> {
  return checkProviderCalendarAvailability(params);
}

export type CalendarSyncResult =
  | { ok: true; externalEventId: string }
  | { ok: false; error: string };

/**
 * Creates a calendar event on Google Calendar or Microsoft Graph using the stored
 * OAuth connection. Refreshes the access token when needed and persists new tokens.
 */
export async function syncAppointmentToExternalCalendar(
  params: SyncAppointmentCalendarParams,
): Promise<CalendarSyncResult> {
  const { appointmentId, organizationId, organizationName, providerId, connectionUserId } = params;

  const [appointment, provider, connection] = await Promise.all([
    prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        customerName: true,
        serviceDescription: true,
        partySize: true,
        rawMessage: true,
      },
    }),
    prisma.provider.findFirst({
      where: { id: providerId, type: "calendar", status: "enabled" },
      select: { id: true, name: true, apiUrl: true, config: true },
    }),
    prisma.providerConnection.findUnique({
      where: {
        userId_providerId: { userId: connectionUserId, providerId },
      },
    }),
  ]);

  if (!appointment || !provider || !connection?.connected) {
    return { ok: false, error: "Appointment, provider, or connection not found." };
  }

  const integration = detectCalendarIntegration(provider);
  if (!integration) {
    return {
      ok: false,
      error:
        "Calendar provider type not recognized. Set config key `integration` to `google_calendar` or `microsoft_graph`, or name the provider Google/Microsoft.",
    };
  }
  const config = asProviderConfig(provider.config);
  const tokenResult = await getValidAccessToken(config, decryptTokenData(connection.tokenData), async (next) => {
    await prisma.providerConnection.update({
      where: {
        userId_providerId: { userId: connectionUserId, providerId },
      },
      data: {
        tokenData: encryptTokenData(next) as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  });
  if ("error" in tokenResult) return { ok: false, error: tokenResult.error };

  const { title, description } = buildEventCopy({
    organizationName,
    customerName: appointment.customerName,
    serviceDescription: appointment.serviceDescription,
    partySize: appointment.partySize,
    rawMessage: appointment.rawMessage,
  });

  let created: { id: string } | { error: string };
  if (integration === "google") {
    const calendarId = String(config.calendar_id ?? "primary");
    const availability = await hasGoogleCalendarConflict(
      tokenResult.accessToken,
      calendarId,
      appointment.startTime,
      appointment.endTime,
    );
    if ("error" in availability) return { ok: false, error: availability.error };
    if (availability.conflict) {
      return { ok: false, error: "Requested time conflicts with an existing calendar event." };
    }
    created = await createGoogleCalendarEvent(
      tokenResult.accessToken,
      calendarId,
      title,
      description,
      appointment.startTime,
      appointment.endTime,
    );
  } else {
    const graphBase = String(config.graph_base_url ?? "https://graph.microsoft.com/v1.0");
    const availability = await hasMicrosoftCalendarConflict(
      tokenResult.accessToken,
      graphBase,
      appointment.startTime,
      appointment.endTime,
    );
    if ("error" in availability) return { ok: false, error: availability.error };
    if (availability.conflict) {
      return { ok: false, error: "Requested time conflicts with an existing calendar event." };
    }
    created = await createMicrosoftGraphEvent(
      tokenResult.accessToken,
      graphBase,
      title,
      description,
      appointment.startTime,
      appointment.endTime,
    );
  }

  if ("error" in created) {
    return { ok: false, error: created.error };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      providerSyncStatus: "synced",
      externalCalendarEventId: created.id,
      providerSyncError: null,
      routedProviderId: providerId,
      routedConnectionUserId: connectionUserId,
    },
  });

  return { ok: true, externalEventId: created.id };
}

export async function markAppointmentCalendarSyncFailed(
  appointmentId: string,
  organizationId: string,
  errorMessage: string,
): Promise<void> {
  await prisma.appointment.updateMany({
    where: { id: appointmentId, organizationId },
    data: {
      providerSyncStatus: "failed",
      providerSyncError: errorMessage.slice(0, 2000),
    },
  });
}

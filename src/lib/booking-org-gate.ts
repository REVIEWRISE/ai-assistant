import { calendarConnectionIsUsable, refreshOrgMemberCalendarConnections } from "@/lib/calendar-oauth-connection";
import { KNOWLEDGE_BOOKING_CORPUS_RAW_MAX_CHARS } from "@/lib/knowledge-base-limits";
import { truncateKnowledgeRawTextForPrompt } from "@/lib/knowledge-base-raw-truncate";
import { prisma } from "@/lib/prisma";
import type { ParsedBookingUtterance } from "@/lib/parse-booking-utterance";

export type BookingGateCode =
  | "ok"
  | "kb_not_approved"
  | "kb_empty"
  | "kb_no_booking_context"
  | "service_not_offered";

export type BookingGateResult =
  | { ok: true; code: "ok" }
  | { ok: false; code: Exclude<BookingGateCode, "ok"> };

const BOOKING_CORPUS_HINT =
  /\b(book|booking|reservation|reserve|dining|dinner|lunch|brunch|breakfast|table|restaurant|seat|party|guest|hours|open)\b/;

const SERVICE_KEYWORDS = [
  "dinner",
  "lunch",
  "brunch",
  "breakfast",
  "bar",
  "private dining",
  "private room",
  "tasting menu",
  "chef's table",
  "chefs table",
  "afternoon tea",
  "high tea",
] as const;

function normalizeAllowlistServices(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => String(x).trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function buildKnowledgeCorpus(rawText: string, parsedData: unknown): string {
  const condensedRaw = truncateKnowledgeRawTextForPrompt(rawText, KNOWLEDGE_BOOKING_CORPUS_RAW_MAX_CHARS);
  const chunks: string[] = [condensedRaw];
  if (parsedData && typeof parsedData === "object" && !Array.isArray(parsedData)) {
    const p = parsedData as Record<string, unknown>;
    for (const key of ["preview", "formattedPreview"] as const) {
      if (typeof p[key] === "string") chunks.push(p[key] as string);
    }
    if (Array.isArray(p.highlights)) {
      for (const h of p.highlights) chunks.push(String(h));
    }
  }
  return chunks.join("\n").toLowerCase();
}

function tokensFromServiceAndMessage(serviceDescription: string, rawMessage: string): string[] {
  const bag = `${serviceDescription} ${rawMessage}`.toLowerCase();
  const found: string[] = [];
  for (const phrase of SERVICE_KEYWORDS) {
    if (bag.includes(phrase)) found.push(phrase);
  }
  return found;
}

function allowlistMatches(allow: string[], serviceDescription: string, rawMessage: string): boolean {
  const svc = serviceDescription.toLowerCase().trim();
  const msg = rawMessage.toLowerCase();
  return allow.some((label) => {
    if (!label) return false;
    return svc.includes(label) || label.includes(svc) || msg.includes(label);
  });
}

/**
 * Validates that a complete booking request is allowed for this organization:
 * knowledge base must be approved and substantive, and the requested service
 * must appear in the configured allowlist or in approved KB text.
 */
export function validateBookingAgainstOrgKnowledge(args: {
  knowledgeStatus: string;
  knowledgeCorpus: string;
  allowlistServices: string[];
  parsed: ParsedBookingUtterance;
  rawMessage: string;
}): BookingGateResult {
  const { knowledgeStatus, knowledgeCorpus, allowlistServices, parsed, rawMessage } = args;

  if (knowledgeStatus !== "approved") {
    return { ok: false, code: "kb_not_approved" };
  }

  const corpus = knowledgeCorpus.trim();
  if (corpus.length < 40) {
    return { ok: false, code: "kb_empty" };
  }

  if (allowlistServices.length > 0) {
    if (!allowlistMatches(allowlistServices, parsed.serviceDescription ?? "", rawMessage)) {
      return { ok: false, code: "service_not_offered" };
    }
    return { ok: true, code: "ok" };
  }

  if (!BOOKING_CORPUS_HINT.test(corpus)) {
    return { ok: false, code: "kb_no_booking_context" };
  }

  const tokens = tokensFromServiceAndMessage(parsed.serviceDescription ?? "", rawMessage);
  if (tokens.length === 0) {
    return { ok: true, code: "ok" };
  }

  const corpusOk = tokens.every((t) => corpus.includes(t));
  if (!corpusOk) {
    return { ok: false, code: "service_not_offered" };
  }

  return { ok: true, code: "ok" };
}

export type OrgBookingContext = {
  knowledgeStatus: string;
  knowledgeCorpus: string;
  allowlistServices: string[];
};

export async function loadOrgBookingContext(organizationId: string): Promise<OrgBookingContext> {
  const [kbRows, settingsRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{ status: string; raw_text: string; parsed_data: unknown | null }>
    >`select status, raw_text as "raw_text", parsed_data as "parsed_data" from organization_knowledge_bases where organization_id = ${organizationId}::uuid limit 1`,
    prisma.$queryRaw<Array<{ services: unknown }>>`
      select services from organization_chatbot_settings where organization_id = ${organizationId}::uuid limit 1
    `,
  ]);

  const kb = kbRows[0];
  const settings = settingsRows[0];

  const knowledgeStatus = kb?.status ?? "empty";
  const knowledgeCorpus = kb ? buildKnowledgeCorpus(kb.raw_text ?? "", kb.parsed_data) : "";
  const allowlistServices = normalizeAllowlistServices(settings?.services);

  return {
    knowledgeStatus,
    knowledgeCorpus,
    allowlistServices,
  };
}

export type OrgCalendarRoute = {
  providerId: string;
  connectionUserId: string;
  providerName: string;
};

type PreferredRouteMeta = {
  providerId?: string;
  connectionUserId?: string;
  providerName?: string;
};

async function findPreferredOrgCalendarRoute(
  organizationId: string,
  nowMs: number,
): Promise<OrgCalendarRoute | null> {
  const evt = await prisma.auditEvent.findFirst({
    where: {
      organizationId,
      action: "organization_calendar_provider_connected",
    },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  if (!evt?.metadata || typeof evt.metadata !== "object" || Array.isArray(evt.metadata)) {
    return null;
  }
  const meta = evt.metadata as PreferredRouteMeta;
  if (!meta.providerId || !meta.connectionUserId) return null;

  const conn = await prisma.providerConnection.findFirst({
    where: {
      userId: meta.connectionUserId,
      providerId: meta.providerId,
      connected: true,
      provider: { type: "calendar", status: "enabled" },
    },
    include: { provider: { select: { id: true, name: true } } },
  });
  if (!conn || !calendarConnectionIsUsable(conn.tokenData, nowMs)) {
    return null;
  }

  return {
    providerId: conn.providerId,
    connectionUserId: conn.userId,
    providerName: conn.provider.name,
  };
}

/**
 * All live calendar OAuth connections for any member of the organization (deduped by provider + user).
 * Preferred connection (from last connect audit) is listed first when still valid.
 */
export async function listOrgCalendarRoutes(organizationId: string): Promise<OrgCalendarRoute[]> {
  await refreshOrgMemberCalendarConnections(organizationId);
  const nowMs = Date.now();
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0) return [];

  const connections = await prisma.providerConnection.findMany({
    where: {
      userId: { in: userIds },
      connected: true,
      provider: { type: "calendar", status: "enabled" },
    },
    include: { provider: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const routes: OrgCalendarRoute[] = [];
  const seen = new Set<string>();
  for (const c of connections) {
    if (!calendarConnectionIsUsable(c.tokenData, nowMs)) continue;
    const key = `${c.providerId}:${c.userId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({
      providerId: c.providerId,
      connectionUserId: c.userId,
      providerName: c.provider.name,
    });
  }

  const preferred = await findPreferredOrgCalendarRoute(organizationId, nowMs);
  if (!preferred) return routes;
  const rest = routes.filter(
    (r) =>
      !(r.providerId === preferred.providerId && r.connectionUserId === preferred.connectionUserId),
  );
  return [preferred, ...rest];
}

/**
 * Picks a calendar provider connection from any member of the organization
 * (same idea as staff connecting under Appointments → calendar providers).
 */
export async function findOrgCalendarRoute(organizationId: string): Promise<OrgCalendarRoute | null> {
  const routes = await listOrgCalendarRoutes(organizationId);
  return routes[0] ?? null;
}

export function bookingGateUserMessage(code: BookingGateCode): string {
  switch (code) {
    case "kb_not_approved":
      return "Online booking isn’t available yet for this business. Please call or message them directly.";
    case "kb_empty":
      return "We don’t have enough business information on file to take a booking here yet. Please contact them directly.";
    case "kb_no_booking_context":
      return "We couldn’t match that to what they offer. Check their services or hours in our info, or ask for something they list.";
    case "service_not_offered":
      return "That doesn’t match what we have on file for this business. Try an option they describe in their information, or contact them directly.";
    default:
      return "We couldn’t complete that booking. Please try again or contact them directly.";
  }
}

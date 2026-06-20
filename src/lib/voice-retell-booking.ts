import type { Prisma } from "@prisma/client";
import {
  bookingGateUserMessage,
  findOrgCalendarRoute,
  loadOrgBookingContext,
  validateBookingAgainstOrgKnowledge,
} from "@/lib/booking-org-gate";
import { sendBookingConfirmationEmails } from "@/lib/booking-email";
import { enqueueBookingCrmWebhook } from "@/lib/booking-crm-webhook";
import { resolveBookingFlowConfig } from "@/lib/chatbot-config";
import { getAppOrigin } from "@/lib/app-origin";
import { prisma } from "@/lib/prisma";
import {
  formatBookingSummary,
  normalizeCustomerEmail,
  parsedBookingHasSaveableSlot,
  resolveBookingServiceDescription,
  type ParsedBookingUtterance,
} from "@/lib/parse-booking-utterance";
import {
  checkCalendarAvailabilityForRoute,
  markAppointmentCalendarSyncFailed,
  syncAppointmentToExternalCalendar,
} from "@/lib/sync-appointment-calendar-event";
import {
  resolveRetellVoiceAgentConfig,
  resolveVoiceAgentKnowledgeConfig,
} from "@/lib/retell-voice-agent";
import { appendVoiceRetellBookingPrompt } from "@/lib/voice-retell-booking-prompt";
import { verifyRetellWebhookSignature } from "@/lib/retell-webhook-verify";

export { appendVoiceRetellBookingPrompt, VOICE_RETELL_BOOKING_PROMPT_MARKER } from "@/lib/voice-retell-booking-prompt";

export type VoiceRetellBookingArgs = {
  customer_name: string;
  customer_email?: string;
  service_description: string;
  party_size: number;
  start_time_iso: string;
  notes?: string;
};

export type VoiceRetellAvailabilityArgs = {
  start_time_iso: string;
  service_description?: string;
  party_size?: number;
};

export type VoiceRetellBookingResult =
  | { ok: true; message: string; appointmentId: string }
  | { ok: false; message: string };

export type VoiceRetellToolContext = {
  organizationId: string;
  organizationName: string;
  callId: string;
};

export type RetellToolHttpResult = { status: number; body: Record<string, unknown> };

function readRetellAgentIdFromCall(call: unknown): string {
  if (!call || typeof call !== "object" || Array.isArray(call)) return "";
  const rec = call as Record<string, unknown>;
  const agentId = rec.agent_id ?? rec.agentId;
  return typeof agentId === "string" ? agentId.trim() : "";
}

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parsePartySize(value: unknown): number | null {
  if (typeof value === "number" && value >= 1 && value <= 99) return Math.floor(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Math.min(99, Math.max(1, parseInt(value.trim(), 10)));
  }
  return null;
}

export function parseVoiceRetellAvailabilityArgs(raw: unknown): VoiceRetellAvailabilityArgs | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const startTimeIso = readString(rec.start_time_iso);
  const startTime = startTimeIso ? new Date(startTimeIso) : null;
  if (!startTime || Number.isNaN(startTime.getTime())) return null;

  const serviceDescription = readString(rec.service_description);
  const partySize = parsePartySize(rec.party_size);

  return {
    start_time_iso: startTime.toISOString(),
    service_description: serviceDescription ? serviceDescription.slice(0, 500) : undefined,
    party_size: partySize ?? undefined,
  };
}

export function parseVoiceRetellBookingArgs(raw: unknown): VoiceRetellBookingArgs | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;

  const customerName = readString(rec.customer_name);
  const serviceDescription = readString(rec.service_description);
  const partySize = parsePartySize(rec.party_size);
  const startTimeIso = readString(rec.start_time_iso);
  const startTime = startTimeIso ? new Date(startTimeIso) : null;

  if (!customerName || !serviceDescription || !partySize || !startTime || Number.isNaN(startTime.getTime())) {
    return null;
  }

  const customerEmail = readString(rec.customer_email);
  return {
    customer_name: customerName.slice(0, 200),
    customer_email: customerEmail ? normalizeCustomerEmail(customerEmail) ?? undefined : undefined,
    service_description: serviceDescription.slice(0, 500),
    party_size: partySize,
    start_time_iso: startTime.toISOString(),
    notes: readString(rec.notes).slice(0, 1000) || undefined,
  };
}

export async function findVoiceAgentOrgByRetellAgentId(retellAgentId: string) {
  const id = retellAgentId.trim();
  if (!id) return null;

  const rows = await prisma.organizationVoiceAgentSettings.findMany({
    select: {
      organizationId: true,
      retellConfig: true,
      knowledgeConfig: true,
      organization: { select: { id: true, name: true } },
    },
  });

  for (const row of rows) {
    const retell = resolveRetellVoiceAgentConfig(row.retellConfig);
    if (retell.retellAgentId === id) {
      return {
        organizationId: row.organizationId,
        organizationName: row.organization.name,
        knowledge: resolveVoiceAgentKnowledgeConfig(row.knowledgeConfig),
      };
    }
  }

  return null;
}

export async function buildVoiceRetellBookingPromptSection(organizationId: string): Promise<string> {
  const chatbotSettings = await prisma.organizationChatbotSettings.findUnique({
    where: { organizationId },
    select: { bookingFlow: true, services: true },
  });
  const flow = resolveBookingFlowConfig(chatbotSettings?.bookingFlow);
  const services = Array.isArray(chatbotSettings?.services)
    ? chatbotSettings.services.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const lines = [
    "You can book appointments for callers on this phone line.",
    "Before booking, call check_availability with the requested start time to verify the slot.",
    "If the slot is available, collect remaining details, confirm aloud, then call book_appointment.",
    `Default appointment length: ${flow.slotDurationMinutes} minutes.`,
  ];

  if (services.length) {
    lines.push(`Services offered: ${services.join(", ")}.`);
  }

  if (flow.steps.length) {
    lines.push("Ask these booking questions before confirming:");
    for (const step of flow.steps.slice(0, 12)) {
      lines.push(`- ${step.question}`);
    }
  } else {
    lines.push(
      "Required fields: service or visit type, party size, preferred date and time, customer full name, and email for confirmation.",
    );
  }

  lines.push(
    "If the caller only has questions, answer from business knowledge.",
    "CRITICAL: Never tell the caller the booking is confirmed until book_appointment returns success.",
    "You must call book_appointment during the call. Hanging up does not create a booking.",
  );

  return lines.join("\n");
}

export async function buildRetellBookingTools() {
  const origin = (await getAppOrigin()).replace(/\/$/, "");
  if (!origin) return [];

  const bookUrl = `${origin}/api/retell/tools/book-appointment`;
  const availabilityUrl = `${origin}/api/retell/tools/check-availability`;

  return [
    {
      type: "custom",
      name: "check_availability",
      description:
        "Check whether a requested appointment start time is available before confirming the booking with the caller.",
      url: availabilityUrl,
      method: "POST",
      parameters: {
        type: "object",
        required: ["start_time_iso"],
        properties: {
          start_time_iso: {
            type: "string",
            description: "Requested start time in ISO 8601 format.",
          },
          service_description: {
            type: "string",
            description: "Optional service or visit type being requested.",
          },
          party_size: {
            type: "number",
            description: "Optional number of guests.",
          },
        },
      },
      speak_during_execution: true,
      speak_after_execution: true,
    },
    {
      type: "custom",
      name: "book_appointment",
      description:
        "Create a confirmed appointment after check_availability passes and the caller confirms service, party size, date/time, name, and email.",
      url: bookUrl,
      method: "POST",
      parameters: {
        type: "object",
        required: ["customer_name", "service_description", "party_size", "start_time_iso"],
        properties: {
          customer_name: {
            type: "string",
            description: "Caller's full name for the reservation.",
          },
          customer_email: {
            type: "string",
            description: "Email address for booking confirmation.",
          },
          service_description: {
            type: "string",
            description: "Service, meal, or visit type (e.g. dinner, lunch, consultation).",
          },
          party_size: {
            type: "number",
            description: "Number of guests.",
          },
          start_time_iso: {
            type: "string",
            description: "Requested start time in ISO 8601 format (e.g. 2026-05-30T19:00:00.000Z).",
          },
          notes: {
            type: "string",
            description: "Optional special requests or notes from the caller.",
          },
        },
      },
      speak_during_execution: true,
      speak_after_execution: true,
    },
  ];
}

function argsToParsedBooking(
  args: VoiceRetellBookingArgs,
  slotDurationMinutes: number,
): ParsedBookingUtterance {
  const startTime = new Date(args.start_time_iso);
  const endTime = new Date(startTime.getTime() + slotDurationMinutes * 60_000);
  return {
    isBookingIntent: true,
    serviceDescription: args.service_description,
    partySize: args.party_size,
    customerName: args.customer_name,
    customerEmail: args.customer_email ?? null,
    startTime,
    endTime,
  };
}

export async function executeVoiceRetellBooking(args: {
  organizationId: string;
  organizationName: string;
  bookingArgs: VoiceRetellBookingArgs;
  callId?: string;
}): Promise<VoiceRetellBookingResult> {
  const chatbotSettings = await prisma.organizationChatbotSettings.findUnique({
    where: { organizationId: args.organizationId },
    select: { bookingFlow: true, services: true, crmIntegration: true },
  });
  const flow = resolveBookingFlowConfig(chatbotSettings?.bookingFlow);
  const parsed = argsToParsedBooking(args.bookingArgs, flow.slotDurationMinutes);

  if (!parsedBookingHasSaveableSlot(parsed) || parsed.startTime!.getTime() <= Date.now() - 120_000) {
    return {
      ok: false,
      message: "That time is invalid or in the past. Please ask for another date and time.",
    };
  }

  const rawMessage = [
    args.bookingArgs.service_description,
    `party of ${args.bookingArgs.party_size}`,
    args.bookingArgs.start_time_iso,
    args.bookingArgs.customer_name,
    args.bookingArgs.customer_email,
    args.bookingArgs.notes,
  ]
    .filter(Boolean)
    .join(" · ");

  const knowledgeSnapshot = await loadOrgBookingContext(args.organizationId);
  const gate = validateBookingAgainstOrgKnowledge({
    knowledgeStatus: knowledgeSnapshot.knowledgeStatus,
    knowledgeCorpus: knowledgeSnapshot.knowledgeCorpus,
    allowlistServices: knowledgeSnapshot.allowlistServices,
    parsed,
    rawMessage,
  });

  if (!gate.ok) {
    return { ok: false, message: bookingGateUserMessage(gate.code) };
  }

  const route = await findOrgCalendarRoute(args.organizationId);

  const dedupeSince = new Date(Date.now() - 60_000);
  const recentDuplicate = await prisma.appointment.findFirst({
    where: {
      organizationId: args.organizationId,
      source: "voice_retell",
      startTime: parsed.startTime!,
      endTime: parsed.endTime!,
      partySize: parsed.partySize,
      serviceDescription: parsed.serviceDescription?.slice(0, 500) ?? null,
      createdAt: { gte: dedupeSince },
      status: { not: "cancelled" },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  if (recentDuplicate) {
    const summary = formatBookingSummary(parsed);
    return {
      ok: true,
      message: summary
        ? `This booking was already received: ${summary}.`
        : "This booking was already received.",
      appointmentId: recentDuplicate.id,
    };
  }

  if (route) {
    const minGapMinutes = Math.max(0, Math.min(180, flow.minGapMinutes || 0));
    const precheckStart =
      minGapMinutes > 0
        ? new Date(parsed.startTime!.getTime() - minGapMinutes * 60_000)
        : parsed.startTime!;
    const precheckEnd =
      minGapMinutes > 0
        ? new Date(parsed.endTime!.getTime() + minGapMinutes * 60_000)
        : parsed.endTime!;
    const availability = await checkCalendarAvailabilityForRoute({
      providerId: route.providerId,
      connectionUserId: route.connectionUserId,
      start: precheckStart,
      end: precheckEnd,
    });
    if (availability.ok && availability.conflict) {
      const summary = formatBookingSummary(parsed);
      return {
        ok: false,
        message: summary
          ? `That time appears unavailable (${summary}). Please offer another time.`
          : "That time appears unavailable. Please offer another time.",
      };
    }
  }

  const resolvedServiceDescription = resolveBookingServiceDescription({ parsed, bookingFlowQa: null });
  const safeCustomerName = args.bookingArgs.customer_name;
  const safeCustomerEmail = args.bookingArgs.customer_email ?? null;

  const created = await prisma.appointment.create({
    data: {
      organizationId: args.organizationId,
      customerName: safeCustomerName,
      customerEmail: safeCustomerEmail,
      startTime: parsed.startTime!,
      endTime: parsed.endTime!,
      status: "requested",
      source: "voice_retell",
      serviceDescription: resolvedServiceDescription?.slice(0, 500) ?? null,
      partySize: parsed.partySize,
      rawMessage: rawMessage.slice(0, 4000),
      routedProviderId: route?.providerId ?? null,
      routedConnectionUserId: route?.connectionUserId ?? null,
      providerSyncStatus: route ? "routed" : "skipped_no_connection",
    } as Prisma.AppointmentUncheckedCreateInput,
  });

  let calendarSynced = false;
  let replyMessage = formatBookingSummary(parsed)
    ? `Booking confirmed: ${formatBookingSummary(parsed)}.`
    : "Booking confirmed.";

  if (safeCustomerEmail) {
    replyMessage += " A confirmation email will be sent.";
  } else if (route) {
    replyMessage += " Someone from the team will confirm availability.";
  } else {
    replyMessage += " Saved in the system; connect a calendar under Appointments to sync automatically.";
  }

  if (route) {
    try {
      const syncResult = await syncAppointmentToExternalCalendar({
        appointmentId: created.id,
        organizationId: args.organizationId,
        organizationName: args.organizationName,
        providerId: route.providerId,
        connectionUserId: route.connectionUserId,
      });
      if (!syncResult.ok) {
        await markAppointmentCalendarSyncFailed(created.id, args.organizationId, syncResult.error);
        if (syncResult.error.toLowerCase().includes("conflicts with an existing calendar event")) {
          return {
            ok: false,
            message: "That time conflicts with the calendar. Please offer another time.",
          };
        }
        replyMessage = formatBookingSummary(parsed)
          ? `Booking saved but calendar sync failed: ${formatBookingSummary(parsed)}. The team will follow up.`
          : "Booking saved but calendar sync failed. The team will follow up.";
      } else {
        calendarSynced = true;
        replyMessage = formatBookingSummary(parsed)
          ? `Reservation booked: ${formatBookingSummary(parsed)}.`
          : "Reservation booked.";
        if (safeCustomerEmail) replyMessage += " Confirmation email is on the way.";
      }
    } catch (syncErr) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      await markAppointmentCalendarSyncFailed(created.id, args.organizationId, msg);
      replyMessage = formatBookingSummary(parsed)
        ? `Booking saved but calendar sync failed: ${formatBookingSummary(parsed)}. The team will follow up.`
        : "Booking saved but calendar sync failed. The team will follow up.";
    }
  }

  void sendBookingConfirmationEmails({
    appointmentId: created.id,
    organizationId: args.organizationId,
    organizationName: args.organizationName,
    customerName: safeCustomerName,
    customerEmail: safeCustomerEmail,
    parsed: {
      ...parsed,
      customerName: safeCustomerName,
      customerEmail: safeCustomerEmail,
      serviceDescription: resolvedServiceDescription,
    },
    bookingFlowQa: null,
    calendarSynced,
    routedProviderId: route?.providerId ?? null,
  }).catch(() => undefined);

  enqueueBookingCrmWebhook({
    organizationId: args.organizationId,
    organizationName: args.organizationName,
    crmIntegration: chatbotSettings?.crmIntegration,
    bookingFlow: chatbotSettings?.bookingFlow,
    appointment: {
      id: created.id,
      customerName: safeCustomerName,
      customerEmail: safeCustomerEmail,
      startTime: parsed.startTime!,
      endTime: parsed.endTime!,
      status: "requested",
      source: "voice_retell",
      serviceDescription: resolvedServiceDescription?.slice(0, 500) ?? null,
      partySize: parsed.partySize,
      bookingFlowQa: null,
      rawMessage: rawMessage.slice(0, 4000),
    },
  });

  if (args.callId) {
    await prisma.auditEvent.create({
      data: {
        organizationId: args.organizationId,
        actorId: null,
        action: "voice_retell_booking_created",
        metadata: {
          appointmentId: created.id,
          callId: args.callId,
        },
      },
    }).catch(() => undefined);
  }

  return { ok: true, message: replyMessage, appointmentId: created.id };
}

export function readRetellAgentIdFromWebhookBody(body: Record<string, unknown>): string {
  const fromCall = readRetellAgentIdFromCall(body.call);
  if (fromCall) return fromCall;
  const topLevel = body.agent_id ?? body.agentId;
  return typeof topLevel === "string" ? topLevel.trim() : "";
}

export function extractRetellToolArgs(body: Record<string, unknown>): unknown {
  const nested = body.args;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested;
  }

  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "call" || key === "name" || key === "tool_name" || key === "args") continue;
    flat[key] = value;
  }
  return Object.keys(flat).length ? flat : null;
}

export async function resolveRetellPhoneBookingContext(
  rawBody: string,
  body: Record<string, unknown>,
  signature: string | null,
): Promise<RetellToolHttpResult | VoiceRetellToolContext> {
  const apiKey = process.env.RETELL_API_KEY?.trim();
  if (apiKey) {
    const sig = signature?.trim() ?? "";
    if (!sig) {
      console.warn("[retell-tools] Missing X-Retell-Signature header");
      return { status: 401, body: { error: "Missing signature" } };
    }
    if (!verifyRetellWebhookSignature(rawBody, sig, apiKey)) {
      console.warn("[retell-tools] Invalid Retell webhook signature");
      return {
        status: 401,
        body: {
          error:
            "Invalid signature. Use the Retell API key with the webhook badge for tool verification.",
        },
      };
    }
  }

  const agentId = readRetellAgentIdFromWebhookBody(body);
  if (!agentId) {
    return { status: 400, body: { error: "Missing Retell agent on call" } };
  }

  const orgMatch = await findVoiceAgentOrgByRetellAgentId(agentId);
  if (!orgMatch) {
    return { status: 404, body: { error: "Unknown Retell agent" } };
  }

  if (!orgMatch.knowledge.enablePhoneBooking) {
    return {
      status: 200,
      body: {
        result: "Phone booking is not enabled for this organization.",
        success: false,
      },
    };
  }

  const callRec = body.call && typeof body.call === "object" && !Array.isArray(body.call)
    ? (body.call as Record<string, unknown>)
    : {};
  const callIdRaw = callRec.call_id ?? callRec.callId ?? body.call_id ?? body.callId;

  return {
    organizationId: orgMatch.organizationId,
    organizationName: orgMatch.organizationName,
    callId: typeof callIdRaw === "string" ? callIdRaw.trim() : "",
  };
}

export async function executeVoiceRetellAvailabilityCheck(args: {
  organizationId: string;
  availabilityArgs: VoiceRetellAvailabilityArgs;
}): Promise<{ message: string; available: boolean }> {
  const chatbotSettings = await prisma.organizationChatbotSettings.findUnique({
    where: { organizationId: args.organizationId },
    select: { bookingFlow: true },
  });
  const flow = resolveBookingFlowConfig(chatbotSettings?.bookingFlow);
  const startTime = new Date(args.availabilityArgs.start_time_iso);
  const endTime = new Date(startTime.getTime() + flow.slotDurationMinutes * 60_000);

  if (Number.isNaN(startTime.getTime()) || startTime.getTime() <= Date.now() - 120_000) {
    return {
      available: false,
      message: "That time is invalid or already in the past. Ask for another date and time.",
    };
  }

  const slotLabel = startTime.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const route = await findOrgCalendarRoute(args.organizationId);
  if (!route) {
    return {
      available: true,
      message: `I can't verify live calendar availability for ${slotLabel}, but we can still request that time and the team will confirm.`,
    };
  }

  const minGapMinutes = Math.max(0, Math.min(180, flow.minGapMinutes || 0));
  const precheckStart =
    minGapMinutes > 0 ? new Date(startTime.getTime() - minGapMinutes * 60_000) : startTime;
  const precheckEnd =
    minGapMinutes > 0 ? new Date(endTime.getTime() + minGapMinutes * 60_000) : endTime;

  const availability = await checkCalendarAvailabilityForRoute({
    providerId: route.providerId,
    connectionUserId: route.connectionUserId,
    start: precheckStart,
    end: precheckEnd,
  });

  if (!availability.ok) {
    return {
      available: true,
      message: `I couldn't reach the calendar to verify ${slotLabel}, but we can still request that time and the team will confirm.`,
    };
  }

  if (availability.conflict) {
    return {
      available: false,
      message: `${slotLabel} appears unavailable on the calendar. Offer another time.`,
    };
  }

  return {
    available: true,
    message: `${slotLabel} looks available. Confirm the remaining details, then book it.`,
  };
}

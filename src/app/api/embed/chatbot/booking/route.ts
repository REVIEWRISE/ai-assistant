import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  bookingGateUserMessage,
  findOrgCalendarRoute,
  loadOrgBookingContext,
  validateBookingAgainstOrgKnowledge,
  type BookingGateCode,
  type OrgBookingContext,
} from "@/lib/booking-org-gate";
import {
  generatePrimaryChatbotReply,
  getOpenAiApiKey,
  type CalendarOutcomeForLlm,
} from "@/lib/openai-chat-reply";
import {
  buildChatbotReply,
  describeBookingGaps,
  formatBookingSummary,
  parsedBookingHasSaveableSlot,
  resolveBookingServiceDescription,
  type ParsedBookingUtterance,
} from "@/lib/parse-booking-utterance";
import { sendBookingConfirmationEmails } from "@/lib/booking-email";
import { enqueueBookingCrmWebhook } from "@/lib/booking-crm-webhook";
import { parseBookingFlowQaPayload } from "@/lib/booking-flow-qa";
import { normalizeCustomerEmail } from "@/lib/parse-booking-utterance";
import { resolveBookingFlowConfig } from "@/lib/chatbot-config";
import {
  checkCalendarAvailabilityForRoute,
  markAppointmentCalendarSyncFailed,
  syncAppointmentToExternalCalendar,
} from "@/lib/sync-appointment-calendar-event";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toParsedRecord(raw: unknown): ParsedBookingUtterance | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;

  const startIso = typeof p.startTimeIso === "string" ? p.startTimeIso : null;
  const endIso = typeof p.endTimeIso === "string" ? p.endTimeIso : null;
  const startTime = startIso ? new Date(startIso) : null;
  const endTime = endIso ? new Date(endIso) : null;

  if (startIso && Number.isNaN(startTime!.getTime())) return null;
  if (endIso && Number.isNaN(endTime!.getTime())) return null;

  const partyRaw = p.partySize;
  const partySize =
    typeof partyRaw === "number" && partyRaw >= 1 && partyRaw <= 99
      ? Math.floor(partyRaw)
      : partyRaw != null && typeof partyRaw === "string" && /^\d+$/.test(partyRaw)
        ? Math.min(99, Math.max(1, parseInt(partyRaw, 10)))
        : null;

  return {
    isBookingIntent: Boolean(p.isBookingIntent),
    serviceDescription: typeof p.serviceDescription === "string" ? p.serviceDescription : null,
    partySize,
    customerName: typeof p.customerName === "string" ? p.customerName : null,
    customerEmail:
      typeof p.customerEmail === "string" ? normalizeCustomerEmail(p.customerEmail) : null,
    startTime,
    endTime,
  };
}

function appendRoutingNote(base: string, routed: boolean): string {
  if (routed) {
    return base;
  }
  return `${base} Someone from the team will confirm availability with you.`;
}

function conflictReply(parsed: ParsedBookingUtterance): string {
  const summary = formatBookingSummary(parsed);
  return summary
    ? `That time appears unavailable in our calendar (${summary}). Please share another time and we can try again.`
    : "That time appears unavailable in our calendar. Please share another time and we can try again.";
}

function duplicateBookingReply(parsed: ParsedBookingUtterance): string {
  const summary = formatBookingSummary(parsed);
  return summary
    ? `Got it — we already received this booking: ${summary}.`
    : "Got it — we already received this booking.";
}

function summarizeBookingFlowQa(
  bookingFlowQa: Array<{ question: string; answer: string }> | null,
): string {
  if (!bookingFlowQa || bookingFlowQa.length === 0) return "";
  return bookingFlowQa
    .map((qa) => qa.answer.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" · ");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const organizationId = typeof b.organizationId === "string" ? b.organizationId.trim() : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";
  const explicitCustomerName = typeof b.customerName === "string" ? b.customerName.trim() : "";
  const explicitCustomerEmail =
    typeof b.customerEmail === "string" ? normalizeCustomerEmail(b.customerEmail) : null;
  const bookingFlowQa = parseBookingFlowQaPayload(b.bookingFlowQa);
  const history = Array.isArray(b.history)
    ? b.history
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          const role = row.role === "user" || row.role === "bot" ? row.role : null;
          const text = typeof row.text === "string" ? row.text.trim() : "";
          if (!role || !text) return null;
          return { role, text: text.slice(0, 1000) };
        })
        .filter((x): x is { role: "user" | "bot"; text: string } => Boolean(x))
        .slice(-10)
    : [];

  if (!UUID_RE.test(organizationId)) {
    return NextResponse.json({ error: "Invalid organization" }, { status: 400 });
  }

  if (!message || message.length > 4000) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const parsed = toParsedRecord(b.parsed);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid parsed payload" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  const chatbotSettings = await prisma.organizationChatbotSettings.findUnique({
    where: { organizationId },
    select: { bookingFlow: true, services: true, crmIntegration: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const now = Date.now();
  const slackMs = 120_000;
  const debugTag = `[chatbot-booking:${organizationId.slice(0, 8)}]`;

  let saved = false;
  let gateCode: BookingGateCode | undefined;
  let deterministicReply = buildChatbotReply(parsed, false);
  let knowledgeSnapshot: OrgBookingContext | null = null;
  let calendarOutcome: CalendarOutcomeForLlm = "not_applicable";

  const canAttemptSave =
    parsed.isBookingIntent &&
    parsedBookingHasSaveableSlot(parsed) &&
    parsed.startTime!.getTime() > now - slackMs;

  if (!parsed.isBookingIntent) {
    console.info(`${debugTag} skip: not booking intent`);
    deterministicReply = buildChatbotReply(parsed, false);
  } else if (!canAttemptSave) {
    console.info(
      `${debugTag} skip: incomplete-or-invalid booking payload`,
      JSON.stringify({
        gaps: describeBookingGaps(parsed),
        hasStart: Boolean(parsed.startTime),
        hasEnd: Boolean(parsed.endTime),
        startIso: parsed.startTime?.toISOString() ?? null,
        endIso: parsed.endTime?.toISOString() ?? null,
      }),
    );
    deterministicReply = buildChatbotReply(parsed, false);
  } else {
    knowledgeSnapshot = await loadOrgBookingContext(organizationId);
    const gate = validateBookingAgainstOrgKnowledge({
      knowledgeStatus: knowledgeSnapshot.knowledgeStatus,
      knowledgeCorpus: knowledgeSnapshot.knowledgeCorpus,
      allowlistServices: knowledgeSnapshot.allowlistServices,
      parsed,
      rawMessage: message,
    });

    if (!gate.ok) {
      gateCode = gate.code;
      console.info(`${debugTag} gate blocked`, gate.code);
      deterministicReply = bookingGateUserMessage(gate.code);
    } else {
      const route = await findOrgCalendarRoute(organizationId);
      console.info(
        `${debugTag} gate passed`,
        JSON.stringify({
          routed: Boolean(route),
          providerId: route?.providerId ?? null,
          providerName: route?.providerName ?? null,
          connectionUserId: route?.connectionUserId ?? null,
        }),
      );
      try {
        const dedupeSince = new Date(Date.now() - 60_000);
        const recentDuplicate = await prisma.appointment.findFirst({
          where: {
            organizationId,
            source: "chatbot_embed",
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
          saved = true;
          deterministicReply = duplicateBookingReply(parsed);
          console.info(
            `${debugTag} dedupe hit`,
            JSON.stringify({ appointmentId: recentDuplicate.id }),
          );
          return NextResponse.json({
            reply: deterministicReply,
            replySource: "fallback",
            saved,
            gateCode: gateCode ?? null,
            parsed: {
              isBookingIntent: parsed.isBookingIntent,
              serviceDescription: parsed.serviceDescription,
              partySize: parsed.partySize,
              startTimeIso: parsed.startTime?.toISOString() ?? null,
              endTimeIso: parsed.endTime?.toISOString() ?? null,
            },
          });
        }

        if (route) {
          const flowConfig = resolveBookingFlowConfig(chatbotSettings?.bookingFlow);
          const minGapMinutes = Math.max(0, Math.min(180, flowConfig.minGapMinutes || 0));
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
          if (!availability.ok) {
            console.warn(
              `${debugTag} calendar precheck failed`,
              JSON.stringify({ error: availability.error }),
            );
          } else if (availability.conflict) {
            console.info(`${debugTag} calendar precheck conflict`);
            deterministicReply = conflictReply(parsed);
            return NextResponse.json({
              reply: deterministicReply,
              replySource: "fallback",
              saved: false,
              gateCode: gateCode ?? null,
              parsed: {
                isBookingIntent: parsed.isBookingIntent,
                serviceDescription: parsed.serviceDescription,
                partySize: parsed.partySize,
                startTimeIso: parsed.startTime?.toISOString() ?? null,
                endTimeIso: parsed.endTime?.toISOString() ?? null,
              },
            });
          }
        }

        const safeCustomerName =
          (explicitCustomerName || parsed.customerName || "Website guest").slice(0, 200);
        const safeCustomerEmail =
          explicitCustomerEmail ?? parsed.customerEmail ?? null;
        const resolvedServiceDescription = resolveBookingServiceDescription({
          parsed,
          bookingFlowQa,
        });
        const created = await prisma.appointment.create({
          data: {
            organizationId,
            customerName: safeCustomerName,
            customerEmail: safeCustomerEmail,
            startTime: parsed.startTime!,
            endTime: parsed.endTime!,
            status: "requested",
            source: "chatbot_embed",
            serviceDescription: resolvedServiceDescription?.slice(0, 500) ?? null,
            partySize: parsed.partySize,
            bookingFlowQa: bookingFlowQa ?? undefined,
            rawMessage: message.slice(0, 4000),
            routedProviderId: route?.providerId ?? null,
            routedConnectionUserId: route?.connectionUserId ?? null,
            providerSyncStatus: route ? "routed" : "skipped_no_connection",
          } as Prisma.AppointmentUncheckedCreateInput,
        });
        saved = true;
        let calendarSynced = false;
        calendarOutcome = "no_calendar_connected";
        console.info(
          `${debugTag} appointment saved`,
          JSON.stringify({ appointmentId: created.id, routed: Boolean(route) }),
        );
        const qaSummary = summarizeBookingFlowQa(bookingFlowQa);
        const emailNote = safeCustomerEmail
          ? " A confirmation email is on its way."
          : "";
        deterministicReply = qaSummary
          ? appendRoutingNote(
              `You're all set — we received your request: ${qaSummary}.${emailNote}`,
              Boolean(route),
            )
          : appendRoutingNote(buildChatbotReply(parsed, true), Boolean(route)) + emailNote;

        const parsedForEmail = {
          ...parsed,
          customerName: safeCustomerName,
          customerEmail: safeCustomerEmail,
          serviceDescription: resolvedServiceDescription,
        };

        const dispatchBookingEmails = () => {
          void sendBookingConfirmationEmails({
            appointmentId: created.id,
            organizationId,
            organizationName: org.name,
            customerName: safeCustomerName,
            customerEmail: safeCustomerEmail,
            parsed: parsedForEmail,
            bookingFlowQa,
            calendarSynced,
            routedProviderId: route?.providerId ?? null,
          })
            .then((results) => {
              if (results.guest?.ok === false && !results.guest.skipped) {
                console.warn(
                  `${debugTag} guest email failed`,
                  JSON.stringify({ error: results.guest.error }),
                );
              }
              if (results.team?.ok === false && !results.team.skipped) {
                console.warn(
                  `${debugTag} team email failed`,
                  JSON.stringify({ error: results.team.error }),
                );
              }
            })
            .catch((err) => {
              console.warn(
                `${debugTag} email exception`,
                err instanceof Error ? err.message : String(err),
              );
            });
        };

        if (route) {
          await prisma.auditEvent.create({
            data: {
              organizationId,
              actorId: null,
              action: "chatbot_booking_routed",
              metadata: {
                appointmentId: created.id,
                providerId: route.providerId,
                providerName: route.providerName,
                connectionUserId: route.connectionUserId,
              },
            },
          });

          try {
            const syncResult = await syncAppointmentToExternalCalendar({
              appointmentId: created.id,
              organizationId,
              organizationName: org.name,
              providerId: route.providerId,
              connectionUserId: route.connectionUserId,
            });
            if (!syncResult.ok) {
              calendarOutcome = "sync_failed";
              console.warn(
                `${debugTag} calendar sync failed`,
                JSON.stringify({ appointmentId: created.id, error: syncResult.error }),
              );
              await markAppointmentCalendarSyncFailed(created.id, organizationId, syncResult.error);
              const isConflict = syncResult.error
                .toLowerCase()
                .includes("conflicts with an existing calendar event");
              deterministicReply = isConflict ? conflictReply(parsed) : buildChatbotReply(parsed, true);
              await prisma.auditEvent.create({
                data: {
                  organizationId,
                  actorId: null,
                  action: "chatbot_calendar_sync_failed",
                  metadata: {
                    appointmentId: created.id,
                    error: syncResult.error.slice(0, 500),
                  },
                },
              });
            } else {
              calendarOutcome = "synced";
              calendarSynced = true;
              console.info(
                `${debugTag} calendar synced`,
                JSON.stringify({
                  appointmentId: created.id,
                  externalEventId: syncResult.externalEventId,
                }),
              );
              const summary = summarizeBookingFlowQa(bookingFlowQa) || formatBookingSummary(parsed);
              deterministicReply = summary
                ? `You're all set — your reservation is booked: ${summary}.${emailNote}`
                : `You're all set — your reservation is booked.${emailNote}`;
              await prisma.auditEvent.create({
                data: {
                  organizationId,
                  actorId: null,
                  action: "chatbot_calendar_synced",
                  metadata: {
                    appointmentId: created.id,
                    externalEventId: syncResult.externalEventId,
                  },
                },
              });
            }
          } catch (syncErr) {
            const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
            calendarOutcome = "sync_failed";
            console.warn(
              `${debugTag} calendar sync exception`,
              JSON.stringify({ appointmentId: created.id, error: msg }),
            );
            await markAppointmentCalendarSyncFailed(created.id, organizationId, msg);
            const isConflict = msg.toLowerCase().includes("conflicts with an existing calendar event");
            deterministicReply = isConflict ? conflictReply(parsed) : buildChatbotReply(parsed, true);
            await prisma.auditEvent.create({
              data: {
                organizationId,
                actorId: null,
                action: "chatbot_calendar_sync_failed",
                metadata: {
                  appointmentId: created.id,
                  error: msg.slice(0, 500),
                },
              },
            });
          }
        }

        dispatchBookingEmails();

        enqueueBookingCrmWebhook({
          organizationId,
          organizationName: org.name,
          crmIntegration: chatbotSettings?.crmIntegration,
          appointment: {
            id: created.id,
            customerName: safeCustomerName,
            customerEmail: safeCustomerEmail,
            startTime: parsed.startTime!,
            endTime: parsed.endTime!,
            status: "requested",
            source: "chatbot_embed",
            serviceDescription: resolvedServiceDescription?.slice(0, 500) ?? null,
            partySize: parsed.partySize,
            bookingFlowQa: bookingFlowQa ?? null,
            rawMessage: message.slice(0, 4000),
          },
        });
      } catch {
        saved = false;
        calendarOutcome = "not_applicable";
        console.warn(`${debugTag} appointment save failed`);
        deterministicReply = buildChatbotReply(parsed, false);
      }
    }
  }

  let reply = deterministicReply;
  let replySource: "openai" | "fallback" = "fallback";
  let llmError: string | undefined;

  const shouldUseLlmReply =
    !saved &&
    !gateCode &&
    calendarOutcome === "not_applicable" &&
    !parsed.isBookingIntent;

  if (shouldUseLlmReply && getOpenAiApiKey()) {
    try {
      const ctx = knowledgeSnapshot ?? (await loadOrgBookingContext(organizationId));
      const llmResult = await generatePrimaryChatbotReply({
        organizationName: org.name,
        knowledgeCorpus: ctx.knowledgeCorpus,
        knowledgeStatus: ctx.knowledgeStatus,
        userMessage:
          history.length > 0
            ? history
                .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text}`)
                .join("\n")
            : message,
        parsed,
        saved,
        gateCode: gateCode ?? null,
        calendarOutcome,
      });
      if (llmResult.text) {
        reply = llmResult.text;
        replySource = "openai";
      } else {
        llmError = llmResult.errorHint;
      }
    } catch {
      llmError = "exception";
    }
  }

  return NextResponse.json({
    reply,
    replySource,
    ...(process.env.NODE_ENV === "development" && llmError ? { llmError } : {}),
    saved,
    gateCode: gateCode ?? null,
    parsed: {
      isBookingIntent: parsed.isBookingIntent,
      serviceDescription: parsed.serviceDescription,
      partySize: parsed.partySize,
      startTimeIso: parsed.startTime?.toISOString() ?? null,
      endTimeIso: parsed.endTime?.toISOString() ?? null,
    },
  });
}

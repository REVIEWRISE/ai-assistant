import { prisma } from "@/lib/prisma";
import { resolveVoiceAgentKnowledgeConfig } from "@/lib/retell-voice-agent";

export const VOICE_REPORT_DAYS = 7;
const VISIBLE_FOLLOW_UPS = 5;
/** Shorter calls are usually wrong numbers or hang-ups, not missed bookings. */
const MIN_BOOKING_INTENT_SECONDS = 30;

export type VoiceFollowUpReason = "unhappy" | "failed" | "no_booking";

export type VoiceReportCall = {
  id: string;
  callId: string;
  callStatus: string;
  direction: string;
  fromNumber: string | null;
  durationSeconds: number;
  summary: string | null;
  sentiment: string | null;
  followUpDoneAt: Date | null;
  createdAt: Date;
};

export type VoiceFollowUp = {
  id: string;
  reason: VoiceFollowUpReason;
  reasonLabel: string;
  nextStep: string;
  caller: string | null;
  whenLabel: string;
  summary: string | null;
};

export type VoiceCallReport = {
  periodDays: number;
  totalCalls: number;
  bookedCalls: number;
  unhappyCalls: number;
  avgDurationSeconds: number;
  bookingEnabled: boolean;
  followUpCount: number;
  followUpsDone: number;
  followUps: VoiceFollowUp[];
};

const REASON_COPY: Record<VoiceFollowUpReason, { label: string; nextStep: string; priority: number }> = {
  unhappy: { label: "Unhappy caller", nextStep: "Call back to make it right.", priority: 0 },
  failed: { label: "Call failed", nextStep: "Call back, the call didn’t finish.", priority: 1 },
  no_booking: { label: "No booking made", nextStep: "Call back to offer a time.", priority: 2 },
};

function isUnhappy(sentiment: string | null): boolean {
  const value = (sentiment ?? "").toLowerCase().trim();
  return value === "negative" || value === "frustrated";
}

function followUpReason(
  call: VoiceReportCall,
  booked: boolean,
  bookingEnabled: boolean,
): VoiceFollowUpReason | null {
  if (isUnhappy(call.sentiment)) return "unhappy";

  const status = call.callStatus.toLowerCase().trim();
  if (status === "error" || status === "failed") return "failed";

  const finished = status === "ended" || status === "completed" || status === "done";
  if (
    bookingEnabled &&
    !booked &&
    finished &&
    call.direction.toLowerCase() === "inbound" &&
    call.durationSeconds >= MIN_BOOKING_INTENT_SECONDS
  ) {
    return "no_booking";
  }
  return null;
}

function formatWhen(date: Date, timezone: string | null | undefined): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  try {
    return date.toLocaleString("en-US", { ...options, timeZone: timezone || undefined });
  } catch {
    // A bad stored timezone shouldn't take the dashboard down.
    return date.toLocaleString("en-US", options);
  }
}

export function buildVoiceCallReport(input: {
  calls: VoiceReportCall[];
  bookedCallIds: Set<string>;
  bookingEnabled: boolean;
  timezone?: string | null;
}): VoiceCallReport {
  const { calls, bookedCallIds, bookingEnabled, timezone } = input;

  const bookedNumbers = new Set(
    calls.filter((call) => bookedCallIds.has(call.callId) && call.fromNumber).map((call) => call.fromNumber),
  );

  // Handling a caller also clears their earlier calls. Only a newer call raises a new follow-up.
  const doneThroughByNumber = new Map<string, number>();
  for (const call of calls) {
    if (!call.followUpDoneAt || !call.fromNumber) continue;
    const time = call.createdAt.getTime();
    doneThroughByNumber.set(call.fromNumber, Math.max(time, doneThroughByNumber.get(call.fromNumber) ?? 0));
  }

  const candidates = calls
    .filter((call) => {
      if (call.followUpDoneAt) return false;
      const doneThrough = call.fromNumber ? doneThroughByNumber.get(call.fromNumber) : undefined;
      return doneThrough === undefined || call.createdAt.getTime() > doneThrough;
    })
    .map((call) => ({ call, reason: followUpReason(call, bookedCallIds.has(call.callId), bookingEnabled) }))
    .filter((item): item is { call: VoiceReportCall; reason: VoiceFollowUpReason } => {
      if (!item.reason) return false;
      // Someone who rang again and booked no longer needs chasing for a booking.
      return !(item.reason === "no_booking" && bookedNumbers.has(item.call.fromNumber));
    })
    .sort(
      (a, b) =>
        REASON_COPY[a.reason].priority - REASON_COPY[b.reason].priority ||
        b.call.createdAt.getTime() - a.call.createdAt.getTime(),
    );

  // One row per caller: their most urgent, most recent call.
  const seenNumbers = new Set<string>();
  const followUps = candidates.filter(({ call }) => {
    if (!call.fromNumber) return true;
    if (seenNumbers.has(call.fromNumber)) return false;
    seenNumbers.add(call.fromNumber);
    return true;
  });

  const totalDuration = calls.reduce((sum, call) => sum + call.durationSeconds, 0);

  return {
    periodDays: VOICE_REPORT_DAYS,
    totalCalls: calls.length,
    bookedCalls: calls.filter((call) => bookedCallIds.has(call.callId)).length,
    unhappyCalls: calls.filter((call) => isUnhappy(call.sentiment)).length,
    avgDurationSeconds: calls.length > 0 ? Math.round(totalDuration / calls.length) : 0,
    bookingEnabled,
    followUpCount: followUps.length,
    followUpsDone: calls.filter((call) => call.followUpDoneAt).length,
    followUps: followUps.slice(0, VISIBLE_FOLLOW_UPS).map(({ call, reason }) => ({
      id: call.id,
      reason,
      reasonLabel: REASON_COPY[reason].label,
      nextStep: REASON_COPY[reason].nextStep,
      caller: call.fromNumber,
      whenLabel: formatWhen(call.createdAt, timezone),
      summary: call.summary?.trim() || null,
    })),
  };
}

export async function getVoiceCallReport(
  organizationId: string,
  now: Date,
  timezone?: string | null,
): Promise<VoiceCallReport> {
  const since = new Date(now.getTime() - VOICE_REPORT_DAYS * 24 * 60 * 60 * 1000);

  const [calls, settings] = await Promise.all([
    prisma.retellCall.findMany({
      where: { organizationId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        id: true,
        callId: true,
        callStatus: true,
        direction: true,
        fromNumber: true,
        durationSeconds: true,
        summary: true,
        sentiment: true,
        followUpDoneAt: true,
        createdAt: true,
      },
    }),
    prisma.organizationVoiceAgentSettings.findUnique({
      where: { organizationId },
      select: { knowledgeConfig: true },
    }),
  ]);

  const bookings = calls.length
    ? await prisma.appointment.findMany({
        where: { organizationId, retellCallId: { in: calls.map((call) => call.callId) } },
        select: { retellCallId: true },
      })
    : [];

  return buildVoiceCallReport({
    calls,
    bookedCallIds: new Set(bookings.flatMap((booking) => (booking.retellCallId ? [booking.retellCallId] : []))),
    bookingEnabled: resolveVoiceAgentKnowledgeConfig(settings?.knowledgeConfig).enablePhoneBooking,
    timezone,
  });
}

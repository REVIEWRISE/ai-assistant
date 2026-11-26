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

export type VoiceReportDay = {
  /** YYYY-MM-DD in the workspace timezone. */
  date: string;
  /** Short axis label, e.g. "Mon". */
  label: string;
  /** Long label for tooltips, e.g. "Mon, Nov 24". */
  fullLabel: string;
  booked: number;
  handled: number;
  followUp: number;
  unhappy: number;
  durationSeconds: number;
};

export type VoiceCallReport = {
  periodDays: number;
  /** One entry per day, oldest first, including days with no calls. */
  days: VoiceReportDay[];
  /** Busiest two-hour window, e.g. "9–11 AM"; null when there are too few calls to say. */
  peakWindowLabel: string | null;
  peakWindowCalls: number;
  /** Same measures for the 7 days before this period; null when there were no calls then. */
  previous: {
    totalCalls: number;
    bookedCalls: number;
    unhappyCalls: number;
    avgDurationSeconds: number;
  } | null;
  /** Included calling minutes for the billing period; filled by the dashboard loader. */
  minutes: {
    includedMinutes: number;
    usedMinutes: number;
    remainingMinutes: number;
    periodEnd: string;
  } | null;
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

const MIN_CALLS_FOR_PEAK = 5;

function safeTimeZone(timezone: string | null | undefined): string | undefined {
  if (!timezone) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return undefined;
  }
}

function dayKey(date: Date, timeZone: string | undefined): string {
  // en-CA formats as YYYY-MM-DD.
  return date.toLocaleDateString("en-CA", { timeZone });
}

function hourOf(date: Date, timeZone: string | undefined): number {
  const hour = Number(date.toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone }));
  return Number.isFinite(hour) ? hour % 24 : 0;
}

function hourLabel(hour: number): string {
  const h = hour % 24;
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`;
}

function windowLabel(start: number): string {
  const end = (start + 2) % 24;
  const startLabel = hourLabel(start);
  const endLabel = hourLabel(end);
  // "9–11 AM" when both ends share AM/PM, otherwise "11 AM–1 PM".
  return startLabel.slice(-2) === endLabel.slice(-2)
    ? `${startLabel.slice(0, -3)}–${endLabel}`
    : `${startLabel}–${endLabel}`;
}

function buildDays(
  calls: VoiceReportCall[],
  outcomeOf: (call: VoiceReportCall) => "booked" | "handled" | "followUp",
  now: Date,
  timeZone: string | undefined,
): VoiceReportDay[] {
  const days: VoiceReportDay[] = [];
  const byKey = new Map<string, VoiceReportDay>();
  for (let offset = VOICE_REPORT_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const key = dayKey(date, timeZone);
    if (byKey.has(key)) continue;
    const day: VoiceReportDay = {
      date: key,
      label: date.toLocaleDateString("en-US", { weekday: "short", timeZone }),
      fullLabel: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone }),
      booked: 0,
      handled: 0,
      followUp: 0,
      unhappy: 0,
      durationSeconds: 0,
    };
    byKey.set(key, day);
    days.push(day);
  }
  for (const call of calls) {
    const day = byKey.get(dayKey(call.createdAt, timeZone));
    if (!day) continue;
    day[outcomeOf(call)] += 1;
    if (isUnhappy(call.sentiment)) day.unhappy += 1;
    day.durationSeconds += call.durationSeconds;
  }
  return days;
}

function peakWindow(calls: VoiceReportCall[], timeZone: string | undefined) {
  if (calls.length < MIN_CALLS_FOR_PEAK) return { label: null, calls: 0 };
  const perHour = new Array<number>(24).fill(0);
  for (const call of calls) perHour[hourOf(call.createdAt, timeZone)] += 1;
  let best = 0;
  let bestCount = -1;
  for (let hour = 0; hour < 24; hour += 1) {
    const count = perHour[hour] + perHour[(hour + 1) % 24];
    if (count > bestCount) {
      best = hour;
      bestCount = count;
    }
  }
  // A "peak" holding a single call says nothing useful.
  return bestCount >= 2 ? { label: windowLabel(best), calls: bestCount } : { label: null, calls: 0 };
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
  now?: Date;
}): VoiceCallReport {
  const { calls, bookedCallIds, bookingEnabled, timezone } = input;
  const now = input.now ?? new Date();
  const timeZone = safeTimeZone(timezone);

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

  const followUpCallIds = new Set(candidates.map(({ call }) => call.id));
  const days = buildDays(
    calls,
    (call) =>
      followUpCallIds.has(call.id) ? "followUp" : bookedCallIds.has(call.callId) ? "booked" : "handled",
    now,
    timeZone,
  );
  const peak = peakWindow(calls, timeZone);

  const totalDuration = calls.reduce((sum, call) => sum + call.durationSeconds, 0);

  return {
    periodDays: VOICE_REPORT_DAYS,
    days,
    peakWindowLabel: peak.label,
    peakWindowCalls: peak.calls,
    previous: null,
    minutes: null,
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
  const periodMs = VOICE_REPORT_DAYS * 24 * 60 * 60 * 1000;
  const since = new Date(now.getTime() - periodMs);
  const previousSince = new Date(since.getTime() - periodMs);

  const [calls, settings, previousCalls] = await Promise.all([
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
    prisma.retellCall.findMany({
      where: { organizationId, createdAt: { gte: previousSince, lt: since } },
      take: 1000,
      select: { callId: true, durationSeconds: true, sentiment: true },
    }),
  ]);

  const bookings = calls.length
    ? await prisma.appointment.findMany({
        where: { organizationId, retellCallId: { in: calls.map((call) => call.callId) } },
        select: { retellCallId: true },
      })
    : [];

  const previousBooked = previousCalls.length
    ? await prisma.appointment.count({
        where: { organizationId, retellCallId: { in: previousCalls.map((call) => call.callId) } },
      })
    : 0;
  const previous =
    previousCalls.length > 0
      ? {
          totalCalls: previousCalls.length,
          bookedCalls: previousBooked,
          unhappyCalls: previousCalls.filter((call) => isUnhappy(call.sentiment)).length,
          avgDurationSeconds: Math.round(
            previousCalls.reduce((sum, call) => sum + call.durationSeconds, 0) / previousCalls.length,
          ),
        }
      : null;

  const report = buildVoiceCallReport({
    calls,
    bookedCallIds: new Set(bookings.flatMap((booking) => (booking.retellCallId ? [booking.retellCallId] : []))),
    bookingEnabled: resolveVoiceAgentKnowledgeConfig(settings?.knowledgeConfig).enablePhoneBooking,
    timezone,
    now,
  });
  return { ...report, previous };
}

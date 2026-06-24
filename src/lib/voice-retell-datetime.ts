import { parseBookingUtterance } from "@/lib/parse-booking-utterance";

const ISO_LIKE =
  /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** Wall-clock "now" in the organization's timezone (for relative dates like tomorrow). */
export function referenceNowInTimeZone(timeZone: string): Date {
  const tz = timeZone.trim() || "UTC";
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
    return new Date(
      parseInt(get("year"), 10),
      parseInt(get("month"), 10) - 1,
      parseInt(get("day"), 10),
      parseInt(get("hour"), 10),
      parseInt(get("minute"), 10),
      parseInt(get("second"), 10),
    );
  } catch {
    return now;
  }
}

export function formatVoiceBookingDateReference(reference: Date, timeZone: string): {
  todayLabel: string;
  tomorrowLabel: string;
  year: number;
  isoDate: string;
} {
  const tz = timeZone.trim() || "UTC";
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);

  const tomorrow = new Date(reference);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);

  return {
    todayLabel: fmt(reference),
    tomorrowLabel: fmt(tomorrow),
    year: reference.getFullYear(),
    isoDate,
  };
}

export function buildVoiceBookingDatePromptLines(reference: Date, timeZone: string): string[] {
  const { todayLabel, tomorrowLabel, year, isoDate } = formatVoiceBookingDateReference(
    reference,
    timeZone,
  );

  return [
    "DATE & TIME (critical — use this reference for every booking):",
    `- Today is ${todayLabel} (${isoDate}). Current year is ${year}.`,
    `- "Tomorrow" means ${tomorrowLabel}.`,
    `- If the caller says a month and day without a year (e.g. "January 22", "Jan 22"), use year ${year}, or ${year + 1} only if that date has already passed this year.`,
    `- Never use a past year (e.g. do not use ${year - 1}) unless the caller explicitly says that year.`,
    `- Confirm the date and time aloud before calling check_availability or book_appointment.`,
    `- Pass start_time_iso in full ISO 8601 including the correct year and local time (e.g. ${year}-06-15T19:00:00.000Z).`,
  ];
}

function looksLikeIsoDateTime(raw: string): boolean {
  return ISO_LIKE.test(raw.trim());
}

/** Snap ISO datetimes that used the wrong year to the nearest future slot in the reference year. */
export function correctIsoYearIfNeeded(iso: string, reference: Date, graceMs = 120_000): Date | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const now = reference.getTime();
  if (d.getTime() >= now - graceMs) return d;

  const month = d.getMonth();
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const ms = d.getMilliseconds();

  const refYear = reference.getFullYear();
  for (const year of [refYear, refYear + 1]) {
    const candidate = new Date(year, month, day, hours, minutes, seconds, ms);
    if (candidate.getTime() >= now - graceMs) return candidate;
  }

  return null;
}

/**
 * Resolve caller date/time from natural language or ISO into a future start time.
 */
export function resolveVoiceBookingStartTime(args: {
  raw: string;
  reference: Date;
  slotDurationMinutes?: number;
}): Date | null {
  const raw = args.raw.trim();
  if (!raw) return null;

  const slotMinutes = Math.max(15, Math.min(480, args.slotDurationMinutes ?? 30));

  if (looksLikeIsoDateTime(raw)) {
    const corrected = correctIsoYearIfNeeded(raw, args.reference);
    if (corrected) return corrected;
  }

  const parsed = parseBookingUtterance(raw, args.reference, slotMinutes);
  if (parsed.startTime && !Number.isNaN(parsed.startTime.getTime())) {
    let start = parsed.startTime;
    if (start.getTime() < args.reference.getTime() - 120_000) {
      const corrected = correctIsoYearIfNeeded(start.toISOString(), args.reference);
      if (corrected) start = corrected;
    }
    if (start.getTime() >= args.reference.getTime() - 120_000) return start;
  }

  if (!looksLikeIsoDateTime(raw)) {
    return null;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function resolveVoiceBookingStartTimeIso(args: {
  raw: string;
  reference: Date;
  slotDurationMinutes?: number;
}): string | null {
  const resolved = resolveVoiceBookingStartTime(args);
  return resolved ? resolved.toISOString() : null;
}

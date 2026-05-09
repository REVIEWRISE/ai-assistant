/**
 * Heuristic parser for booking-style messages. Pass `reference` from the visitor's browser
 * (`new Date()`) so "tomorrow" and local wall-clock times match their calendar.
 */

export type ParsedBookingUtterance = {
  isBookingIntent: boolean;
  serviceDescription: string | null;
  partySize: number | null;
  customerName: string | null;
  startTime: Date | null;
  endTime: Date | null;
};

/** True when parsed state includes party size and a time window (ready for save / gate checks). */
export function parsedBookingHasSaveableSlot(parsed: ParsedBookingUtterance): boolean {
  return (
    parsed.startTime != null &&
    parsed.endTime != null &&
    parsed.endTime.getTime() > parsed.startTime.getTime()
  );
}

/** Short list of which booking fields are still absent (for LLM context only). */
export function describeBookingGaps(p: ParsedBookingUtterance): string {
  const g: string[] = [];
  if (!p.startTime) g.push("time");
  return g.length ? g.join(", ") : "none";
}

/** Split step ids on underscores so `service_name` does not match a loose `/name/` substring. */
function idSegments(id: string): string[] {
  return id.toLowerCase().split(/_+/).filter(Boolean);
}

const CUSTOMER_NAME_ID_TOKENS = new Set([
  "guest_name",
  "customer",
  "contact",
  "fullname",
  "first_name",
  "last_name",
  "client_name",
  "contact_name",
  "reservation_name",
]);

/** Segment before `name` that refers to a product/org field, not the visitor's name. */
const NON_CUSTOMER_NAME_PREFIX = new Set([
  "service",
  "company",
  "business",
  "brand",
  "org",
  "organization",
  "product",
  "plan",
  "account",
  "venue",
  "location",
  "table",
]);

export function stepIdIndicatesCustomerName(id: string): boolean {
  const segs = idSegments(id);
  if (segs.some((s) => CUSTOMER_NAME_ID_TOKENS.has(s))) return true;
  const i = segs.indexOf("name");
  if (i === -1) return false;
  const prefix = i > 0 ? segs[i - 1] : "";
  if (NON_CUSTOMER_NAME_PREFIX.has(prefix)) return false;
  return true;
}

const PARTY_SIZE_ID_TOKENS = new Set([
  "party",
  "party_size",
  "guests",
  "guest_count",
  "num_guests",
  "n_guests",
  "people",
  "pax",
  "size",
  "headcount",
  "covers",
]);

export function stepIdIndicatesPartySize(id: string): boolean {
  return idSegments(id).some((s) => PARTY_SIZE_ID_TOKENS.has(s));
}

const BOOKING_HINT =
  /\b(book|booking|bookings|reserve|reservation|reservations|table\s+for|a\s+table|schedule|appointment)\b/i;
const BOOKING_FOLLOWUP_HINT =
  /\b(?:for\s+\d{1,2}\s*(?:people|guests|guest|persons?|pax)?|party\s+of\s+\d{1,2}|on\s+[a-z]+\.?\s+\d{1,2}|\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i;

const MEAL_OR_SERVICE: Array<{ re: RegExp; label: string }> = [
  { re: /\b(brunch)\b/i, label: "Brunch" },
  { re: /\b(breakfast)\b/i, label: "Breakfast" },
  { re: /\b(lunch)\b/i, label: "Lunch" },
  { re: /\b(dinner)\b/i, label: "Dinner" },
  { re: /\b(high\s*tea|afternoon\s+tea)\b/i, label: "Afternoon tea" },
  { re: /\b(tasting\s+menu)\b/i, label: "Tasting menu" },
  { re: /\b(chef'?s?\s+table)\b/i, label: "Chef's table" },
  { re: /\b(private\s+dining|private\s+room)\b/i, label: "Private dining" },
  { re: /\b(bar\s+seating|at\s+the\s+bar)\b/i, label: "Bar seating" },
];

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addLocalDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function parsePartySize(text: string): number | null {
  const lower = text.toLowerCase();
  const wordToNumber: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
  };
  const patterns: RegExp[] = [
    /\b(?:party\s+of|table\s+for|for)\s+(\d{1,2})\b/i,
    /\b(\d{1,2})\s*(?:people|guests|guest|persons?|pax)\b/i,
  ];
  for (const re of patterns) {
    const m = lower.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 99) return n;
    }
  }

  const wordPatterns: RegExp[] = [
    /\b(?:party\s+of|table\s+for|for)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i,
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:people|guests|guest|persons?|pax)\b/i,
  ];
  for (const re of wordPatterns) {
    const m = lower.match(re);
    if (m) {
      const n = wordToNumber[m[1].toLowerCase()];
      if (n >= 1 && n <= 99) return n;
    }
  }
  return null;
}

function parseCustomerName(text: string): string | null {
  const m = text.match(/\b(?:for|name\s+is|i'?m|i\s+am)\s+([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*){0,2})\b/);
  if (!m) return null;
  const name = m[1].trim();
  if (/^(the|a|an|tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(name))
    return null;
  if (name.length < 2 || name.length > 80) return null;
  return name.replace(/\s+/g, " ");
}

function resolveDayBase(text: string, reference: Date): Date | null {
  const t = text.toLowerCase();
  const sod = startOfLocalDay(reference);

  if (/\btonight\b/.test(t) || /\btoday\b/.test(t)) return sod;
  if (/\btomorrow\b/.test(t)) return addLocalDays(sod, 1);

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  for (let i = 0; i < days.length; i++) {
    if (!new RegExp(`\\b${days[i]}\\b`, "i").test(t)) continue;
    const targetDow = i;
    const refDow = reference.getDay();
    const daysUntil = (targetDow - refDow + 7) % 7;
    return addLocalDays(sod, daysUntil);
  }

  const monthNameToIndex: Record<string, number> = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  };
  const md = t.match(
    /\b(?:on\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\.?\s+(\d{1,2})\b/i,
  );
  if (md) {
    const month = monthNameToIndex[md[1].toLowerCase()];
    const day = parseInt(md[2], 10);
    if (Number.isNaN(month) || Number.isNaN(day) || day < 1 || day > 31) return null;
    const year = reference.getFullYear();
    let candidate = new Date(year, month, day);
    candidate.setHours(0, 0, 0, 0);
    if (candidate.getTime() < sod.getTime()) {
      candidate = new Date(year + 1, month, day);
      candidate.setHours(0, 0, 0, 0);
    }
    return candidate;
  }

  return null;
}

function parseClock(text: string): { hour: number; minute: number } | null {
  const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ap = m[3].toLowerCase();
    if (h > 12 || min > 59) return null;
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return { hour: h, minute: min };
  }

  const mBare = text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (mBare) {
    let h = parseInt(mBare[1], 10);
    const ap = mBare[2].toLowerCase();
    if (h > 12) return null;
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return { hour: h, minute: 0 };
  }

  const m24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const min = parseInt(m24[2], 10);
    if (h >= 13 && h <= 23) return { hour: h, minute: min };
    if (h === 12) return { hour: 12, minute: min };
    if (h === 0) return { hour: 0, minute: min };
  }

  return null;
}

function combineDayAndTime(dayBase: Date, clock: { hour: number; minute: number }): Date {
  const d = new Date(dayBase);
  d.setHours(clock.hour, clock.minute, 0, 0);
  return d;
}

function inferService(text: string): string | null {
  for (const { re, label } of MEAL_OR_SERVICE) {
    if (re.test(text)) return label;
  }
  return null;
}

const DEFAULT_SLOT_MINUTES = 30;
const MIN_SLOT_MINUTES = 15;
const MAX_SLOT_MINUTES = 240;

function resolveSlotMinutes(slotMinutes?: number): number {
  if (!Number.isFinite(slotMinutes)) return DEFAULT_SLOT_MINUTES;
  return Math.min(MAX_SLOT_MINUTES, Math.max(MIN_SLOT_MINUTES, Math.floor(slotMinutes as number)));
}

/**
 * @param reference - Typically `new Date()` in the visitor's browser when they send the message.
 */
export function parseBookingUtterance(
  text: string,
  reference: Date,
  slotMinutes?: number,
): ParsedBookingUtterance {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      isBookingIntent: false,
      serviceDescription: null,
      partySize: null,
      customerName: null,
      startTime: null,
      endTime: null,
    };
  }

  const hasDateLikeInfo = resolveDayBase(trimmed, reference) != null;
  const hasClock = parseClock(trimmed) != null;
  const partySize = parsePartySize(trimmed);
  const isBookingIntent = BOOKING_HINT.test(trimmed) || (BOOKING_FOLLOWUP_HINT.test(trimmed) && (hasDateLikeInfo || hasClock || partySize != null));
  const customerName = parseCustomerName(trimmed);

  if (!isBookingIntent) {
    return {
      isBookingIntent: false,
      serviceDescription: inferService(trimmed),
      partySize,
      customerName,
      startTime: null,
      endTime: null,
    };
  }

  const serviceDescription = inferService(trimmed) ?? "Table reservation";

  const dayBase = resolveDayBase(trimmed, reference) ?? startOfLocalDay(reference);
  const clock = parseClock(trimmed);

  let startTime: Date | null = null;
  if (clock) {
    startTime = combineDayAndTime(dayBase, clock);
    if (startTime.getTime() < reference.getTime() - 60_000) {
      startTime = addLocalDays(startTime, 1);
    }
  } else if (/\btonight\b/i.test(trimmed) || /\bthis\s+evening\b/i.test(trimmed)) {
    startTime = combineDayAndTime(dayBase, { hour: 18, minute: 0 });
    if (startTime.getTime() < reference.getTime() - 60_000) {
      startTime = combineDayAndTime(addLocalDays(dayBase, 1), { hour: 18, minute: 0 });
    }
  }

  const endTime = startTime ? new Date(startTime.getTime() + resolveSlotMinutes(slotMinutes) * 60_000) : null;

  return {
    isBookingIntent: true,
    serviceDescription,
    partySize,
    customerName,
    startTime,
    endTime,
  };
}

/**
 * Build parser output from guided booking step answers (no NLU on a synthetic sentence).
 * Used when the visitor confirms after completing the dynamic question flow.
 */
export function parsedBookingFromGuidedAnswers(
  flow: { steps: Array<{ id: string; inputType?: string; question: string }> },
  answers: Record<string, string | number>,
  slotMinutes?: number,
): ParsedBookingUtterance {
  let partySize: number | null = null;
  let customerName: string | null = null;
  let startTime: Date | null = null;

  for (const step of flow.steps) {
    const raw = String(answers[step.id] ?? "").trim();
    if (!raw) continue;
    const id = step.id.toLowerCase();
    const q = step.question.toLowerCase();
    const inputType =
      step.inputType === "datetime" ? "datetime" : step.inputType === "text" ? "text" : "options";

    if (inputType === "datetime") {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) startTime = d;
      continue;
    }

    if (
      stepIdIndicatesPartySize(id) ||
      /\b(how many guests|party size|number of guests|guests)\b/i.test(q)
    ) {
      const n = parseInt(raw.replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 99) {
        partySize = n;
      } else {
        const p = parsePartySize(`book a table for ${raw} guests`) ?? parsePartySize(raw);
        if (p != null) partySize = p;
      }
      continue;
    }

    if (stepIdIndicatesCustomerName(id) || /\b(your name|full name)\b/i.test(q)) {
      customerName = raw.slice(0, 200);
      continue;
    }

    if (inputType === "options" && /^\d{1,2}$/.test(raw) && /\b(guest|guests|people|party|pax)\b/i.test(q)) {
      const n = parseInt(raw, 10);
      if (n >= 1 && n <= 99 && partySize == null) partySize = n;
    }
  }

  const endTime = startTime ? new Date(startTime.getTime() + resolveSlotMinutes(slotMinutes) * 60_000) : null;

  const joined = flow.steps.map((s) => String(answers[s.id] ?? "").trim()).filter(Boolean).join(" ");
  const serviceDescription = inferService(joined) ?? "Table reservation";

  return {
    isBookingIntent: true,
    serviceDescription,
    partySize,
    customerName,
    startTime,
    endTime,
  };
}

export function formatBookingSummary(p: ParsedBookingUtterance): string {
  if (!p.isBookingIntent) return "";
  const parts: string[] = [];
  if (p.serviceDescription) parts.push(p.serviceDescription);
  if (p.partySize) parts.push(`party of ${p.partySize}`);
  if (p.startTime) {
    parts.push(
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(p.startTime),
    );
  }
  return parts.join(" · ");
}

export function buildChatbotReply(parsed: ParsedBookingUtterance, saved: boolean): string {
  if (!parsed.isBookingIntent) {
    return "Thanks for your message. For bookings, share date, time, and party size.";
  }

  if (!saved && !parsedBookingHasSaveableSlot(parsed)) {
    return "Happy to help. Please add your preferred date and time so we can complete the booking.";
  }

  if (saved) {
    const summary = formatBookingSummary(parsed);
    return summary
      ? `Booked: ${summary}. We will confirm shortly.`
      : "Your booking request is saved. We will confirm shortly.";
  }

  return "Sorry, we could not save that right now. Please try again.";
}

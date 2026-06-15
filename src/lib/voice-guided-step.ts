import type { BookingFlowStep, BookingFlowOption } from "@/lib/chatbot-config";
import {
  extractEmailFromText,
  normalizeCustomerEmail,
  parseBookingUtterance,
  stepIdIndicatesPartySize,
} from "@/lib/parse-booking-utterance";

export type VoiceGuidedStepResult =
  | { ok: true; value: string | number; display: string }
  | { ok: false; message: string };

const NUMBER_WORDS: Record<string, number> = {
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

function stepLabel(step: BookingFlowStep, option: BookingFlowOption | number): string {
  if (typeof option === "number") return String(option);
  return option.label;
}

function stepValue(step: BookingFlowStep, option: BookingFlowOption | number): string | number {
  if (typeof option === "number") return option;
  return option.value;
}

function parseSpokenNumber(text: string): number | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return null;

  const wordMatch = trimmed.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/);
  if (wordMatch) return NUMBER_WORDS[wordMatch[1]] ?? null;

  const partyMatch = trimmed.match(/\b(?:party\s+of|for|table\s+for)\s+(\d{1,2})\b/i);
  if (partyMatch) {
    const n = parseInt(partyMatch[1], 10);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const digits = trimmed.match(/\b(\d{1,2})\b/);
  if (digits) {
    const n = parseInt(digits[1], 10);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatSpokenDateTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeSpokenEmail(transcript: string): string {
  return transcript
    .trim()
    .toLowerCase()
    .replace(/\s+at\s+/g, "@")
    .replace(/\s+dot\s+/g, ".")
    .replace(/\s+/g, "");
}

function parseSpokenEmail(transcript: string): string | null {
  const direct = extractEmailFromText(transcript);
  if (direct) return direct;
  const normalized = normalizeSpokenEmail(transcript);
  return extractEmailFromText(normalized) ?? normalizeCustomerEmail(normalized);
}

function matchOptionForStep(step: BookingFlowStep, transcript: string): { label: string; value: string | number } | null {
  const lower = transcript.trim().toLowerCase();
  if (!lower) return null;

  for (const opt of step.options) {
    const label = stepLabel(step, opt).toLowerCase();
    const value = String(stepValue(step, opt)).toLowerCase();
    if (lower === label || lower === value) {
      return { label: stepLabel(step, opt), value: stepValue(step, opt) };
    }
  }

  const spokenNumber = parseSpokenNumber(transcript);
  if (spokenNumber != null) {
    for (const opt of step.options) {
      const value = stepValue(step, opt);
      const label = stepLabel(step, opt);
      const numeric = typeof value === "number" ? value : parseInt(String(value).replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(numeric) && numeric === spokenNumber) {
        return { label, value };
      }
    }
  }

  for (const opt of step.options) {
    const label = stepLabel(step, opt).toLowerCase();
    if (lower.includes(label) || label.includes(lower)) {
      return { label: stepLabel(step, opt), value: stepValue(step, opt) };
    }
  }

  return null;
}

export function parseVoiceAnswerForStep(
  step: BookingFlowStep,
  transcript: string,
  reference: Date,
  slotMinutes: number,
): VoiceGuidedStepResult {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return { ok: false, message: "I didn't catch that. Tap the mic and try again." };
  }

  const inputType = step.inputType ?? "options";

  if (inputType === "email") {
    const email = parseSpokenEmail(trimmed);
    if (!email) {
      return { ok: false, message: "Say your email address, for example you at example dot com." };
    }
    return { ok: true, value: email, display: email };
  }

  if (inputType === "datetime") {
    const parsed = parseBookingUtterance(trimmed, reference, slotMinutes);
    if (parsed.startTime && !Number.isNaN(parsed.startTime.getTime())) {
      const localIso = toLocalDatetimeInputValue(parsed.startTime);
      return { ok: true, value: localIso, display: formatSpokenDateTime(parsed.startTime) };
    }
    return {
      ok: false,
      message: "Say when you'd like to come, for example tomorrow at 7 PM or Friday at noon.",
    };
  }

  if (inputType === "text") {
    if (stepIdIndicatesPartySize(step.id) || /\b(how many|guests|people|party)\b/i.test(step.question)) {
      const spokenNumber = parseSpokenNumber(trimmed);
      if (spokenNumber != null) {
        return { ok: true, value: spokenNumber, display: String(spokenNumber) };
      }
    }
    return { ok: true, value: trimmed, display: trimmed };
  }

  const matched = matchOptionForStep(step, trimmed);
  if (matched) {
    return { ok: true, value: matched.value, display: matched.label };
  }

  const optionHint = step.options.map((opt) => stepLabel(step, opt)).join(", ");
  return {
    ok: false,
    message: optionHint
      ? `Say one of these options: ${optionHint}.`
      : "I didn't match that to an option. Please try again.",
  };
}

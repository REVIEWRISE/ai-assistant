import type { BookingFlowConfig, BookingFlowStep } from "@/lib/chatbot-config";
import { buildBookingFlowQaFromAnswers, type BookingFlowQaItem } from "@/lib/booking-flow-qa";
import {
  normalizeCustomerEmail,
  stepIdIndicatesCustomerEmail,
  stepIdIndicatesCustomerName,
  stepIdIndicatesPartySize,
  stepIdIndicatesService,
} from "@/lib/parse-booking-utterance";
import { resolveVoiceBookingStartTimeIso } from "@/lib/voice-retell-datetime";

export type VoiceRetellBookingFlowAnswer = {
  step_id: string;
  answer: string;
};

export type VoiceRetellBookingInput = {
  customer_name: string;
  customer_email?: string;
  service_description: string;
  party_size: number;
  start_time_iso: string;
  notes?: string;
  booking_flow_answers?: VoiceRetellBookingFlowAnswer[];
};

export function formatBookingFlowStepsForVoicePrompt(flow: BookingFlowConfig): string[] {
  if (!flow.steps.length) return [];

  const lines = [
    "Follow this organization's booking flow in order. Ask every question aloud and wait for an answer before continuing.",
    "Do not call book_appointment until all required steps below are collected.",
  ];

  flow.steps.slice(0, 12).forEach((step, index) => {
    lines.push(describeVoiceBookingFlowStep(step, index + 1));
  });

  lines.push(
    "When you call book_appointment, include booking_flow_answers: an array of { step_id, answer } with every answer you collected.",
    "Also include customer_name, customer_email, service_description, party_size, and start_time_iso when available.",
  );

  return lines;
}

function describeVoiceBookingFlowStep(step: BookingFlowStep, index: number): string {
  const inputType = step.inputType ?? (step.options.length ? "options" : "text");
  let line = `Step ${index} (step_id: ${step.id}): ${step.question}`;
  if (step.helperText) line += ` — ${step.helperText}`;

  if (inputType === "options" && step.options.length) {
    line += `. Offer: ${step.options.map((o) => o.label).join(", ")}.`;
  } else if (inputType === "datetime") {
    line += `. Accept natural answers like "tomorrow at 7pm" or "January 22 at noon"; convert using today's reference year before booking.`;
  } else if (inputType === "email") {
    line += `. Collect a valid email address.`;
  } else if (inputType === "text") {
    line += `. Collect free-text answer.`;
  }

  return `- ${line}`;
}

export function parseVoiceRetellBookingFlowAnswers(raw: unknown): VoiceRetellBookingFlowAnswer[] {
  let items: unknown = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      items = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(items)) return [];

  const out: VoiceRetellBookingFlowAnswer[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const stepId = typeof rec.step_id === "string" ? rec.step_id.trim() : readAltStepId(rec);
    const answer = typeof rec.answer === "string" ? rec.answer.trim() : String(rec.answer ?? "").trim();
    if (!stepId || !answer) continue;
    out.push({ step_id: stepId.slice(0, 120), answer: answer.slice(0, 2000) });
    if (out.length >= 24) break;
  }
  return out;
}

function readAltStepId(rec: Record<string, unknown>): string {
  for (const key of ["stepId", "id", "step"] as const) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export function parseFlexiblePartySize(value: unknown): number | null {
  if (typeof value === "number" && value >= 1 && value <= 99) return Math.floor(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return Math.min(99, Math.max(1, parseInt(trimmed, 10)));
    const match = trimmed.match(/(\d+)/);
    if (match) return Math.min(99, Math.max(1, parseInt(match[1], 10)));
  }
  return null;
}

export function enrichVoiceRetellBookingArgs(
  flow: BookingFlowConfig,
  args: VoiceRetellBookingInput,
  options?: { reference?: Date; slotDurationMinutes?: number },
): {
  args: VoiceRetellBookingInput;
  bookingFlowQa: BookingFlowQaItem[];
  answersRecord: Record<string, string | number>;
  missingRequired: string[];
} {
  const answersRecord: Record<string, string | number> = {};
  for (const item of args.booking_flow_answers ?? []) {
    const stepId = item.step_id.trim();
    const answer = item.answer.trim();
    if (!stepId || !answer) continue;
    answersRecord[stepId] = answer;
  }

  const bookingFlowQa = buildBookingFlowQaFromAnswers(flow, answersRecord);

  const reference = options?.reference ?? new Date();
  const slotDurationMinutes = options?.slotDurationMinutes ?? flow.slotDurationMinutes;

  let customer_name = args.customer_name.trim();
  let customer_email = args.customer_email;
  let party_size = args.party_size;
  let service_description = args.service_description.trim();
  let start_time_iso = args.start_time_iso.trim();

  for (const step of flow.steps) {
    const raw = answersRecord[step.id];
    if (raw === undefined) continue;
    const text = String(raw).trim();
    if (!text) continue;

    if (stepIdIndicatesCustomerName(step.id) && !customer_name) {
      customer_name = text.slice(0, 200);
    }
    if (stepIdIndicatesCustomerEmail(step.id) && !customer_email) {
      customer_email = normalizeCustomerEmail(text) ?? undefined;
    }
    if (stepIdIndicatesPartySize(step.id) && !party_size) {
      const n = parseFlexiblePartySize(raw);
      if (n) party_size = n;
    }
    if (stepIdIndicatesService(step.id) && !service_description) {
      service_description = text.slice(0, 500);
    }
    if (step.inputType === "datetime") {
      const resolved =
        resolveVoiceBookingStartTimeIso({
          raw: text,
          reference,
          slotDurationMinutes,
        }) ?? (start_time_iso ? resolveVoiceBookingStartTimeIso({ raw: start_time_iso, reference, slotDurationMinutes }) : null);
      if (resolved) start_time_iso = resolved;
    }
  }

  if (start_time_iso) {
    const normalized = resolveVoiceBookingStartTimeIso({
      raw: start_time_iso,
      reference,
      slotDurationMinutes,
    });
    if (normalized) start_time_iso = normalized;
  }

  const enriched: VoiceRetellBookingInput = {
    ...args,
    customer_name,
    customer_email,
    party_size,
    service_description,
    start_time_iso,
  };

  const missingRequired: string[] = [];
  if (!enriched.customer_name) missingRequired.push("customer name");
  if (!enriched.service_description) missingRequired.push("service or visit type");
  if (!enriched.party_size) missingRequired.push("party size");
  if (!enriched.start_time_iso) missingRequired.push("date and time");

  for (const step of flow.steps) {
    if (answersRecord[step.id] !== undefined) continue;
    if (stepIdIndicatesCustomerName(step.id) && enriched.customer_name) continue;
    if (stepIdIndicatesCustomerEmail(step.id) && enriched.customer_email) continue;
    if (stepIdIndicatesPartySize(step.id) && enriched.party_size) continue;
    if (stepIdIndicatesService(step.id) && enriched.service_description) continue;
    if (step.inputType === "datetime" && enriched.start_time_iso) continue;
    missingRequired.push(step.question || step.id);
  }

  return {
    args: enriched,
    bookingFlowQa,
    answersRecord,
    missingRequired: [...new Set(missingRequired)],
  };
}

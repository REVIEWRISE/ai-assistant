import type { BookingFlowConfig, BookingFlowStep } from "@/lib/chatbot-config";

export type BookingFlowQaItem = {
  question: string;
  answer: string;
};

const MAX_ITEMS = 24;
const MAX_Q = 500;
const MAX_A = 2000;

function formatStepAnswerDisplay(step: BookingFlowStep, raw: string | number): string {
  const s = String(raw).trim();
  if (!s) return "";

  if (step.inputType === "datetime") {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(d);
    }
    return s;
  }

  if (step.inputType === "text") {
    return s;
  }

  const opt = step.options.find((o) => String(o.value) === s || o.label === s);
  return opt ? opt.label : s;
}

/**
 * Snapshot of guided booking steps for persistence (question + human-readable answer).
 */
export function buildBookingFlowQaFromAnswers(
  flow: BookingFlowConfig,
  answers: Record<string, string | number>,
): BookingFlowQaItem[] {
  const out: BookingFlowQaItem[] = [];
  for (const step of flow.steps) {
    const raw = answers[step.id];
    if (raw === undefined || raw === null) continue;
    const answer = formatStepAnswerDisplay(step, raw);
    if (!answer) continue;
    const question = (step.question || step.id).trim().slice(0, MAX_Q);
    out.push({
      question: question || step.id,
      answer: answer.slice(0, MAX_A),
    });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function parseBookingFlowQaPayload(raw: unknown): BookingFlowQaItem[] | null {
  if (!Array.isArray(raw)) return null;
  const out: BookingFlowQaItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const q = typeof rec.question === "string" ? rec.question.trim() : "";
    const a = typeof rec.answer === "string" ? rec.answer.trim() : "";
    if (!q || !a) continue;
    out.push({ question: q.slice(0, MAX_Q), answer: a.slice(0, MAX_A) });
    if (out.length >= MAX_ITEMS) break;
  }
  return out.length ? out : null;
}

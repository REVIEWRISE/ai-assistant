import { describeBookingGaps, type ParsedBookingUtterance } from "@/lib/parse-booking-utterance";

/** Server-side only. Set in `.env.local` (not `NEXT_PUBLIC_*`). */
export function getOpenAiApiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

const DEFAULT_MODEL = "gpt-4o-mini";

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
  error?: { message?: string; type?: string; code?: string };
};

export type OpenAiPrimaryResult = {
  text: string | null;
  /** Set when text is null — useful for dev / Network tab via API. */
  errorHint?: string;
};

export type CalendarOutcomeForLlm = "not_applicable" | "no_calendar_connected" | "synced" | "sync_failed";

export type PrimaryOpenAiArgs = {
  organizationName: string;
  knowledgeCorpus: string;
  knowledgeStatus: string;
  userMessage: string;
  parsed: ParsedBookingUtterance;
  saved: boolean;
  gateCode: string | null;
  calendarOutcome: CalendarOutcomeForLlm;
};

function formatParsedForPrompt(p: ParsedBookingUtterance): string {
  const lines = [
    `booking_intent: ${p.isBookingIntent}`,
    `service_label: ${p.serviceDescription ?? "—"}`,
    `party_size: ${p.partySize ?? "—"}`,
    `start (if parsed): ${p.startTime?.toISOString() ?? "—"}`,
    `end (if parsed): ${p.endTime?.toISOString() ?? "—"}`,
    `still_missing_for_complete_booking: ${describeBookingGaps(p)}`,
  ];
  return lines.join("\n");
}

/**
 * Generates the full visitor-facing message for the user turn. Uses the org knowledge base
 * for factual answers and booking state for appointments/reservations.
 * Deterministic rules already ran on the server; do not contradict saved / gate / calendar facts.
 */
export async function generatePrimaryChatbotReply(args: PrimaryOpenAiArgs): Promise<OpenAiPrimaryResult> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return { text: null, errorHint: "OPENAI_API_KEY not set on server" };
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const knowledgeSlice = args.knowledgeCorpus.slice(0, 12_000);

  const gateExplain =
    args.gateCode === "kb_not_approved"
      ? "Online booking is not enabled (knowledge base not approved)."
      : args.gateCode === "kb_empty"
        ? "Not enough business info on file to take bookings."
        : args.gateCode === "kb_no_booking_context"
          ? "Knowledge base does not describe bookings or offerings clearly enough for this request."
          : args.gateCode === "service_not_offered"
            ? "Requested service does not match what is described for this organization."
            : args.gateCode
              ? String(args.gateCode)
              : "none";

  const calendarExplain =
    args.calendarOutcome === "not_applicable"
      ? "N/A (no reservation was saved this turn)."
      : args.calendarOutcome === "no_calendar_connected"
        ? "Reservation was saved; no staff calendar is connected — team will follow up manually."
        : args.calendarOutcome === "synced"
          ? "Reservation was saved and a calendar event was created on the connected account."
          : "Reservation was saved but automatic calendar creation failed — staff still have the request.";

  const userPrompt = `You are chatting with a visitor on behalf of "${args.organizationName}".

=== ORGANIZATION KNOWLEDGE (ground truth from their business profile; may be incomplete) ===
Status: ${args.knowledgeStatus}
---
${knowledgeSlice || "(No knowledge text available.)"}
===

=== BOOKING STATE (from the app — you MUST follow this; never contradict it) ===
${formatParsedForPrompt(args.parsed)}

- reservation_saved_this_turn: ${args.saved}
- if not saved and the visitor wanted to book: policy_block_reason (if any): ${args.gateCode ?? "none"} — ${gateExplain}
- calendar_automation: ${args.calendarOutcome} — ${calendarExplain}

=== VISITOR JUST SAID ===
${args.userMessage}

=== YOUR JOB ===
Write ONE reply as this organization's assistant (friendly, natural, second person "we"). Keep it concise and warm.

1) If they asked a question (services, products, hours, policies, pricing if listed, what you offer, etc.), answer from KNOWLEDGE only. If the answer is missing, say so briefly and suggest contacting the business.

2) If they are trying to book and something is still missing (see still_missing), ask only for what's missing in one short sentence.

3) If reservation_saved_this_turn is true, confirm warmly and briefly mention next steps consistent with calendar_automation.

4) If policy_block_reason is set (and not "none"), politely say online booking is unavailable and suggest calling or messaging the business.

5) Do not invent facts: prices, inventory, hours, services, or anything not clearly supported by KNOWLEDGE.

Hard limits:
- 1-2 short sentences
- max 45 words
- no bullet points
- plain text only`;

  const systemInstruction =
    "You are a helpful booking assistant. Be friendly, brief, and clear. Prefer short wording. Never contradict BOOKING STATE facts.";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 120,
      }),
    });

    const raw = (await res.json()) as OpenAiChatResponse;

    if (!res.ok) {
      const msg = raw.error?.message ?? `HTTP ${res.status}`;
      console.warn("[openai] chat/completions failed:", res.status, msg);
      return {
        text: null,
        errorHint: `${res.status}: ${msg}`.slice(0, 500),
      };
    }

    const content = raw.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.warn("[openai] no content in choices", JSON.stringify(raw).slice(0, 400));
      return { text: null, errorHint: "empty_choices" };
    }
    const trimmed = content.trim();
    if (!trimmed) return { text: null, errorHint: "empty_text" };
    return { text: trimmed.slice(0, 4500) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[openai] fetch error:", msg);
    return { text: null, errorHint: msg.slice(0, 200) };
  }
}

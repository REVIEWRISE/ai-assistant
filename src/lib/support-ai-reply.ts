import { getOpenAiApiKey } from "@/lib/openai-chat-reply";
import { BRAND_NAME, PRODUCT_NAME } from "@/lib/brand";
import { loadSupportAiKnowledge } from "@/lib/support-ai-knowledge";

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_REPLY_CHARS = 2500;

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

export type SupportAiThreadMessage = {
  authorRole: string;
  body: string;
};

export type SupportAiReplyResult = {
  text: string | null;
  errorHint?: string;
};

function formatThread(messages: SupportAiThreadMessage[]): string {
  return messages
    .map((message) => {
      const role =
        message.authorRole === "admin"
          ? "human_support"
          : message.authorRole === "ai"
            ? "ai_assistant"
            : "user";
      return `${role}: ${message.body.trim()}`;
    })
    .join("\n\n");
}

/**
 * Generates a platform support reply grounded in docs/support markdown.
 */
export async function generateSupportAiReplyText(args: {
  subject: string;
  messages: SupportAiThreadMessage[];
}): Promise<SupportAiReplyResult> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return { text: null, errorHint: "OPENAI_API_KEY not set on server" };
  }

  const knowledge = await loadSupportAiKnowledge();
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const thread = formatThread(args.messages.slice(-20));

  const systemInstruction = `You are the first-line support assistant for ${PRODUCT_NAME} (${BRAND_NAME}).
Answer workspace users about how the platform works.
Use only the PLATFORM HELP documents provided.
If the answer is missing or unclear, say you do not have that detail and that the platform team can follow up.
Never invent pricing, features, SLAs, or policies.
Be concise, friendly, and practical. Prefer short paragraphs. Plain text only (no markdown headings).`;

  const userPrompt = `=== PLATFORM HELP (editable markdown corpus; ground truth) ===
${knowledge || "(No help documents are available.)"}
===

=== SUPPORT TICKET ===
Subject: ${args.subject}

=== CONVERSATION (oldest → newest) ===
${thread || "(empty)"}

=== YOUR JOB ===
Reply to the user's latest message as the ${BRAND_NAME} support AI.
Stay within PLATFORM HELP. If you cannot answer from it, say so briefly and note that a human teammate can help next.`;

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
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    const raw = (await res.json()) as OpenAiChatResponse;
    if (!res.ok) {
      const msg = raw.error?.message ?? `HTTP ${res.status}`;
      console.warn("[support-ai] OpenAI failed:", res.status, msg);
      return { text: null, errorHint: `${res.status}: ${msg}`.slice(0, 500) };
    }

    const content = raw.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return { text: null, errorHint: "empty_choices" };
    }
    const trimmed = content.trim();
    if (!trimmed) return { text: null, errorHint: "empty_text" };
    return { text: trimmed.slice(0, MAX_REPLY_CHARS) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[support-ai] fetch error:", msg);
    return { text: null, errorHint: msg.slice(0, 200) };
  }
}

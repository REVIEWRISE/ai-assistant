import { loadOrgBookingContext } from "@/lib/booking-org-gate";
import { getOpenAiApiKey } from "@/lib/openai-chat-reply";

const DEFAULT_MODEL = "gpt-4o-mini";
const MIN_KB_CHARS = 200;

export type VoiceAgentAiError = "no_api_key" | "no_kb" | "failed";

export type VoiceAgentAiResult =
  | { ok: true; text: string }
  | { ok: false; error: VoiceAgentAiError };

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

async function callOpenAi(system: string, user: string, maxTokens: number): Promise<string | null> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as OpenAiChatResponse;
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    return text || null;
  } catch {
    return null;
  }
}

export async function generateVoiceAgentOpeningMessage(args: {
  organizationId: string;
  organizationName: string;
  agentName: string;
}): Promise<VoiceAgentAiResult> {
  if (!getOpenAiApiKey()) {
    return { ok: false, error: "no_api_key" };
  }

  const kb = await loadOrgBookingContext(args.organizationId);
  const knowledgeSlice = kb.knowledgeCorpus.trim();
  if (knowledgeSlice.length < MIN_KB_CHARS) {
    return { ok: false, error: "no_kb" };
  }

  const orgName = args.organizationName.trim() || "the business";
  const agentName = args.agentName.trim() || "Support Agent";

  const system = `You write the opening spoken greeting for a phone support voice agent.
Output plain text only — no quotes, markdown, JSON, emojis, or stage directions.
One or two short sentences that sound natural when spoken on a phone call (max 280 characters).
Introduce the business by name and invite the caller to say how you can help.
Use only facts supported by the business knowledge provided.`;

  const user = `Organization: ${orgName}
Agent display name: ${agentName}
Knowledge base status: ${kb.knowledgeStatus}

BUSINESS KNOWLEDGE:
---
${knowledgeSlice.slice(0, 10_000)}
---`;

  const text = await callOpenAi(system, user, 180);
  if (!text) return { ok: false, error: "failed" };

  return { ok: true, text: text.slice(0, 500) };
}

export async function generateVoiceAgentSystemPrompt(args: {
  organizationId: string;
  organizationName: string;
  agentName: string;
}): Promise<VoiceAgentAiResult> {
  if (!getOpenAiApiKey()) {
    return { ok: false, error: "no_api_key" };
  }

  const kb = await loadOrgBookingContext(args.organizationId);
  const knowledgeSlice = kb.knowledgeCorpus.trim();
  if (knowledgeSlice.length < MIN_KB_CHARS) {
    return { ok: false, error: "no_kb" };
  }

  const orgName = args.organizationName.trim() || "the business";
  const agentName = args.agentName.trim() || "Support Agent";

  const system = `You write system instructions for a Retell AI phone support agent.
Output plain text only — no markdown fences, JSON, or bullet characters like "•".
Use short labeled sections in prose paragraphs (Role, Tone, How to answer, Escalation).
The agent will also receive a separate appended knowledge block on each sync — write instructions for HOW to use that knowledge, not a full copy of every fact.
Do not invent prices, hours, policies, or services not clearly supported by the knowledge.
Keep under 1200 words.`;

  const user = `Organization: ${orgName}
Agent display name: ${agentName}
Knowledge base status: ${kb.knowledgeStatus}

BUSINESS KNOWLEDGE (ground truth for what the agent may discuss):
---
${knowledgeSlice.slice(0, 12_000)}
---

Write system instructions for inbound phone support. Cover:
- Who the agent represents and their role on calls
- Warm, concise phone tone
- Answer from the business knowledge; say when information is missing
- When to offer a callback or human handoff
- Never make up business facts`;

  const text = await callOpenAi(system, user, 900);
  if (!text) return { ok: false, error: "failed" };

  return { ok: true, text: text.slice(0, 4000) };
}

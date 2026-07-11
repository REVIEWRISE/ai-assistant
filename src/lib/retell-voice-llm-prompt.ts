import { loadOrgBookingContext } from "@/lib/booking-org-gate";
import {
  appendVoiceRetellBookingPrompt,
  buildVoiceRetellBookingPromptSection,
} from "@/lib/voice-retell-booking";
import { buildRetellGeneralPromptWithKnowledge } from "@/lib/retell-voice-prompt";
import type { VoiceAgentKnowledgeConfig } from "@/lib/retell-voice-agent";

export type VoiceAgentPromptPayload = {
  generalPrompt: string;
  generalTools?: Array<Record<string, unknown>>;
};

export type VoiceAgentPromptResult =
  | ({ ok: true } & VoiceAgentPromptPayload)
  | { ok: false; error: string };

/** Builds the full system prompt (and optional Retell HTTP tools) for a voice agent. */
export async function buildVoiceAgentPromptPayload(args: {
  basePrompt: string;
  knowledge: VoiceAgentKnowledgeConfig;
  organizationId: string;
  /** When false, booking tools are omitted (used by custom LLM — tools run in-process). */
  includeRetellHttpTools?: boolean;
}): Promise<VoiceAgentPromptResult> {
  let generalPrompt = args.basePrompt.trim();

  if (args.knowledge.useOrganizationKnowledgeBase || args.knowledge.enablePhoneBooking) {
    const kb = await loadOrgBookingContext(args.organizationId);
    if (args.knowledge.requireApprovedKnowledgeBase && kb.knowledgeStatus !== "approved") {
      return {
        ok: false,
        error: "Approve your organization knowledge base before syncing to Retell.",
      };
    }

    if (args.knowledge.useOrganizationKnowledgeBase) {
      generalPrompt = buildRetellGeneralPromptWithKnowledge(generalPrompt, kb.knowledgeCorpus);
    }
  }

  let generalTools: Array<Record<string, unknown>> | undefined;
  if (args.knowledge.enablePhoneBooking) {
    const bookingSection = await buildVoiceRetellBookingPromptSection(args.organizationId);
    generalPrompt = appendVoiceRetellBookingPrompt(generalPrompt, bookingSection);

    if (args.includeRetellHttpTools !== false) {
      const { buildRetellBookingTools } = await import("@/lib/voice-retell-booking");
      generalTools = await buildRetellBookingTools();
      if (!generalTools.length) {
        return {
          ok: false,
          error: "Set NEXT_PUBLIC_APP_URL to your public app URL before enabling phone booking.",
        };
      }
    }
  }

  return { ok: true, generalPrompt, generalTools };
}

export const VOICE_LLM_STYLE_GUARDRAILS = `
## Voice conversation style
- Be concise and conversational — short spoken sentences, ideally under 20 words per utterance.
- Address one question or action at a time.
- Do not repeat what was already said in the transcript; rephrase if needed.
- Speak naturally, like a friendly receptionist on a phone call.
- Expect speech-to-text errors; guess intent when possible. If you must clarify, say it colloquially ("didn't catch that", "some static").
- Never mention transcription errors or that you are an AI unless asked.
- Overcome ASR errors without breaking flow.
`.trim();

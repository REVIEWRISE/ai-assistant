"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import {
  buildDefaultBookingFlow,
  emptyBookingFlow,
  mergeBookingFlowIdleText,
  mergeBookingFlowQuickActionsOnly,
  mergeBookingFlowSteps,
  normalizeBookingFlowStepsArray,
  parseServicesList,
  resolveBookingFlowConfig,
  type BookingFlowConfig,
} from "@/lib/chatbot-config";
import { getOpenAiApiKey } from "@/lib/openai-chat-reply";
import { truncateKnowledgeRawTextForPrompt } from "@/lib/knowledge-base-raw-truncate";

const CHATBOT_ROUTE = "/appointments/chatbot";

const emptyServicesJson = [] as unknown as Prisma.InputJsonValue;

type GenerateScope = "full" | "intro" | "opening" | "steps";

function parseGenerateScope(raw: string): GenerateScope {
  if (raw === "intro" || raw === "opening" || raw === "steps") return raw;
  return "full";
}

function parseIdleHelperTextFromModel(parsed: Record<string, unknown>): string | null {
  const bf =
    parsed.bookingFlow && typeof parsed.bookingFlow === "object" && !Array.isArray(parsed.bookingFlow)
      ? (parsed.bookingFlow as Record<string, unknown>)
      : null;
  const idleRaw = bf?.idleHelperText ?? parsed.idleHelperText;
  const idle = typeof idleRaw === "string" ? idleRaw.trim() : "";
  return idle.length > 0 ? idle : null;
}

function parseQuickActionsFromModel(parsed: Record<string, unknown>): string[] | null {
  const bf =
    parsed.bookingFlow && typeof parsed.bookingFlow === "object" && !Array.isArray(parsed.bookingFlow)
      ? (parsed.bookingFlow as Record<string, unknown>)
      : null;
  const qaRaw = bf?.quickActions ?? parsed.quickActions;
  const quickActions = Array.isArray(qaRaw)
    ? qaRaw.map((x) => String(x).trim()).filter(Boolean).slice(0, 8)
    : [];
  return quickActions.length >= 2 ? quickActions : null;
}

function parseStepsRawFromModel(parsed: Record<string, unknown>): unknown {
  const bf =
    parsed.bookingFlow && typeof parsed.bookingFlow === "object" && !Array.isArray(parsed.bookingFlow)
      ? (parsed.bookingFlow as Record<string, unknown>)
      : null;
  if (bf && Array.isArray(bf.steps)) return bf.steps;
  if (Array.isArray(parsed.steps)) return parsed.steps;
  return null;
}

type ChatbotConfig = {
  welcomeMessage: string;
  themeColor: string;
  iconColor: string;
};

async function requireSessionForChatbot() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { id: true, userId: true },
  });

  if (!session) redirect("/login");
  return session;
}

export async function saveChatbotConfig(formData: FormData) {
  const session = await requireSessionForChatbot();
  const organizationId = String(formData.get("organization_id") || "").trim();
  if (!organizationId) {
    redirect(`${CHATBOT_ROUTE}?error=chatbot_org_missing`);
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.userId,
      organizationId,
    },
    select: { id: true },
  });

  if (!membership) {
    redirect(`${CHATBOT_ROUTE}?error=chatbot_org_denied`);
  }

  const welcomeMessage = String(formData.get("welcome_message") || "").trim();
  const themeColor = String(formData.get("theme_color") || "").trim();
  const iconColor = String(formData.get("icon_color") || "").trim();
  const bookingFlowRaw = String(formData.get("booking_flow") || "").trim();

  const config: ChatbotConfig = {
    welcomeMessage:
      welcomeMessage ||
      "Hi there, I can help you with bookings and answer questions from our knowledge base.",
    themeColor: /^#[0-9a-fA-F]{6}$/.test(themeColor) ? themeColor : "#22c55e",
    iconColor: /^#[0-9a-fA-F]{6}$/.test(iconColor) ? iconColor : "#0f172a",
  };

  const existing = await prisma.organizationChatbotSettings.findUnique({
    where: { organizationId },
    select: { services: true, bookingFlow: true },
  });

  let bookingFlowInput: unknown = existing?.bookingFlow ?? null;
  if (bookingFlowRaw) {
    try {
      bookingFlowInput = JSON.parse(bookingFlowRaw);
    } catch {
      bookingFlowInput = existing?.bookingFlow ?? null;
    }
  }
  const bookingFlow = resolveBookingFlowConfig(
    bookingFlowInput,
    parseServicesList(existing?.services),
  ) as unknown as Prisma.InputJsonValue;

  await prisma.organizationChatbotSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      welcomeMessage: config.welcomeMessage,
      themeColor: config.themeColor,
      iconColor: config.iconColor,
      services: emptyServicesJson,
      bookingFlow,
    },
    update: {
      welcomeMessage: config.welcomeMessage,
      themeColor: config.themeColor,
      iconColor: config.iconColor,
      services: existing?.services ?? emptyServicesJson,
      bookingFlow,
      updatedAt: new Date(),
    },
  });

  redirect(`${CHATBOT_ROUTE}?success=saved`);
}

export type GenerateBookingFlowResult =
  | { ok: true; bookingFlow: BookingFlowConfig }
  | {
      ok: false;
      error: "org_missing" | "denied" | "no_api_key" | "no_kb" | "failed";
    };

export async function generateChatbotFromKnowledge(
  formData: FormData,
): Promise<GenerateBookingFlowResult> {
  const session = await requireSessionForChatbot();
  const organizationId = String(formData.get("organization_id") || "").trim();
  if (!organizationId) {
    return { ok: false, error: "org_missing" };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.userId,
      organizationId,
    },
    select: { id: true },
  });

  if (!membership) {
    return { ok: false, error: "denied" };
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return { ok: false, error: "no_api_key" };
  }

  const org = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: {
      name: true,
      knowledgeBase: { select: { rawText: true, parsedData: true } },
      chatbotSettings: {
        select: { services: true, bookingFlow: true },
      },
    },
  });

  const raw = String(org?.knowledgeBase?.rawText ?? "").trim();
  if (raw.length < 200) {
    return { ok: false, error: "no_kb" };
  }

  const servicesList = parseServicesList(org?.chatbotSettings?.services);
  const scope = parseGenerateScope(String(formData.get("generate_scope") || "").trim());

  const bookingFlowDraftRaw = String(formData.get("booking_flow") || "").trim();
  let existingFlow = emptyBookingFlow();
  if (bookingFlowDraftRaw) {
    try {
      existingFlow = resolveBookingFlowConfig(JSON.parse(bookingFlowDraftRaw), servicesList);
    } catch {
      existingFlow = resolveBookingFlowConfig(org?.chatbotSettings?.bookingFlow, servicesList);
    }
  } else {
    existingFlow = resolveBookingFlowConfig(org?.chatbotSettings?.bookingFlow, servicesList);
  }

  let digest = "";
  const pd = org?.knowledgeBase?.parsedData;
  if (pd && typeof pd === "object" && !Array.isArray(pd)) {
    const rec = pd as Record<string, unknown>;
    if (typeof rec.formattedPreview === "string") {
      digest = `\n\nFormatted digest (may be shorter than full import):\n${rec.formattedPreview.trim().slice(0, 6000)}`;
    }
  }

  const kbExcerpt = `${truncateKnowledgeRawTextForPrompt(raw, 28_000)}${digest}`;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const systemFull = `You design the guided booking questionnaire for a small embedded widget. Output a single JSON object only (no markdown fences) with one key: bookingFlow.

bookingFlow must match:
{
  "version": 1,
  "idleHelperText": string,
  "quickActions": string[],
  "steps": Array<{
    "id": string,
    "question": string,
    "helperText": string,
    "inputType": "options" | "datetime" | "text" | "email",
    "options": Array<{ "label": string, "value": string }>
  }>
}

Hard rules:
- idleHelperText: one short line shown above quick action chips.
- quickActions: 4–6 distinct short strings (mix booking intents and common questions). Under 60 chars each.
- steps: between 2 and 7 steps, in a sensible order.
- Include exactly ONE step with inputType "datetime" for preferred date/time (options must be []).
- Include exactly ONE step with inputType "email" for the guest email (options must be []).
- For inputType "options", options must be a non-empty array (max 12). label and value non-empty; value may match label.
- For inputType "text" or "email", options must be [].
- Use snake_case ids (e.g. visit_type, preferred_time, party_size).
- Base offerings and wording on the knowledge source; do not invent services or policies that are clearly absent.`;

  const systemIntro = `You write ONLY the intro line for a small booking widget (shown above quick action chips). Output a single JSON object only (no markdown fences).

CRITICAL: Include exactly one string field — idleHelperText. No other keys. No bookingFlow wrapper unless it contains only idleHelperText.

Example:
{ "idleHelperText": "Welcome! Tell us what you need and we will help you book or answer questions." }

Rules:
- idleHelperText: one or two short sentences, friendly and specific to the business when the source allows.
- Do NOT output quickActions, steps, version, or any other fields.
- Base wording on the knowledge source; do not invent policies absent from the source.`;

  const systemOpening = `You write ONLY quick-start action chips for a small booking widget (tappable shortcuts under the intro line). Output a single JSON object only (no markdown fences).

CRITICAL: Include exactly one field — quickActions (string array). No other keys.

Example:
{ "quickActions": ["Book a table", "Opening hours", "Menu options", "Contact us"] }

Rules:
- quickActions: 4–6 distinct short strings (mix booking intents and common questions). Under 60 chars each.
- Do NOT output idleHelperText, steps, version, or any other fields.
- Base wording on the knowledge source; do not invent policies absent from the source.`;

  const systemSteps = `You design ONLY the guided booking question steps. Output a single JSON object only (no markdown fences).

CRITICAL: Include exactly one field — steps (array). No other keys.

Shape:
{
  "steps": Array<{
    "id": string,
    "question": string,
    "helperText": string,
    "inputType": "options" | "datetime" | "text" | "email",
    "options": Array<{ "label": string, "value": string }>
  }>
}

Hard rules:
- steps: between 2 and 7 steps, sensible order.
- Include exactly ONE step with inputType "datetime" for preferred date/time (options must be []).
- Include exactly ONE step with inputType "email" for the guest email (options must be []).
- For inputType "options", options must be a non-empty array (max 12). label and value non-empty; value may match label.
- For inputType "text" or "email", options must be [].
- Use snake_case ids.
- Do NOT output idleHelperText, quickActions, version, or any other fields.
- Base offerings on the knowledge source; do not invent services or policies clearly absent.`;

  const user = `Organization name: ${org?.name ?? "Business"}

Knowledge source (may contain "[… omitted portion of source …]" markers; treat as one corpus):
${kbExcerpt}`;

  const system =
    scope === "intro"
      ? systemIntro
      : scope === "opening"
        ? systemOpening
        : scope === "steps"
          ? systemSteps
          : systemFull;
  const maxTokens = scope === "intro" ? 500 : scope === "opening" ? 800 : 4096;

  let content = "";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: false, error: "failed" };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    content = data.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return { ok: false, error: "failed" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, error: "failed" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "failed" };
  }

  const rec = parsed as Record<string, unknown>;

  let finalFlow: BookingFlowConfig;
  if (scope === "intro") {
    const idle = parseIdleHelperTextFromModel(rec);
    if (!idle) {
      return { ok: false, error: "failed" };
    }
    finalFlow = mergeBookingFlowIdleText(existingFlow, idle);
  } else if (scope === "opening") {
    const quickActions = parseQuickActionsFromModel(rec);
    if (!quickActions) {
      return { ok: false, error: "failed" };
    }
    finalFlow = mergeBookingFlowQuickActionsOnly(existingFlow, quickActions);
  } else if (scope === "steps") {
    const stepsRaw = parseStepsRawFromModel(rec);
    const normalizedSteps = normalizeBookingFlowStepsArray(stepsRaw);
    if (normalizedSteps.length < 2) {
      return { ok: false, error: "failed" };
    }
    finalFlow = mergeBookingFlowSteps(existingFlow, normalizedSteps);
  } else {
    const resolvedFlow = resolveBookingFlowConfig(rec.bookingFlow, servicesList);
    finalFlow =
      resolvedFlow.steps.length >= 2 ? resolvedFlow : buildDefaultBookingFlow(servicesList);
  }

  return { ok: true, bookingFlow: finalFlow };
}

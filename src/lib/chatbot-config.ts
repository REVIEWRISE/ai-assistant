import { resolveCrmIntegrationConfig, type CrmIntegrationConfig } from "@/lib/crm-integration";

export type ChatbotConfigData = {
  welcomeMessage: string;
  themeColor: string;
  iconColor: string;
  bookingFlow: BookingFlowConfig;
  crmIntegration: CrmIntegrationConfig;
};

export type BookingFlowOption = {
  label: string;
  value: string;
};

export type BookingFlowStep = {
  id: string;
  question: string;
  helperText: string;
  inputType?: "options" | "datetime" | "text" | "email";
  options: BookingFlowOption[];
};

/** Quick-start chip: label shown in the widget; optionally starts the guided booking steps. */
export type BookingFlowQuickAction = {
  label: string;
  startsBookingFlow: boolean;
};

export type BookingFlowConfig = {
  version: 1;
  idleHelperText: string;
  quickActions: BookingFlowQuickAction[];
  slotDurationMinutes: number;
  minGapMinutes: number;
  steps: BookingFlowStep[];
};

const defaultWelcome =
  "Hi there, I can help you with bookings and answer questions from our knowledge base.";

function normalizeText(value: unknown, fallback: string): string {
  const v = String(value ?? "").trim();
  return v || fallback;
}

function normalizeIntInRange(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function normalizeOption(raw: unknown): BookingFlowOption | null {
  if (typeof raw === "number") {
    const v = String(Math.floor(raw));
    return { label: v, value: v };
  }
  if (typeof raw === "string") {
    const v = raw.trim();
    return v ? { label: v, value: v } : null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const label = String(rec.label ?? "").trim();
  const value = String(rec.value ?? "").trim() || label;
  if (!label || !value) return null;
  return { label, value };
}

/** Empty flow for new orgs or before the user configures / generates anything. */
export function emptyBookingFlow(): BookingFlowConfig {
  return {
    version: 1,
    idleHelperText: "",
    quickActions: [],
    slotDurationMinutes: 30,
    minGapMinutes: 0,
    steps: [],
  };
}

export function buildDefaultBookingFlow(services?: string[]): BookingFlowConfig {
  const serviceOptions = (services ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((s) => ({ label: s, value: s }));
  const steps: BookingFlowStep[] = [];
  if (serviceOptions.length > 0) {
    steps.push({
      id: "service",
      question: "What would you like to book?",
      helperText: "Pick a service.",
      options: serviceOptions,
    });
  }
  steps.push({
    id: "when",
    question: "When would you like to come?",
    helperText: "Choose a date and time.",
    inputType: "datetime",
    options: [],
  });
  steps.push({
    id: "party_size",
    question: "How many guests?",
    helperText: "Pick your party size.",
    options: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
      label: `${n} guest${n > 1 ? "s" : ""}`,
      value: `for ${n}`,
    })),
  });
  steps.push({
    id: "contact_email",
    question: "What is your email?",
    helperText: "We will send your booking confirmation here.",
    inputType: "email",
    options: [],
  });
  return {
    version: 1,
    idleHelperText: "Tap an option to start. The assistant can handle bookings and common questions.",
    quickActions: [
      { label: "I want to book a table", startsBookingFlow: true },
      { label: "What are your opening hours?", startsBookingFlow: false },
      { label: "Do you have vegetarian options?", startsBookingFlow: false },
      { label: "Talk to the team", startsBookingFlow: false },
    ],
    slotDurationMinutes: 30,
    minGapMinutes: 0,
    steps,
  };
}

/** Normalize stored quick actions (legacy string[] or object rows). Legacy strings default to startsBookingFlow true. */
export function normalizeQuickActionsArray(raw: unknown): BookingFlowQuickAction[] {
  if (!Array.isArray(raw)) return [];
  const out: BookingFlowQuickAction[] = [];
  for (const item of raw.slice(0, 8)) {
    if (typeof item === "string") {
      const label = item.trim();
      if (label) out.push({ label, startsBookingFlow: true });
      continue;
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const rec = item as Record<string, unknown>;
      const label = String(rec.label ?? "").trim();
      if (!label) continue;
      let startsBookingFlow = true;
      if (typeof rec.startsBookingFlow === "boolean") {
        startsBookingFlow = rec.startsBookingFlow;
      } else if (rec.behavior === "chat") {
        startsBookingFlow = false;
      } else if (rec.behavior === "booking") {
        startsBookingFlow = true;
      }
      out.push({ label, startsBookingFlow });
    }
  }
  return out;
}

export function parseServicesList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 20);
}

/** Normalize a raw steps array from JSON / LLM output (same rules as full flow resolution). */
export function normalizeBookingFlowStepsArray(stepsRaw: unknown): BookingFlowStep[] {
  if (!Array.isArray(stepsRaw)) return [];
  const normalizedSteps: BookingFlowStep[] = [];
  for (let index = 0; index < stepsRaw.length; index += 1) {
    const step = stepsRaw[index];
    if (!step || typeof step !== "object" || Array.isArray(step)) continue;
    const s = step as Record<string, unknown>;
    const id = normalizeText(s.id, `step_${index + 1}`);
    const question = normalizeText(s.question, `Question ${index + 1}`);
    const inputType =
      s.inputType === "datetime"
        ? "datetime"
        : s.inputType === "email"
          ? "email"
          : s.inputType === "text"
            ? "text"
            : "options";
    const helperText = normalizeText(
      s.helperText,
      inputType === "text" || inputType === "email"
        ? inputType === "email"
          ? "Enter your email address."
          : "Type your answer."
        : "Choose one option.",
    );

    const sourceOptions = Array.isArray(s.options) ? s.options : [];
    const parsed = sourceOptions
      .map(normalizeOption)
      .filter((x): x is BookingFlowOption => x != null)
      .slice(0, 40);
    if (inputType === "options" && parsed.length === 0) continue;
    normalizedSteps.push({
      id,
      question,
      helperText,
      inputType,
      options: inputType === "options" ? parsed : [],
    });
  }
  return normalizedSteps;
}

/** Update only quick action chips; intro line and steps unchanged. AI returns labels only — all start booking. */
export function mergeBookingFlowQuickActionsOnly(base: BookingFlowConfig, quickFromAi: string[]): BookingFlowConfig {
  const qa: BookingFlowQuickAction[] = quickFromAi
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((label) => ({ label, startsBookingFlow: true }));
  return {
    ...base,
    quickActions: qa,
  };
}

/** Update only the idle helper line; quick actions and steps unchanged. */
export function mergeBookingFlowIdleText(base: BookingFlowConfig, idleFromAi: string): BookingFlowConfig {
  return { ...base, idleHelperText: idleFromAi.trim() };
}

export function mergeBookingFlowSteps(base: BookingFlowConfig, steps: BookingFlowStep[]): BookingFlowConfig {
  return { ...base, steps };
}

export function resolveBookingFlowConfig(raw: unknown): BookingFlowConfig {
  const empty = emptyBookingFlow();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const rec = raw as Record<string, unknown>;
  if (Object.keys(rec).length === 0) return empty;

  const version = rec.version;
  const stepsRaw = rec.steps;
  const hasStepsArray = Array.isArray(stepsRaw);
  if (version !== 1 && !hasStepsArray) return empty;

  const idleHelperText = typeof rec.idleHelperText === "string" ? String(rec.idleHelperText).trim() : "";
  const quickActions = Array.isArray(rec.quickActions) ? normalizeQuickActionsArray(rec.quickActions) : [];
  const slotDurationMinutes = normalizeIntInRange(rec.slotDurationMinutes, empty.slotDurationMinutes, 15, 240);
  const minGapMinutes = normalizeIntInRange(rec.minGapMinutes, empty.minGapMinutes, 0, 180);
  const steps = hasStepsArray ? normalizeBookingFlowStepsArray(stepsRaw) : [];

  return {
    version: 1,
    idleHelperText,
    quickActions,
    slotDurationMinutes,
    minGapMinutes,
    steps,
  };
}

/** Legacy: chatbot config embedded in organization_knowledge_bases.parsed_data */
export function readChatbotConfigFromParsedData(parsedData: unknown): ChatbotConfigData {
  const data =
    parsedData && typeof parsedData === "object" && !Array.isArray(parsedData)
      ? (parsedData as Record<string, unknown>)
      : {};
  const config =
    data.chatbotConfig && typeof data.chatbotConfig === "object" && !Array.isArray(data.chatbotConfig)
      ? (data.chatbotConfig as Record<string, unknown>)
      : {};

  return {
    welcomeMessage: String(config.welcomeMessage || "").trim() || defaultWelcome,
    themeColor: String(config.themeColor || "").trim() || "#6366f1",
    iconColor: String(config.iconColor || "").trim() || "#ffffff",
    bookingFlow: emptyBookingFlow(),
    crmIntegration: resolveCrmIntegrationConfig(null),
  };
}

type ChatbotSettingsRow = {
  welcomeMessage: string;
  themeColor: string;
  iconColor: string;
  services?: unknown;
  bookingFlow?: unknown;
  crmIntegration?: unknown;
} | null | undefined;

/**
 * Prefer dedicated organization_chatbot_settings row; fall back to legacy KB JSON.
 */
export function resolveChatbotConfigData(
  settings: ChatbotSettingsRow,
  legacyParsedData: unknown,
): ChatbotConfigData {
  if (settings) {
    return {
      welcomeMessage: String(settings.welcomeMessage || "").trim() || defaultWelcome,
      themeColor: String(settings.themeColor || "").trim() || "#6366f1",
      iconColor: String(settings.iconColor || "").trim() || "#ffffff",
      bookingFlow: resolveBookingFlowConfig(settings.bookingFlow),
      crmIntegration: resolveCrmIntegrationConfig(settings.crmIntegration),
    };
  }
  const legacy = readChatbotConfigFromParsedData(legacyParsedData);
  return {
    ...legacy,
    bookingFlow: emptyBookingFlow(),
    crmIntegration: resolveCrmIntegrationConfig(null),
  };
}

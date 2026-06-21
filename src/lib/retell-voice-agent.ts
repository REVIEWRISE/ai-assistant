import type { RetellVoiceListItem } from "@/lib/retell-api";

export type { RetellVoiceListItem };

export const RETELL_DEFAULT_LLM_MODEL = "gpt-4.1-mini";
export const RETELL_VOICE_CUSTOM_VALUE = "custom";

export const RETELL_FALLBACK_VOICE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "11labs-Chloe", label: "Chloe — American female (ElevenLabs)" },
  { value: "openai-Nova", label: "Nova — American female (OpenAI)" },
  { value: "11labs-Lily", label: "Lily — American female (ElevenLabs)" },
  { value: "11labs-Adrian", label: "Adrian — American male (ElevenLabs)" },
  { value: "retell-Chloe", label: "Chloe — American female (Retell)" },
  { value: RETELL_VOICE_CUSTOM_VALUE, label: "Custom voice ID from Retell" },
];

export type RetellLanguage = "en-US" | "en-GB" | "en-AU" | "es-ES" | "fr-FR" | "de-DE";

export type RetellVoiceAgentConfig = {
  enabled: boolean;
  agentName: string;
  retellAgentId: string;
  voiceId: string;
  customVoiceId: string;
  language: RetellLanguage;
  openingMessage: string;
  systemPrompt: string;
  responsiveness: number;
  interruptionSensitivity: number;
};

export type VoiceAgentPhoneConfig = {
  twilioPhoneNumber: string;
};

export type VoiceAgentKnowledgeConfig = {
  useOrganizationKnowledgeBase: boolean;
  requireApprovedKnowledgeBase: boolean;
  enablePhoneBooking: boolean;
};

export type VoiceAgentSettings = {
  retell: RetellVoiceAgentConfig;
  phone: VoiceAgentPhoneConfig;
  knowledge: VoiceAgentKnowledgeConfig;
};

export type RetellVoiceSelectOption = {
  value: string;
  label: string;
};

export const RETELL_LANGUAGE_OPTIONS: Array<{ value: RetellLanguage; label: string }> = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
];

const PREFERRED_VOICE_IDS = [
  "11labs-Chloe",
  "openai-Nova",
  "11labs-Lily",
  "retell-Chloe",
  "11labs-Adrian",
  "retell-Willa",
  "openai-Adrian",
] as const;

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseEnabledFlag(value: unknown): boolean {
  if (value === false || value === "0" || value === "false" || value === "off") return false;
  if (value === true || value === "1" || value === "true" || value === "on") return true;
  return false;
}

function clamp01(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function parseLanguage(value: unknown): RetellLanguage {
  const raw = readString(value) as RetellLanguage;
  return RETELL_LANGUAGE_OPTIONS.some((o) => o.value === raw) ? raw : "en-US";
}

export function pickDefaultRetellVoiceId(voices: RetellVoiceListItem[]): string {
  for (const preferred of PREFERRED_VOICE_IDS) {
    if (voices.some((voice) => voice.voiceId === preferred)) return preferred;
  }

  const englishVoice = voices.find(
    (voice) =>
      /american|british|australian/i.test(voice.accent) &&
      /^(retell|11labs|openai)-/i.test(voice.voiceId),
  );
  return englishVoice?.voiceId || voices[0]?.voiceId || "openai-Nova";
}

export function buildRetellVoiceSelectOptions(
  voices: RetellVoiceListItem[],
  selectedVoiceId?: string,
): RetellVoiceSelectOption[] {
  if (!voices.length) return RETELL_FALLBACK_VOICE_OPTIONS;

  const preferredProviders = ["retell", "11labs", "openai"];
  const englishAccent = /american|british|australian/i;

  const filtered = voices
    .filter(
      (voice) =>
        preferredProviders.some((provider) => voice.voiceId.startsWith(`${provider}-`)) &&
        englishAccent.test(voice.accent),
    )
    .sort((a, b) => a.voiceName.localeCompare(b.voiceName));

  const options: RetellVoiceSelectOption[] = filtered.map((voice) => ({
    value: voice.voiceId,
    label: `${voice.voiceName} — ${voice.accent} ${voice.gender} (${voice.provider})`,
  }));

  const selected = selectedVoiceId?.trim();
  if (selected && selected !== RETELL_VOICE_CUSTOM_VALUE && !options.some((o) => o.value === selected)) {
    const match = voices.find((voice) => voice.voiceId === selected);
    options.unshift({
      value: selected,
      label: match
        ? `${match.voiceName} — ${match.accent} (current)`
        : `${selected} (current)`,
    });
  }

  options.push({ value: RETELL_VOICE_CUSTOM_VALUE, label: "Custom voice ID from Retell" });
  return options;
}

export function normalizeRetellVoiceSelection(
  config: Pick<RetellVoiceAgentConfig, "voiceId" | "customVoiceId">,
  voices: RetellVoiceListItem[],
): Pick<RetellVoiceAgentConfig, "voiceId" | "customVoiceId"> {
  if (config.voiceId === RETELL_VOICE_CUSTOM_VALUE || config.voiceId === "11labs-custom") {
    return {
      voiceId: RETELL_VOICE_CUSTOM_VALUE,
      customVoiceId: config.customVoiceId,
    };
  }

  const voiceId = config.voiceId.trim();
  if (!voices.length) {
    return { voiceId: voiceId || "11labs-Chloe", customVoiceId: "" };
  }

  if (voiceId && voices.some((voice) => voice.voiceId === voiceId)) {
    return { voiceId, customVoiceId: "" };
  }

  if (voiceId) {
    const legacySlug = voiceId.replace(/^(11labs|retell|openai|cartesia|minimax|fish_audio)-/i, "");
    const byName = voices.find(
      (voice) =>
        voice.voiceId.toLowerCase() === voiceId.toLowerCase() ||
        voice.voiceName.toLowerCase() === legacySlug.toLowerCase(),
    );
    if (byName) {
      return { voiceId: byName.voiceId, customVoiceId: "" };
    }
  }

  return { voiceId: pickDefaultRetellVoiceId(voices), customVoiceId: "" };
}

export function defaultRetellVoiceAgentConfig(voices: RetellVoiceListItem[] = []): RetellVoiceAgentConfig {
  return {
    enabled: false,
    agentName: "Support Agent",
    retellAgentId: "",
    voiceId: pickDefaultRetellVoiceId(voices),
    customVoiceId: "",
    language: "en-US",
    openingMessage: "Hi, thanks for calling. How can I help you today?",
    systemPrompt:
      "You are a helpful customer support agent. Answer questions using the business knowledge provided. Be concise, polite, and escalate to a human when you cannot help.",
    responsiveness: 0.85,
    interruptionSensitivity: 0.6,
  };
}

export function defaultVoiceAgentPhoneConfig(): VoiceAgentPhoneConfig {
  return {
    twilioPhoneNumber: "",
  };
}

export function defaultVoiceAgentKnowledgeConfig(): VoiceAgentKnowledgeConfig {
  return {
    useOrganizationKnowledgeBase: true,
    requireApprovedKnowledgeBase: true,
    enablePhoneBooking: false,
  };
}

export function defaultVoiceAgentSettings(voices: RetellVoiceListItem[] = []): VoiceAgentSettings {
  return {
    retell: defaultRetellVoiceAgentConfig(voices),
    phone: defaultVoiceAgentPhoneConfig(),
    knowledge: defaultVoiceAgentKnowledgeConfig(),
  };
}

export function resolveRetellVoiceAgentConfig(
  raw: unknown,
  voices: RetellVoiceListItem[] = [],
): RetellVoiceAgentConfig {
  const defaults = defaultRetellVoiceAgentConfig(voices);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const rec = raw as Record<string, unknown>;

  const responsivenessRaw =
    typeof rec.responsiveness === "number" ? rec.responsiveness : Number(rec.responsiveness);
  const interruptionRaw =
    typeof rec.interruptionSensitivity === "number"
      ? rec.interruptionSensitivity
      : Number(rec.interruptionSensitivity);

  const voiceFields = normalizeRetellVoiceSelection(
    {
      voiceId: readString(rec.voiceId) || defaults.voiceId,
      customVoiceId: readString(rec.customVoiceId),
    },
    voices,
  );

  return {
    enabled: rec.enabled === undefined ? defaults.enabled : parseEnabledFlag(rec.enabled),
    agentName: readString(rec.agentName).slice(0, 80) || defaults.agentName,
    retellAgentId: readString(rec.retellAgentId).slice(0, 120),
    ...voiceFields,
    language: parseLanguage(rec.language),
    openingMessage: readString(rec.openingMessage).slice(0, 500) || defaults.openingMessage,
    systemPrompt: readString(rec.systemPrompt).slice(0, 4000) || defaults.systemPrompt,
    responsiveness: clamp01(responsivenessRaw, defaults.responsiveness),
    interruptionSensitivity: clamp01(interruptionRaw, defaults.interruptionSensitivity),
  };
}

function readPhoneNumberField(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

export function resolveVoiceAgentPhoneConfig(raw: unknown): VoiceAgentPhoneConfig {
  const defaults = defaultVoiceAgentPhoneConfig();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const rec = raw as Record<string, unknown>;
  const number =
    readPhoneNumberField(rec.twilioPhoneNumber) ||
    readPhoneNumberField(rec.twilio_phone_number) ||
    readPhoneNumberField(rec.phoneNumber) ||
    readPhoneNumberField(rec.phone_number);
  return {
    twilioPhoneNumber: number.slice(0, 32),
  };
}

export function resolveVoiceAgentKnowledgeConfig(raw: unknown): VoiceAgentKnowledgeConfig {
  const defaults = defaultVoiceAgentKnowledgeConfig();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const rec = raw as Record<string, unknown>;
  return {
    useOrganizationKnowledgeBase:
      rec.useOrganizationKnowledgeBase === undefined
        ? defaults.useOrganizationKnowledgeBase
        : parseEnabledFlag(rec.useOrganizationKnowledgeBase),
    requireApprovedKnowledgeBase:
      rec.requireApprovedKnowledgeBase === undefined
        ? defaults.requireApprovedKnowledgeBase
        : parseEnabledFlag(rec.requireApprovedKnowledgeBase),
    enablePhoneBooking:
      rec.enablePhoneBooking === undefined
        ? defaults.enablePhoneBooking
        : parseEnabledFlag(rec.enablePhoneBooking),
  };
}

export function resolveVoiceAgentSettings(
  row: {
    retellConfig?: unknown;
    phoneConfig?: unknown;
    knowledgeConfig?: unknown;
  } | null,
  voices: RetellVoiceListItem[] = [],
): VoiceAgentSettings {
  if (!row) return defaultVoiceAgentSettings(voices);
  return {
    retell: resolveRetellVoiceAgentConfig(row.retellConfig, voices),
    phone: resolveVoiceAgentPhoneConfig(row.phoneConfig),
    knowledge: resolveVoiceAgentKnowledgeConfig(row.knowledgeConfig),
  };
}

export function resolveRetellVoiceId(config: RetellVoiceAgentConfig): string {
  if (config.voiceId === RETELL_VOICE_CUSTOM_VALUE || config.voiceId === "11labs-custom") {
    return config.customVoiceId.trim();
  }
  return config.voiceId.trim();
}

export function formatVoiceAgentCallSummary(phone: VoiceAgentPhoneConfig): string {
  const number = phone.twilioPhoneNumber.trim();
  if (!number) return "No support phone number configured yet.";
  return `Customers call ${number}`;
}

export function parseRetellVoiceAgentForm(
  raw: Record<string, unknown>,
  voices: RetellVoiceListItem[] = [],
): RetellVoiceAgentConfig {
  const defaults = defaultRetellVoiceAgentConfig(voices);
  const voiceFields = normalizeRetellVoiceSelection(
    {
      voiceId: readString(raw.voice_id) || defaults.voiceId,
      customVoiceId: readString(raw.custom_voice_id),
    },
    voices,
  );

  const responsivenessRaw = Number(raw.responsiveness);
  const interruptionRaw = Number(raw.interruption_sensitivity);

  return {
    enabled: parseEnabledFlag(raw.enabled),
    agentName: readString(raw.agent_name).slice(0, 80) || defaults.agentName,
    retellAgentId: readString(raw.retell_agent_id).slice(0, 120),
    ...voiceFields,
    language: parseLanguage(raw.language),
    openingMessage: readString(raw.opening_message).slice(0, 500) || defaults.openingMessage,
    systemPrompt: readString(raw.system_prompt).slice(0, 4000) || defaults.systemPrompt,
    responsiveness: clamp01(responsivenessRaw, defaults.responsiveness),
    interruptionSensitivity: clamp01(interruptionRaw, defaults.interruptionSensitivity),
  };
}

export function parseVoiceAgentPhoneForm(raw: Record<string, unknown>): VoiceAgentPhoneConfig {
  return {
    twilioPhoneNumber: readString(raw.twilio_phone_number).slice(0, 32),
  };
}

export function parseVoiceAgentKnowledgeForm(raw: Record<string, unknown>): VoiceAgentKnowledgeConfig {
  return {
    useOrganizationKnowledgeBase: parseEnabledFlag(raw.use_org_knowledge_base),
    requireApprovedKnowledgeBase: parseEnabledFlag(raw.require_approved_knowledge_base),
    enablePhoneBooking: parseEnabledFlag(raw.enable_phone_booking),
  };
}

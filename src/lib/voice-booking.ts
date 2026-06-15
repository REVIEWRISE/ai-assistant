export type VoiceGreetingStyle = "warm" | "professional" | "casual" | "concierge";
export type VoiceFormality = "formal" | "balanced" | "casual";
export type VoiceTone = "friendly" | "professional" | "upbeat" | "calm" | "luxury";

export type VoiceProfileId =
  | "sophia_us_warm"
  | "james_us_professional"
  | "emma_uk_friendly"
  | "oliver_uk_formal"
  | "mia_au_relaxed"
  | "noah_au_clear"
  | "isabella_us_energetic"
  | "ethan_us_calm"
  | "charlotte_uk_soft"
  | "liam_ie_warm"
  | "ava_us_concierge"
  | "mason_us_direct";

export type VoiceProfilePreset = {
  id: VoiceProfileId;
  label: string;
  gender: "female" | "male";
  accent: string;
  description: string;
  defaultPace: number;
  /** BCP-47 language tag for future TTS/STT */
  language: string;
};

export type VoiceBookingConfig = {
  enabled: boolean;
  agentName: string;
  greetingStyle: VoiceGreetingStyle;
  formality: VoiceFormality;
  tone: VoiceTone;
  profileId: VoiceProfileId;
  /** Speech rate multiplier (0.8–1.2). */
  pace: number;
  /** Spoken greeting copy (required when voice booking is enabled). */
  customGreeting: string;
};

export const VOICE_PROFILE_PRESETS: VoiceProfilePreset[] = [
  {
    id: "sophia_us_warm",
    label: "Sophia",
    gender: "female",
    accent: "US English",
    description: "Warm, welcoming host for restaurants and salons.",
    defaultPace: 1,
    language: "en-US",
  },
  {
    id: "james_us_professional",
    label: "James",
    gender: "male",
    accent: "US English",
    description: "Clear and professional for clinics and B2B services.",
    defaultPace: 0.95,
    language: "en-US",
  },
  {
    id: "emma_uk_friendly",
    label: "Emma",
    gender: "female",
    accent: "British English",
    description: "Friendly British tone for hospitality brands.",
    defaultPace: 1,
    language: "en-GB",
  },
  {
    id: "oliver_uk_formal",
    label: "Oliver",
    gender: "male",
    accent: "British English",
    description: "Polished formal voice for premium services.",
    defaultPace: 0.9,
    language: "en-GB",
  },
  {
    id: "mia_au_relaxed",
    label: "Mia",
    gender: "female",
    accent: "Australian English",
    description: "Relaxed Aussie style for casual venues.",
    defaultPace: 1.05,
    language: "en-AU",
  },
  {
    id: "noah_au_clear",
    label: "Noah",
    gender: "male",
    accent: "Australian English",
    description: "Direct and easy to understand.",
    defaultPace: 1,
    language: "en-AU",
  },
  {
    id: "isabella_us_energetic",
    label: "Isabella",
    gender: "female",
    accent: "US English",
    description: "Upbeat energy for fitness and events.",
    defaultPace: 1.1,
    language: "en-US",
  },
  {
    id: "ethan_us_calm",
    label: "Ethan",
    gender: "male",
    accent: "US English",
    description: "Calm reassurance for wellness and care.",
    defaultPace: 0.88,
    language: "en-US",
  },
  {
    id: "charlotte_uk_soft",
    label: "Charlotte",
    gender: "female",
    accent: "British English",
    description: "Soft, gentle delivery for spas and boutiques.",
    defaultPace: 0.92,
    language: "en-GB",
  },
  {
    id: "liam_ie_warm",
    label: "Liam",
    gender: "male",
    accent: "Irish English",
    description: "Warm Irish accent for local hospitality.",
    defaultPace: 1,
    language: "en-IE",
  },
  {
    id: "ava_us_concierge",
    label: "Ava",
    gender: "female",
    accent: "US English",
    description: "Concierge-style guidance for hotels and venues.",
    defaultPace: 0.95,
    language: "en-US",
  },
  {
    id: "mason_us_direct",
    label: "Mason",
    gender: "male",
    accent: "US English",
    description: "Efficient and to the point for quick bookings.",
    defaultPace: 1.08,
    language: "en-US",
  },
];

const PROFILE_IDS = new Set(VOICE_PROFILE_PRESETS.map((p) => p.id));

const GREETING_STYLES = new Set<VoiceGreetingStyle>(["warm", "professional", "casual", "concierge"]);
const FORMALITIES = new Set<VoiceFormality>(["formal", "balanced", "casual"]);
const TONES = new Set<VoiceTone>(["friendly", "professional", "upbeat", "calm", "luxury"]);

export const DEFAULT_VOICE_PROFILE_ID: VoiceProfileId = "sophia_us_warm";

export function emptyVoiceBooking(): VoiceBookingConfig {
  return {
    enabled: false,
    agentName: "",
    greetingStyle: "warm",
    formality: "balanced",
    tone: "friendly",
    profileId: DEFAULT_VOICE_PROFILE_ID,
    pace: 1,
    customGreeting: "",
  };
}

export function getVoiceProfilePreset(id: VoiceProfileId): VoiceProfilePreset {
  return VOICE_PROFILE_PRESETS.find((p) => p.id === id) ?? VOICE_PROFILE_PRESETS[0];
}

function clampPace(value: number): number {
  return Math.min(1.2, Math.max(0.8, Math.round(value * 100) / 100));
}

/** Voice booking is on when agent name and spoken greeting are both saved. */
export function deriveVoiceBookingEnabled(agentName: string, customGreeting: string): boolean {
  return agentName.trim().length > 0 && customGreeting.trim().length > 0;
}

function parseVoiceEnabledFlag(value: unknown): boolean | undefined {
  if (value === true || value === "1" || value === "true" || value === "on") return true;
  if (value === false || value === "0" || value === "false" || value === "off") return false;
  return undefined;
}

function resolveVoiceEnabled(
  storedEnabled: unknown,
  agentName: string,
  customGreeting: string,
): boolean {
  const flag = parseVoiceEnabledFlag(storedEnabled);
  if (flag === false) return false;
  if (flag === true) return deriveVoiceBookingEnabled(agentName, customGreeting);
  return deriveVoiceBookingEnabled(agentName, customGreeting);
}

/** Agent display name: custom override, else the selected voice profile name. */
export function resolveAgentNameForProfile(agentName: string, profileId: VoiceProfileId): string {
  const trimmed = agentName.trim().slice(0, 48);
  if (trimmed) return trimmed;
  return getVoiceProfilePreset(profileId).label;
}

export function resolveVoiceBookingConfig(raw: unknown): VoiceBookingConfig {
  const base = emptyVoiceBooking();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

  const rec = raw as Record<string, unknown>;
  const profileRaw = String(rec.profileId ?? "").trim() as VoiceProfileId;
  const profileId = PROFILE_IDS.has(profileRaw) ? profileRaw : base.profileId;
  const preset = getVoiceProfilePreset(profileId);

  const greetingStyleRaw = String(rec.greetingStyle ?? "").trim() as VoiceGreetingStyle;
  const formalityRaw = String(rec.formality ?? "").trim() as VoiceFormality;
  const toneRaw = String(rec.tone ?? "").trim() as VoiceTone;

  const paceRaw = typeof rec.pace === "number" ? rec.pace : Number(rec.pace);
  const pace = Number.isFinite(paceRaw) ? clampPace(paceRaw) : preset.defaultPace;
  const agentName = resolveAgentNameForProfile(String(rec.agentName ?? ""), profileId);
  const customGreeting = String(rec.customGreeting ?? "").trim().slice(0, 400);

  return {
    enabled: resolveVoiceEnabled(rec.enabled, agentName, customGreeting),
    agentName,
    greetingStyle: GREETING_STYLES.has(greetingStyleRaw) ? greetingStyleRaw : base.greetingStyle,
    formality: FORMALITIES.has(formalityRaw) ? formalityRaw : base.formality,
    tone: TONES.has(toneRaw) ? toneRaw : base.tone,
    profileId,
    pace,
    customGreeting,
  };
}

export function parseVoiceBookingForm(raw: {
  enabled?: unknown;
  agentName?: unknown;
  greetingStyle?: unknown;
  formality?: unknown;
  tone?: unknown;
  profileId?: unknown;
  pace?: unknown;
  customGreeting?: unknown;
}): VoiceBookingConfig {
  const profileRaw = String(raw.profileId ?? "").trim() as VoiceProfileId;
  const profileId = PROFILE_IDS.has(profileRaw) ? profileRaw : DEFAULT_VOICE_PROFILE_ID;
  const preset = getVoiceProfilePreset(profileId);

  const greetingStyleRaw = String(raw.greetingStyle ?? "").trim() as VoiceGreetingStyle;
  const formalityRaw = String(raw.formality ?? "").trim() as VoiceFormality;
  const toneRaw = String(raw.tone ?? "").trim() as VoiceTone;

  const paceRaw = typeof raw.pace === "number" ? raw.pace : Number(raw.pace);
  const pace = Number.isFinite(paceRaw) ? clampPace(paceRaw) : preset.defaultPace;

  const agentNameRaw = raw.agentName;
  const agentName = resolveAgentNameForProfile(String(agentNameRaw ?? ""), profileId);
  const customGreeting = String(raw.customGreeting ?? "").trim().slice(0, 400);

  return {
    enabled: resolveVoiceEnabled(raw.enabled, agentName, customGreeting),
    agentName,
    greetingStyle: GREETING_STYLES.has(greetingStyleRaw) ? greetingStyleRaw : "warm",
    formality: FORMALITIES.has(formalityRaw) ? formalityRaw : "balanced",
    tone: TONES.has(toneRaw) ? toneRaw : "friendly",
    profileId,
    pace,
    customGreeting,
  };
}

/** Spoken greeting preview for admin UI and future TTS. */
export function buildVoiceGreetingPreview(args: {
  config: VoiceBookingConfig;
  organizationName: string;
}): string {
  if (args.config.customGreeting) return args.config.customGreeting;

  const name = resolveAgentNameForProfile(args.config.agentName, args.config.profileId);
  const org = args.organizationName.trim() || "our team";

  switch (args.config.greetingStyle) {
    case "professional":
      return `Hello, I'm ${name} with ${org}. I can help you complete a booking by voice or chat.`;
    case "casual":
      return `Hey! I'm ${name} from ${org}. Tell me what you'd like to book and I'll walk you through it.`;
    case "concierge":
      return `Good day. ${name} here at ${org}. How may I assist you with your reservation today?`;
    case "warm":
    default:
      return `Hi, I'm ${name} from ${org}. I'd be happy to help you book an appointment.`;
  }
}

export function voiceBookingIsReady(config: VoiceBookingConfig): boolean {
  return config.enabled && deriveVoiceBookingEnabled(config.agentName, config.customGreeting);
}

const GREETING_STYLE_LABELS: Record<VoiceGreetingStyle, string> = {
  warm: "Warm welcome",
  professional: "Professional",
  casual: "Casual",
  concierge: "Concierge",
};

const FORMALITY_LABELS: Record<VoiceFormality, string> = {
  formal: "Formal",
  balanced: "Balanced",
  casual: "Casual",
};

const TONE_LABELS: Record<VoiceTone, string> = {
  friendly: "Friendly",
  professional: "Professional",
  upbeat: "Upbeat",
  calm: "Calm",
  luxury: "Luxury",
};

export function voiceGreetingStyleLabel(style: VoiceGreetingStyle): string {
  return GREETING_STYLE_LABELS[style];
}

export function voiceFormalityLabel(formality: VoiceFormality): string {
  return FORMALITY_LABELS[formality];
}

export function voiceToneLabel(tone: VoiceTone): string {
  return TONE_LABELS[tone];
}

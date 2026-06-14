"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { GenerateVoiceGreetingResult } from "@/app/(protected)/appointments/chatbot/actions";
import {
  VOICE_PROFILE_PRESETS,
  type VoiceBookingConfig,
  type VoiceFormality,
  type VoiceGreetingStyle,
  type VoiceProfileId,
  type VoiceTone,
} from "@/lib/voice-booking";
import {
  isVoicePreviewSupported,
  speakVoiceProfilePreview,
  stopVoiceProfilePreview,
  voicePreviewSampleText,
  waitForSpeechVoices,
} from "@/lib/voice-preview";

const GREETING_STYLE_OPTIONS: Array<{ value: VoiceGreetingStyle; label: string }> = [
  { value: "warm", label: "Warm welcome" },
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "concierge", label: "Concierge" },
];

const FORMALITY_OPTIONS: Array<{ value: VoiceFormality; label: string }> = [
  { value: "formal", label: "Formal" },
  { value: "balanced", label: "Balanced" },
  { value: "casual", label: "Casual" },
];

const TONE_OPTIONS: Array<{ value: VoiceTone; label: string }> = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "upbeat", label: "Upbeat" },
  { value: "calm", label: "Calm" },
  { value: "luxury", label: "Luxury" },
];

const GENERATE_ERROR_MESSAGES: Record<string, string> = {
  org_missing: "Missing organization.",
  denied: "You do not have access to this organization.",
  no_api_key: "Add OPENAI_API_KEY to your environment to generate a greeting.",
  failed: "Generation failed. Try again in a moment.",
};

export function ChatbotVoiceBookingModal({
  organizationId,
  organizationName,
  initialConfig,
  onSave,
  onGenerateGreeting,
  onClose,
}: {
  organizationId: string;
  organizationName: string;
  initialConfig: VoiceBookingConfig;
  onSave: (formData: FormData) => void | Promise<void>;
  onGenerateGreeting: (formData: FormData) => Promise<GenerateVoiceGreetingResult>;
  onClose: () => void;
}) {
  const [voiceActive, setVoiceActive] = useState(initialConfig.enabled);
  const [greetingStyle, setGreetingStyle] = useState<VoiceGreetingStyle>(initialConfig.greetingStyle);
  const [formality, setFormality] = useState<VoiceFormality>(initialConfig.formality);
  const [tone, setTone] = useState<VoiceTone>(initialConfig.tone);
  const [profileId, setProfileId] = useState<VoiceProfileId>(initialConfig.profileId);
  const [pace, setPace] = useState(initialConfig.pace);
  const [customGreeting, setCustomGreeting] = useState(initialConfig.customGreeting);
  const [generatePending, setGeneratePending] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [voicesReady, setVoicesReady] = useState(false);

  useEffect(() => {
    if (!isVoicePreviewSupported()) return;
    void waitForSpeechVoices().then(() => setVoicesReady(true));
    return () => stopVoiceProfilePreview();
  }, []);

  const selectedProfile = VOICE_PROFILE_PRESETS.find((p) => p.id === profileId) ?? VOICE_PROFILE_PRESETS[0];
  const agentName = selectedProfile.label;

  const canSave = !voiceActive || customGreeting.trim().length > 0;
  const previewText = useMemo(
    () => customGreeting.trim() || voicePreviewSampleText(selectedProfile),
    [customGreeting, selectedProfile],
  );
  const canPreviewVoice = isVoicePreviewSupported() && voicesReady;

  function selectProfile(id: VoiceProfileId) {
    stopVoiceProfilePreview();
    setPreviewPlaying(false);
    const preset = VOICE_PROFILE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setProfileId(id);
    setPace(preset.defaultPace);
  }

  async function runGenerateGreeting() {
    setGenerateError(null);
    setGeneratePending(true);
    try {
      const fd = new FormData();
      fd.set("organization_id", organizationId);
      fd.set("voice_agent_name", agentName);
      fd.set("voice_greeting_style", greetingStyle);
      fd.set("voice_formality", formality);
      fd.set("voice_tone", tone);
      fd.set("voice_profile_id", profileId);
      fd.set("voice_pace", String(pace));
      const res = await onGenerateGreeting(fd);
      if (res.ok) {
        setCustomGreeting(res.greeting);
      } else {
        setGenerateError(GENERATE_ERROR_MESSAGES[res.error] ?? "Something went wrong.");
      }
    } catch {
      setGenerateError("Generation failed. Try again in a moment.");
    } finally {
      setGeneratePending(false);
    }
  }

  async function runVoicePreview() {
    if (previewPlaying) {
      stopVoiceProfilePreview();
      setPreviewPlaying(false);
      return;
    }

    setPreviewError(null);
    setPreviewPlaying(true);
    try {
      await speakVoiceProfilePreview({
        profile: selectedProfile,
        pace,
        text: previewText,
      });
    } catch {
      setPreviewError("Could not play voice preview in this browser.");
    } finally {
      setPreviewPlaying(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-[min(96vw,48rem)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]">
        <div className="max-h-[92vh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                Voice booking
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">
                Brand voice for {organizationName}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Pick a voice profile, set greeting style, formality, and tone, then generate the spoken greeting.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)]"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>

          <form action={onSave} className="mt-5 space-y-5">
            <input type="hidden" name="organization_id" value={organizationId} />
            <input type="hidden" name="voice_agent_name" value={voiceActive ? agentName : ""} />
            <input type="hidden" name="voice_greeting_style" value={greetingStyle} />
            <input type="hidden" name="voice_formality" value={formality} />
            <input type="hidden" name="voice_tone" value={tone} />
            <input type="hidden" name="voice_profile_id" value={profileId} />
            <input type="hidden" name="voice_pace" value={String(pace)} />
            <input type="hidden" name="voice_custom_greeting" value={customGreeting} />

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">Enable voice booking</p>
                <p className="text-xs text-[var(--color-text-muted)]">Show voice booking on your embed chatbot widget.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={voiceActive}
                aria-label={voiceActive ? "Turn off voice booking" : "Turn on voice booking"}
                onClick={() => {
                  if (voiceActive) {
                    stopVoiceProfilePreview();
                    setPreviewPlaying(false);
                  }
                  setVoiceActive((prev) => !prev);
                }}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  voiceActive ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    voiceActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Agent identity</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Agent name comes from your selected voice profile. Adjust style, formality, and tone, then generate
                the spoken greeting.
              </p>
              <label className="block text-xs font-semibold text-[var(--color-text)]">
                Agent name
                <input
                  type="text"
                  value={agentName}
                  disabled
                  readOnly
                  className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-sm text-[var(--color-text-muted)] opacity-90"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-semibold text-[var(--color-text)]">
                  Greeting style
                  <select
                    value={greetingStyle}
                    onChange={(e) => setGreetingStyle(e.target.value as VoiceGreetingStyle)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm text-[var(--color-text)]"
                  >
                    {GREETING_STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-[var(--color-text)]">
                  Formality
                  <select
                    value={formality}
                    onChange={(e) => setFormality(e.target.value as VoiceFormality)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm text-[var(--color-text)]"
                  >
                    {FORMALITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-[var(--color-text)]">
                  Tone
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as VoiceTone)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm text-[var(--color-text)]"
                  >
                    {TONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[var(--color-text)]">
                    Spoken greeting <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <button
                    type="button"
                    disabled={generatePending}
                    onClick={() => void runGenerateGreeting()}
                    className="shrink-0 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-fg)] shadow-sm transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatePending ? "Generating…" : "Generate with AI"}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Required. AI uses greeting style ({greetingStyle}), formality ({formality}), and tone ({tone}) plus
                  your business name.
                </p>
                {generateError ? (
                  <p className="text-xs font-medium text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))]">
                    {generateError}
                  </p>
                ) : null}
                <textarea
                  value={customGreeting}
                  onChange={(e) => setCustomGreeting(e.target.value)}
                  rows={3}
                  maxLength={400}
                  required={voiceActive}
                  placeholder="Click Generate with AI, or type your greeting here."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">Voice profile</h3>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Choose from {VOICE_PROFILE_PRESETS.length} pre-built profiles. Adjust pace to fine-tune delivery.
                  </p>
                </div>
                <label className="block min-w-[140px] text-xs font-semibold text-[var(--color-text)]">
                  Pace ({pace.toFixed(2)}×)
                  <input
                    type="range"
                    min={0.8}
                    max={1.2}
                    step={0.02}
                    value={pace}
                    onChange={(e) => setPace(Number(e.target.value))}
                    className="mt-1 w-full accent-[var(--color-primary)]"
                  />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {VOICE_PROFILE_PRESETS.map((profile) => {
                  const selected = profile.id === profileId;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => selectProfile(profile.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        selected
                          ? "border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[var(--color-primary-soft)] ring-2 ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]"
                      }`}
                    >
                      <p className="text-sm font-semibold text-[var(--color-text)]">{profile.label}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                        {profile.gender === "female" ? "Female" : "Male"} · {profile.accent}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">{profile.description}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Selected: <span className="font-semibold text-[var(--color-text)]">{selectedProfile.label}</span> ·{" "}
                  {selectedProfile.accent} · default pace {selectedProfile.defaultPace.toFixed(2)}×
                </p>
                <button
                  type="button"
                  disabled={!canPreviewVoice}
                  onClick={() => void runVoicePreview()}
                  title={
                    canPreviewVoice
                      ? previewPlaying
                        ? "Stop preview"
                        : "Hear the selected voice profile"
                      : "Voice preview is not available in this browser"
                  }
                  className="shrink-0 rounded-lg border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-h)] shadow-sm transition hover:bg-[var(--color-primary-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {previewPlaying ? "Stop" : "Try voice"}
                </button>
              </div>
              {previewError ? (
                <p className="text-xs font-medium text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))]">
                  {previewError}
                </p>
              ) : null}
              {!canPreviewVoice ? (
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Voice preview uses your browser&apos;s speech engine. It may sound different from production TTS.
                </p>
              ) : null}
            </section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-muted)] pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save voice settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

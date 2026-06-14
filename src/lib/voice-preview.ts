import type { VoiceProfilePreset } from "@/lib/voice-booking";

export function isVoicePreviewSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function voicePreviewSampleText(profile: VoiceProfilePreset): string {
  return `Hi, I'm ${profile.label}. I can help you book an appointment.`;
}

function normalizeLang(tag: string): string {
  return tag.toLowerCase().replace("_", "-");
}

function voiceMatchesLanguage(voice: SpeechSynthesisVoice, lang: string): boolean {
  const target = normalizeLang(lang);
  const voiceLang = normalizeLang(voice.lang);
  if (voiceLang === target) return true;
  const targetRegion = target.split("-")[1];
  const voiceRegion = voiceLang.split("-")[1];
  return Boolean(targetRegion && voiceRegion && targetRegion === voiceRegion);
}

function scoreVoice(voice: SpeechSynthesisVoice, profile: VoiceProfilePreset): number {
  let score = 0;
  const name = voice.name.toLowerCase();

  if (voiceMatchesLanguage(voice, profile.language)) score += 20;
  else if (normalizeLang(voice.lang).startsWith("en")) score += 4;

  const femaleHints = ["female", "samantha", "victoria", "karen", "moira", "tessa", "fiona", "kate", "serena"];
  const maleHints = ["male", "daniel", "alex", "fred", "tom", "james", "oliver", "aaron", "gordon", "lee"];

  if (profile.gender === "female" && femaleHints.some((hint) => name.includes(hint))) score += 8;
  if (profile.gender === "male" && maleHints.some((hint) => name.includes(hint))) score += 8;

  if (profile.language === "en-GB" && (name.includes("gb") || name.includes("uk") || name.includes("british"))) {
    score += 4;
  }
  if (profile.language === "en-AU" && (name.includes("au") || name.includes("australian"))) score += 4;
  if (profile.language === "en-IE" && (name.includes("ie") || name.includes("irish"))) score += 4;

  if (!voice.localService) score -= 2;

  return score;
}

export function pickSpeechVoiceForProfile(profile: VoiceProfilePreset): SpeechSynthesisVoice | null {
  if (!isVoicePreviewSupported()) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const ranked = voices
    .map((voice) => ({ voice, score: scoreVoice(voice, profile) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.voice ?? null;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopVoiceProfilePreview(): void {
  if (!isVoicePreviewSupported()) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
}

export function speakVoiceProfilePreview(args: {
  profile: VoiceProfilePreset;
  pace: number;
  text: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isVoicePreviewSupported()) {
      reject(new Error("Speech synthesis is not supported in this browser."));
      return;
    }

    const trimmed = args.text.trim();
    if (!trimmed) {
      reject(new Error("Nothing to preview."));
      return;
    }

    stopVoiceProfilePreview();

    const utterance = new SpeechSynthesisUtterance(trimmed);
    const voice = pickSpeechVoiceForProfile(args.profile);
    if (voice) utterance.voice = voice;
    utterance.lang = args.profile.language;
    utterance.rate = Math.min(1.2, Math.max(0.8, args.pace));
    utterance.pitch = 1;

    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null;
      resolve();
    };
    utterance.onerror = (event) => {
      if (activeUtterance === utterance) activeUtterance = null;
      if (event.error === "canceled") {
        resolve();
        return;
      }
      reject(new Error(event.error || "Playback failed"));
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

export function waitForSpeechVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isVoicePreviewSupported()) {
      resolve([]);
      return;
    }

    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    let settled = false;
    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      clearTimeout(timer);
      resolve(voices);
    };

    const onChange = () => finish(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    const timer = setTimeout(() => finish(window.speechSynthesis.getVoices()), timeoutMs);
  });
}

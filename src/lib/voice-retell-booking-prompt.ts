export const VOICE_RETELL_BOOKING_PROMPT_MARKER = "\n\n--- PHONE BOOKING ---\n";

export function appendVoiceRetellBookingPrompt(basePrompt: string, bookingSection: string): string {
  const base = basePrompt.trim();
  const section = bookingSection.trim();
  if (!section) return base;
  if (base.includes(VOICE_RETELL_BOOKING_PROMPT_MARKER)) {
    const idx = base.indexOf(VOICE_RETELL_BOOKING_PROMPT_MARKER);
    return `${base.slice(0, idx).trim()}${VOICE_RETELL_BOOKING_PROMPT_MARKER}${section}`;
  }
  return `${base}${VOICE_RETELL_BOOKING_PROMPT_MARKER}${section}`;
}

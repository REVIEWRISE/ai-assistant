export type AppointmentBookingSource = "chatbot_embed" | "voice_retell" | string;

const SOURCE_LABELS: Record<string, string> = {
  chatbot_embed: "Chatbot",
  voice_retell: "Phone (Voice AI)",
  web: "Web",
};

export function appointmentSourceLabel(source: string): string {
  const key = source.trim();
  return SOURCE_LABELS[key] ?? key.replace(/_/g, " ");
}

export function appointmentSourceBadgeClass(source: string): string {
  if (source === "voice_retell") {
    return "bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))] text-[var(--color-primary-h)]";
  }
  if (source === "chatbot_embed") {
    return "bg-[var(--color-raised)] text-[var(--color-text-muted)]";
  }
  return "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]";
}

export function bookingSourceSupportsCrmSync(source: string): boolean {
  return source === "chatbot_embed" || source === "voice_retell";
}

export type BookedSourceFilter = "all" | "chatbot_embed" | "voice_retell";

export const BOOKED_SOURCE_FILTER_OPTIONS: Array<{ key: BookedSourceFilter; label: string }> = [
  { key: "all", label: "All sources" },
  { key: "chatbot_embed", label: "Chatbot" },
  { key: "voice_retell", label: "Phone (Voice AI)" },
];

export function filterAppointmentsBySource<T extends { source: string }>(
  rows: T[],
  filter: BookedSourceFilter,
): T[] {
  if (filter === "all") return rows;
  return rows.filter((row) => row.source === filter);
}

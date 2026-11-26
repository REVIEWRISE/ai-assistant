/** Bookings made by the web assistant: website embed, shared link or scanned QR code. */
export const WEB_BOOKING_SOURCES = ["chatbot_embed", "booking_link", "booking_qr"] as const;

export type AppointmentBookingSource = (typeof WEB_BOOKING_SOURCES)[number] | "voice_retell" | string;

export function webBookingSource(channel: unknown): (typeof WEB_BOOKING_SOURCES)[number] {
  if (channel === "link") return "booking_link";
  if (channel === "qr") return "booking_qr";
  return "chatbot_embed";
}

function isWebBookingSource(source: string): boolean {
  return (WEB_BOOKING_SOURCES as readonly string[]).includes(source);
}

const SOURCE_LABELS: Record<string, string> = {
  chatbot_embed: "Chatbot",
  booking_link: "Booking link",
  booking_qr: "QR code",
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
  if (isWebBookingSource(source)) {
    return "bg-[var(--color-raised)] text-[var(--color-text-muted)]";
  }
  return "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]";
}

export function bookingSourceSupportsCrmSync(source: string): boolean {
  return isWebBookingSource(source) || source === "voice_retell";
}

export type BookedSourceFilter = "all" | (typeof WEB_BOOKING_SOURCES)[number] | "voice_retell";

export const BOOKED_SOURCE_FILTER_OPTIONS: Array<{ key: BookedSourceFilter; label: string }> = [
  { key: "all", label: "All sources" },
  { key: "chatbot_embed", label: "Chatbot" },
  { key: "booking_link", label: "Booking link" },
  { key: "booking_qr", label: "QR code" },
  { key: "voice_retell", label: "Phone (Voice AI)" },
];

export function filterAppointmentsBySource<T extends { source: string }>(
  rows: T[],
  filter: BookedSourceFilter,
): T[] {
  if (filter === "all") return rows;
  return rows.filter((row) => row.source === filter);
}

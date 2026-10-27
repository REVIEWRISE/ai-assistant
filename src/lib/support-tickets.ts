export const SUPPORT_TICKET_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "rejected",
] as const;

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export type SupportMessageAuthorRole = "user" | "admin";

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
};

/** Admin-driven transitions. Users only create tickets and reply while open. */
const ADMIN_TRANSITIONS: Record<SupportTicketStatus, SupportTicketStatus[]> = {
  pending: ["in_progress", "completed", "rejected"],
  in_progress: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

export function asSupportTicketStatus(value: string | null | undefined): SupportTicketStatus | null {
  if (!value) return null;
  return (SUPPORT_TICKET_STATUSES as readonly string[]).includes(value)
    ? (value as SupportTicketStatus)
    : null;
}

export function supportTicketStatusLabel(status: string): string {
  const normalized = asSupportTicketStatus(status);
  return normalized ? STATUS_LABELS[normalized] : status;
}

export function isSupportTicketOpen(status: string): boolean {
  const normalized = asSupportTicketStatus(status);
  return normalized === "pending" || normalized === "in_progress";
}

export function canUserReplyToSupportTicket(status: string): boolean {
  return isSupportTicketOpen(status);
}

/** Admins can reply while the request is pending or in progress. */
export function canAdminReplyToSupportTicket(status: string): boolean {
  return isSupportTicketOpen(status);
}

export function canAdminTransitionSupportTicket(
  from: string,
  to: string,
): boolean {
  const current = asSupportTicketStatus(from);
  const next = asSupportTicketStatus(to);
  if (!current || !next) return false;
  return ADMIN_TRANSITIONS[current].includes(next);
}

export function adminNextSupportStatuses(from: string): SupportTicketStatus[] {
  const current = asSupportTicketStatus(from);
  if (!current) return [];
  return ADMIN_TRANSITIONS[current];
}

/** True when the viewer has a newer message than their last-read cursor. */
export function supportTicketHasUnread(input: {
  viewer: "user" | "admin";
  lastMessageAt: string | Date | null | undefined;
  lastMessageAuthorRole: string | null | undefined;
  requesterLastReadAt: string | Date | null | undefined;
  adminLastReadAt: string | Date | null | undefined;
}): boolean {
  if (!input.lastMessageAt || !input.lastMessageAuthorRole) return false;

  const lastMessageMs = new Date(input.lastMessageAt).getTime();
  if (Number.isNaN(lastMessageMs)) return false;

  if (input.viewer === "user") {
    if (input.lastMessageAuthorRole !== "admin") return false;
    if (!input.requesterLastReadAt) return true;
    const readMs = new Date(input.requesterLastReadAt).getTime();
    return Number.isNaN(readMs) ? true : lastMessageMs > readMs;
  }

  if (input.lastMessageAuthorRole !== "user") return false;
  if (!input.adminLastReadAt) return true;
  const readMs = new Date(input.adminLastReadAt).getTime();
  return Number.isNaN(readMs) ? true : lastMessageMs > readMs;
}

/** Human-readable labels for known audit action codes. */
const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.login_success": "Signed in successfully",
  "auth.login_failed": "Sign-in failed",
  "auth.logout": "Signed out",
  "auth.register": "Created an account",
  "auth.email_verified": "Verified email address",

  "admin.user_created": "Created a user",
  "admin.user_updated": "Updated a user",
  "admin.user_deleted": "Deleted a user",

  "billing_admin.module_created": "Created a billing module",
  "billing_admin.module_updated": "Updated a billing module",
  "billing_admin.module_deleted": "Deleted a billing module",
  "billing_admin.plan_created": "Created a billing plan",
  "billing_admin.plan_updated": "Updated a billing plan",
  "billing.refund_requested": "Requested a refund",
  "billing.refund_approved": "Approved a refund request",
  "billing.refund_rejected": "Rejected a refund request",

  organization_calendar_provider_connected: "Connected a calendar provider",
  organization_review_provider_connected: "Connected a review provider",

  chatbot_booking_routed: "Chatbot booked an appointment",
  chatbot_calendar_synced: "Synced booking to calendar",
  chatbot_calendar_sync_failed: "Calendar sync failed",
  chatbot_crm_webhook_delivered: "Sent booking to CRM",
  chatbot_crm_webhook_failed: "CRM webhook failed",

  voice_retell_booking_created: "Voice agent booked an appointment",
};

function titleizeToken(token: string) {
  if (!token) return "";
  if (token.toLowerCase() === "crm") return "CRM";
  if (token.toLowerCase() === "api") return "API";
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/** Fallback for unknown codes: auth.login_failed → "Auth · Login failed" */
function humanizeUnknownAction(action: string) {
  const [namespace, ...rest] = action.split(".");
  const detail = (rest.length > 0 ? rest.join(".") : namespace)
    .split(/[._-]+/)
    .filter(Boolean)
    .map(titleizeToken)
    .join(" ");

  if (rest.length === 0) return detail || action;
  return `${titleizeToken(namespace)} · ${detail}`;
}

export function formatAuditAction(action: string): string {
  const trimmed = action.trim();
  if (!trimmed) return "Unknown action";
  return AUDIT_ACTION_LABELS[trimmed] ?? humanizeUnknownAction(trimmed);
}

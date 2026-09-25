export const REFUND_TYPES = [
  {
    value: "full",
    label: "Full Refund",
    description: "Return entire payment (within 30 days of purchase)",
    windowDays: 30,
  },
  {
    value: "partial",
    label: "Partial Refund",
    description: "Return portion of payment (service issues, overcharges)",
    windowDays: null,
  },
  {
    value: "store_credit",
    label: "Store Credit",
    description: "Instant account credit (faster than payment refund, no chargebacks)",
    windowDays: null,
  },
  {
    value: "pro_rata_cancel",
    label: "Pro-rata",
    description: "Automatic credit for unused days on mid-cycle cancellation",
    windowDays: null,
  },
] as const;

export type RefundType = (typeof REFUND_TYPES)[number]["value"];

export const CUSTOMER_REFUND_REASONS = [
  { value: "not_using_service", label: "No longer using service" },
  { value: "service_issue", label: "Service issue or downtime" },
  { value: "accidental_purchase", label: "Accidental purchase" },
  { value: "duplicate_charge", label: "Duplicate charge" },
  { value: "unused", label: "Did not use the product" },
  { value: "switched_plans", label: "Switched to a different plan" },
  { value: "too_expensive", label: "Too expensive" },
  { value: "other", label: "Other" },
] as const;

/** Alias for backwards compatibility with existing UI components */
export const REFUND_REASON_OPTIONS = CUSTOMER_REFUND_REASONS;
export type RefundReasonCode = (typeof CUSTOMER_REFUND_REASONS)[number]["value"];
export type CustomerRefundReason = RefundReasonCode;

export const ADMIN_REJECT_REASONS = [
  { value: "outside_window", label: "Outside 30-day refund window" },
  { value: "insufficient_funds", label: "Insufficient funds" },
  { value: "duplicate", label: "Duplicate refund request" },
  { value: "other", label: "Other" },
] as const;

export type AdminRejectReason = (typeof ADMIN_REJECT_REASONS)[number]["value"];

export const ADMIN_DIRECT_REFUND_REASONS = [
  { value: "service_issue", label: "Service issue / downtime" },
  { value: "duplicate_charge", label: "Duplicate charge" },
  { value: "admin_adjustment", label: "Admin adjustment" },
  { value: "goodwill", label: "Goodwill credit" },
  { value: "pro_rata_cancel", label: "Pro-rata cancellation credit" },
] as const;

export type AdminDirectRefundReason = (typeof ADMIN_DIRECT_REFUND_REASONS)[number]["value"];

export type BillingCustomerCreditItem = {
  id: string;
  amountCents: number;
  balanceCents: number;
  source: string;
  expiresAt: string | null;
  refundRequestId?: string | null;
};

export type BillingOrganizationCreditsResult = {
  organizationId: string;
  totalBalanceCents: number;
  credits: BillingCustomerCreditItem[];
  expiring?: string | null;
};

export const REFUND_METHODS = [
  {
    value: "store_credit",
    label: "Store Credit",
    hint: "Instant credit to account balance · no chargebacks",
  },
  {
    value: "payment_method",
    label: "Original Payment Method",
    hint: "Returned to customer card · 5-10 business days",
  },
] as const;

export type RefundMethod = (typeof REFUND_METHODS)[number]["value"];

export const REFUND_REASON_LABELS: Record<string, string> = {
  not_using_service: "No longer using service",
  service_issue: "Service issue or downtime",
  accidental_purchase: "Accidental purchase",
  duplicate_charge: "Duplicate charge",
  unused: "Did not use the product",
  switched_plans: "Switched to a different plan",
  too_expensive: "Too expensive",
  admin_adjustment: "Admin adjustment",
  goodwill: "Goodwill credit",
  pro_rata_cancel: "Pro-rata cancellation",
  outside_window: "Outside refund window (30 days)",
  insufficient_funds: "Insufficient funds",
  duplicate: "Duplicate request",
  other: "Other",
};

export function isRefundReasonCode(value: string): value is RefundReasonCode {
  return CUSTOMER_REFUND_REASONS.some((option) => option.value === value);
}

export function labelForRefundReason(reason: string): string {
  return REFUND_REASON_LABELS[reason] || reason.replace(/_/g, " ");
}

export function labelForRefundType(type: string): string {
  const match = REFUND_TYPES.find((t) => t.value === type);
  return match ? match.label : type.replace(/_/g, " ");
}

export function labelForRefundMethod(method: string): string {
  const match = REFUND_METHODS.find((m) => m.value === method);
  return match ? match.label : method.replace(/_/g, " ");
}

export function formatCents(cents: number | null | undefined, currency = "USD"): string {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

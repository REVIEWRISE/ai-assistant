export const REFUND_REASON_OPTIONS = [
  { value: "accidental_purchase", label: "Accidental purchase" },
  { value: "unused", label: "Did not use the product" },
  { value: "switched_plans", label: "Switched to a different plan" },
  { value: "too_expensive", label: "Too expensive" },
  { value: "other", label: "Other" },
] as const;

export type RefundReasonCode = (typeof REFUND_REASON_OPTIONS)[number]["value"];

export const REFUND_REASON_LABELS: Record<RefundReasonCode, string> = {
  accidental_purchase: "Accidental purchase",
  unused: "Did not use the product",
  switched_plans: "Switched to a different plan",
  too_expensive: "Too expensive",
  other: "Other",
};

export function isRefundReasonCode(value: string): value is RefundReasonCode {
  return REFUND_REASON_OPTIONS.some((option) => option.value === value);
}

export function labelForRefundReason(reason: string): string {
  if (isRefundReasonCode(reason)) return REFUND_REASON_LABELS[reason];
  return reason;
}

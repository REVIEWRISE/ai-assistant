"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/lib/toast";
import type { BillingCatalogError } from "@/lib/billing-catalog-types";

const ERROR_TOASTS: Record<
  BillingCatalogError,
  { title: string; description: string }
> = {
  not_configured: {
    title: "Billing API key missing",
    description:
      "Set BILLING_API_KEY and BILLING_API_URL to load plans from the billing microservice.",
  },
  unavailable: {
    title: "Billing service unavailable",
    description:
      "Could not load plans from the billing microservice. Check BILLING_API_URL, the API key, and that billing is running.",
  },
  product_missing: {
    title: "Billing product not found",
    description:
      "No product matched BILLING_PRODUCT_NAME. Confirm the product exists in Billing Admin.",
  },
  empty: {
    title: "No billing plans yet",
    description: "Add plans for this product in Billing Admin, then refresh this page.",
  },
};

export function BillingPlansToasts({ error }: { error: BillingCatalogError | null }) {
  const lastToast = useRef<string | null>(null);

  useEffect(() => {
    if (!error || error === lastToast.current) return;
    lastToast.current = error;
    const message = ERROR_TOASTS[error];
    toast.warning(message.title, { description: message.description });
  }, [error]);

  return null;
}

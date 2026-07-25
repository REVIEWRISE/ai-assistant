"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
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

const successMessages: Record<string, string> = {
  created: "Module created.",
  updated: "Module updated.",
  deleted: "Module deleted.",
  plan_updated: "Plan updated.",
  plan_created: "Plan created.",
};

const actionErrorMessages: Record<string, string> = {
  invalid: "Check the module key and display name, then try again.",
  duplicate: "A module with that key already exists.",
  create_failed: "The module could not be created.",
  update_failed: "The module could not be updated.",
  delete_failed: "The module could not be deleted.",
  plan_invalid: "Check the plan name and prices, then try again.",
  plan_update_failed: "The plan could not be updated.",
  plan_create_failed: "The plan could not be created in Billing.",
  not_configured: "Set BILLING_API_KEY before managing billing.",
  product_missing: "No product matched BILLING_PRODUCT_NAME.",
};

export function BillingPlansToasts({ error }: { error: BillingCatalogError | null }) {
  const searchParams = useSearchParams();
  const lastToast = useRef<string | null>(null);

  useEffect(() => {
    if (!error || error === lastToast.current) return;
    lastToast.current = error;
    const message = ERROR_TOASTS[error];
    toast.warning(message.title, { description: message.description });
  }, [error]);

  useEffect(() => {
    const success = searchParams.get("success");
    const actionError = searchParams.get("error");
    const key = success ? `success:${success}` : actionError ? `error:${actionError}` : null;
    if (!key || key === lastToast.current) return;
    lastToast.current = key;

    if (success && successMessages[success]) {
      toast.success(successMessages[success]);
      return;
    }
    if (actionError && actionErrorMessages[actionError]) {
      toast.error(actionErrorMessages[actionError]);
    }
  }, [searchParams]);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

const successMessages: Record<string, string> = {
  created: "Provider created successfully.",
  updated: "Provider updated successfully.",
  deleted: "Provider removed successfully.",
};

const errorMessages: Record<string, string> = {
  missing: "Please provide a provider name.",
  exists: "That provider already exists.",
  invalid_json: "Config must be valid JSON.",
  delete_failed: "Unable to delete that provider.",
  unknown: "Something went wrong. Try again.",
};

export function ProvidersToasts() {
  const searchParams = useSearchParams();
  const lastToast = useRef<string | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const key = success ? `success:${success}` : error ? `error:${error}` : null;
    if (!key || key === lastToast.current) return;
    lastToast.current = key;

    if (success && successMessages[success]) {
      toast.success(successMessages[success]);
      return;
    }
    if (error && errorMessages[error]) {
      toast.error(errorMessages[error]);
    }
  }, [searchParams]);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

const successMessages: Record<string, string> = {
  created: "Permission added successfully.",
  updated: "Permission updated successfully.",
  deleted: "Permission removed successfully.",
};

const errorMessages: Record<string, string> = {
  missing: "Please complete all required fields.",
  exists: "That permission already exists.",
  invalid_member: "The selected user is not a member of that organization.",
  delete_failed: "Unable to delete that permission.",
  unknown: "Something went wrong. Try again.",
};

export function PermissionsToasts() {
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

"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

const successMessages: Record<string, string> = {
  created: "User created successfully.",
  updated: "User updated successfully.",
  deleted: "User removed successfully.",
};

const errorMessages: Record<string, string> = {
  missing: "Please fill in all required fields.",
  exists: "That email is already in use.",
  delete_failed: "Unable to delete that user.",
  unknown: "Something went wrong. Try again.",
  weak_password:
    "Password must be at least 12 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.",
  weak_password_personal: "Password must not contain the user's name or email address.",
};

export function UsersToasts() {
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

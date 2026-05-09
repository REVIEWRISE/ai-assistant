"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

const successMessages: Record<string, string> = {
  login: "Welcome back.",
  register: "Account created successfully.",
};

export function AuthSuccessToasts() {
  const searchParams = useSearchParams();
  const lastToast = useRef<string | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    if (!success || !successMessages[success]) return;

    const key = `success:${success}`;
    if (lastToast.current === key) return;
    lastToast.current = key;

    toast.success(successMessages[success]);
  }, [searchParams]);

  return null;
}

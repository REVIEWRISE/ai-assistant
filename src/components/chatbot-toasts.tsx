"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

type ToastKey = string | null;

const successMessages: Record<string, string> = {
  saved: "Chatbot settings saved.",
  crm_saved: "CRM integration saved.",
  voice_saved: "Voice booking settings saved.",
};

const errorMessages: Record<string, string> = {
  organization_required: "Please select an organization to configure its chatbot.",
  chatbot_not_found: "That chatbot configuration could not be found.",
  invalid_theme: "Select a valid chatbot theme.",
  invalid_position: "Select a valid chatbot position.",
};

export function ChatbotToasts() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lastToast = useRef<ToastKey>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const key = success ? `success:${success}` : error ? `error:${error}` : null;

    if (!key || key === lastToast.current) return;
    lastToast.current = key;

    if (success && successMessages[success]) {
      toast.success(successMessages[success]);
    } else if (error && errorMessages[error]) {
      toast.error(errorMessages[error]);
    }

    // Clean up parameters from the URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("success");
    params.delete("error");
    const query = params.toString();
    router.replace(query ? `/appointments/chatbot?${query}` : "/appointments/chatbot", { scroll: false });
  }, [searchParams, router]);

  return null;
}

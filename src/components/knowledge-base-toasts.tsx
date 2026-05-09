"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

const successMessages: Record<string, string> = {
  kb_imported_website: "Website content imported as draft.",
  kb_imported_text: "Business notes imported as draft.",
  kb_imported_file: "File imported as draft.",
  kb_appended: "Additional notes merged into your knowledge draft.",
  kb_approved: "Knowledge base approved for AI usage.",
  kb_cleared: "Knowledge base cleared successfully.",
};

const errorMessages: Record<string, string> = {
  organization_required: "Select an active organization first.",
  organization_context_missing: "Missing organization context in request.",
  organization_context_mismatch: "Active organization changed. Please retry import.",
  kb_missing_url: "Please provide a website URL.",
  kb_invalid_url: "Website URL is invalid.",
  kb_website_fetch: "Could not fetch website content.",
  kb_website_empty: "Website content could not be extracted.",
  kb_missing_text: "Please paste business notes.",
  kb_missing_supplement: "Please enter notes to add before saving.",
  kb_missing_file: "Please choose a file to upload.",
  kb_file_read: "File could not be read.",
  kb_file_empty: "Uploaded file has no readable text.",
  kb_missing: "No knowledge base draft found.",
};

export function KnowledgeBaseToasts() {
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

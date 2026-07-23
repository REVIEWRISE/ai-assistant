"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

const messages: Record<string, { title: string; variant: "success" | "error" }> = {
  retell_saved: { title: "Agent settings saved locally.", variant: "success" },
  retell_saved_synced: { title: "Agent settings saved and synced.", variant: "success" },
  retell_created: { title: "Voice agent created for this organization.", variant: "success" },
  retell_imported: { title: "Agent settings imported.", variant: "success" },
  phone_saved: { title: "Phone settings saved.", variant: "success" },
  phone_saved_synced: { title: "Phone settings saved and linked to your voice agent.", variant: "success" },
  phone_bought: { title: "New phone number purchased and linked.", variant: "success" },
  phone_linked: { title: "Phone number linked to your voice agent.", variant: "success" },
  phone_assigned: { title: "Phone number assigned to your voice agent.", variant: "success" },
  phone_primary_set: { title: "Primary support line updated.", variant: "success" },
  phone_refreshed: { title: "Phone numbers refreshed.", variant: "success" },
  knowledge_saved: { title: "Knowledge settings saved locally.", variant: "success" },
  knowledge_saved_synced: { title: "Knowledge settings saved and synced.", variant: "success" },
  knowledge_created: { title: "Voice agent created with your knowledge settings.", variant: "success" },
  organization_required: { title: "Select an organization to configure the voice agent.", variant: "error" },
  voice_agent_read_only: { title: "Admins have view-only access to voice operations.", variant: "error" },
  phone_required_for_agent: {
    title: "Add and save a support phone number before configuring the agent.",
    variant: "error",
  },
  retell_sync_failed: { title: "Voice agent sync failed.", variant: "error" },
};

export function VoiceAgentPageAlerts({
  statusMessage,
}: {
  statusMessage?: string | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lastToast = useRef<string | null>(null);
  const lastStatusToast = useRef<string | null>(null);

  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const detail = searchParams.get("detail");
  const key = success ? `success:${success}` : error ? `error:${error}` : null;
  const message = success ? messages[success] : error ? messages[error] : null;

  useEffect(() => {
    if (!statusMessage || lastStatusToast.current === statusMessage) return;
    lastStatusToast.current = statusMessage;
    toast.warning("Voice agent needs attention", {
      description: statusMessage,
    });
  }, [statusMessage]);

  useEffect(() => {
    if (!key || key === lastToast.current || !message) return;
    lastToast.current = key;
    const toastText =
      error === "retell_sync_failed" && detail
        ? `${message.title} ${detail}`
        : message.title;
    if (message.variant === "success") toast.success(toastText);
    else toast.error(toastText);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("success");
    params.delete("error");
    params.delete("detail");
    const query = params.toString();
    router.replace(query ? `/voice-agent?${query}` : "/voice-agent", { scroll: false });
  }, [key, message, router, searchParams, success, error, detail]);

  if (!message || message.variant === "success") return null;

  const body =
    error === "retell_sync_failed" && detail ? detail : null;

  return (
    <section role="status" className="vr-app-alert vr-app-alert-danger shadow-sm lg:px-5">
      <p className="text-sm font-semibold">{message.title}</p>
      {body ? <p className="mt-1 text-sm opacity-90">{body}</p> : null}
      {error === "organization_required" ? (
        <Link
          href="/appointments/organization"
          className="mt-2 inline-block text-sm font-semibold underline"
        >
          Set up organization
        </Link>
      ) : null}
    </section>
  );
}

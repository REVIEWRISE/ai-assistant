"use client";

import { useEffect, useState } from "react";
import { ChatbotEmbedFrame } from "@/components/chatbot-embed-frame";

/** Demo org for landing-page appointment agent preview (Vyntrise Technologies). */
const LANDING_DEMO_ORGANIZATION_ID = "03f97b83-0856-45df-b494-5d50db8368d9";

/** Floating booking chatbot on the marketing home page. */
export function LandingChatbotDemo() {
  const [embedSrc, setEmbedSrc] = useState("");

  useEffect(() => {
    const origin = window.location.origin.replace(/\/$/, "");
    setEmbedSrc(
      `${origin}/embed/chatbot?org=${encodeURIComponent(LANDING_DEMO_ORGANIZATION_ID)}`,
    );
  }, []);

  if (!embedSrc) return null;

  const iframeId = `ai-assistant-chatbot-${LANDING_DEMO_ORGANIZATION_ID.slice(0, 8)}`;

  return <ChatbotEmbedFrame iframeId={iframeId} src={embedSrc} />;
}

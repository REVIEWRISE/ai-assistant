"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CHATBOT_EMBED_IFRAME_OPEN } from "@/lib/chatbot-embed-layout";

type ChatbotEmbedFrameProps = {
  iframeId: string;
  src: string;
};

export function ChatbotEmbedFrame({ iframeId, src }: ChatbotEmbedFrameProps) {
  const pathname = usePathname() ?? "";
  const isEmbedHost = pathname === "/embed" || pathname.startsWith("/embed/");

  useEffect(() => {
    if (isEmbedHost) return;
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (!iframe) return;

    const onMessage = (event: MessageEvent) => {
      if (!event.data || event.source !== iframe.contentWindow) return;
      if (event.data.type !== "ai-assistant-chatbot-state") return;
      const open = Boolean(event.data.open);
      iframe.style.width = open ? CHATBOT_EMBED_IFRAME_OPEN.width : "80px";
      iframe.style.height = open ? CHATBOT_EMBED_IFRAME_OPEN.height : "80px";
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeId, isEmbedHost]);

  if (isEmbedHost) return null;

  return (
    <iframe
      id={iframeId}
      src={src}
      title="Booking assistant"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        width: 80,
        height: 80,
        maxWidth: "calc(100vw - 32px)",
        border: 0,
        background: "transparent",
        zIndex: 2147483647,
      }}
      loading="lazy"
    />
  );
}

"use client";

import { useMemo, useState } from "react";
import { FloatingBookingChatbot } from "@/components/floating-booking-chatbot";
import type { BookingFlowConfig } from "@/lib/chatbot-config";
import type { VoiceBookingConfig } from "@/lib/voice-booking";

type PreviewMode = "chat" | "voice";

type ChatbotWidgetPreviewProps = {
  organizationId: string;
  organizationName: string;
  welcomeMessage: string;
  themeColor: string;
  iconColor: string;
  bookingFlow: BookingFlowConfig;
  voiceBooking?: VoiceBookingConfig;
  defaultMode?: PreviewMode;
  showModeToggle?: boolean;
  className?: string;
};

export function ChatbotWidgetPreview({
  organizationId,
  organizationName,
  welcomeMessage,
  themeColor,
  iconColor,
  bookingFlow,
  voiceBooking,
  defaultMode = "chat",
  showModeToggle = true,
  className = "",
}: ChatbotWidgetPreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>(defaultMode);
  const voiceReady = Boolean(voiceBooking?.enabled && voiceBooking.customGreeting.trim());
  const canToggleVoice = showModeToggle && voiceReady;

  const previewKey = useMemo(
    () =>
      JSON.stringify({
        previewMode,
        welcomeMessage,
        themeColor,
        iconColor,
        voiceBooking,
        idleHelperText: bookingFlow.idleHelperText,
        quickActions: bookingFlow.quickActions,
        steps: bookingFlow.steps,
      }),
    [previewMode, welcomeMessage, themeColor, iconColor, voiceBooking, bookingFlow],
  );

  return (
    <div className={className}>
      {canToggleVoice ? (
        <div className="mb-3 flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
          <button
            type="button"
            onClick={() => setPreviewMode("chat")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              previewMode === "chat"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Chat preview
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode("voice")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              previewMode === "voice"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Voice preview
          </button>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-4 shadow-inner">
        <FloatingBookingChatbot
          key={previewKey}
          preview
          organizationId={organizationId}
          organizationName={organizationName}
          welcomeMessage={welcomeMessage}
          themeColor={themeColor}
          iconColor={iconColor}
          bookingFlow={bookingFlow}
          voiceBooking={voiceBooking}
          initialInteractionMode={canToggleVoice ? previewMode : "chat"}
        />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
        Interactive preview — same widget visitors see. Bookings and messages are not saved here.
      </p>
    </div>
  );
}

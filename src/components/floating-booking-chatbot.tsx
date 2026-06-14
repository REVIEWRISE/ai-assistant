"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  buildChatbotReply,
  parseBookingUtterance,
  normalizeCustomerEmail,
  pickServiceDescriptionFromGuidedAnswers,
  parsedBookingFromGuidedAnswers,
  stepIdIndicatesCustomerEmail,
  stepIdIndicatesCustomerName,
  stepIdIndicatesPartySize,
  type ParsedBookingUtterance,
} from "@/lib/parse-booking-utterance";
import { buildBookingFlowQaFromAnswers } from "@/lib/booking-flow-qa";
import {
  normalizeQuickActionsArray,
  type BookingFlowConfig,
  type BookingFlowOption,
  type BookingFlowStep,
} from "@/lib/chatbot-config";
import type { VoiceBookingConfig } from "@/lib/voice-booking";

export function BookingChatbotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  );
}

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
};

type BookingStepState = "idle" | "collecting" | "confirm";
type DynamicAnswers = Record<string, string | number>;

type FloatingBookingChatbotProps = {
  organizationId: string;
  organizationName: string;
  welcomeMessage: string;
  themeColor: string;
  iconColor: string;
  bookingFlow: BookingFlowConfig;
  voiceBooking?: VoiceBookingConfig;
};

function shouldMergeWithRecentBookingContext(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  const genericIntents = ["i want to book a table", "book a table", "book table", "reservation"];
  if (genericIntents.includes(t)) return false;
  return (
    /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(t) ||
    /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(t) ||
    /\bfor\s+\d{1,2}\b/i.test(t) ||
    /\bparty\s+of\s+\d{1,2}\b/i.test(t) ||
    /\bguests?\b/i.test(t)
  );
}

function stepLabel(step: BookingFlowStep, option: BookingFlowOption | number): string {
  if (typeof option === "number") return String(option);
  return option.label;
}

function stepValue(step: BookingFlowStep, option: BookingFlowOption | number): string | number {
  if (typeof option === "number") return option;
  return option.value;
}

function buildBookingPrompt(flow: BookingFlowConfig, answers: DynamicAnswers): string {
  const pickedService = pickServiceDescriptionFromGuidedAnswers(flow, answers);
  const parts: string[] = [pickedService ? `book ${pickedService}` : "book appointment"];

  for (const step of flow.steps) {
    const raw = String(answers[step.id] ?? "").trim();
    if (!raw) continue;
    const id = step.id.toLowerCase();
    const inputType =
      step.inputType === "datetime" ? "datetime" : step.inputType === "text" ? "text" : "options";

    if (inputType === "datetime") {
      const d = new Date(raw);
      const timePart = Number.isNaN(d.getTime())
        ? raw
        : new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(d);
      parts.push(`on ${timePart}`);
      continue;
    }

    if (stepIdIndicatesPartySize(id)) {
      const n = parseInt(raw.replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n) && n > 0) {
        parts.push(`for ${n} guests`);
      } else {
        parts.push(`for ${raw}`);
      }
      continue;
    }

    if (stepIdIndicatesCustomerName(id)) {
      parts.push(`name is ${raw}`);
      continue;
    }

    parts.push(raw);
  }

  return parts.join(" ");
}

function buildBookingSummary(flow: BookingFlowConfig, answers: DynamicAnswers): string {
  return flow.steps
    .map((step) => {
      const raw = String(answers[step.id] ?? "").trim();
      if (!raw) return "";
      if (step.inputType === "datetime") {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) {
          return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(d);
        }
      }
      return raw;
    })
    .filter(Boolean)
    .join(", ");
}

function isNameStep(step: BookingFlowStep): boolean {
  const question = step.question.toLowerCase();
  return (
    stepIdIndicatesCustomerName(step.id) ||
    /\b(your name|full name|name for the reservation)\b/.test(question)
  );
}

function pickCustomerNameFromAnswers(flow: BookingFlowConfig, answers: DynamicAnswers): string | null {
  for (const step of flow.steps) {
    if (!isNameStep(step)) continue;
    const value = String(answers[step.id] ?? "").trim();
    if (value) return value.slice(0, 200);
  }
  return null;
}

function isEmailStep(step: BookingFlowStep): boolean {
  const question = step.question.toLowerCase();
  return (
    step.inputType === "email" ||
    stepIdIndicatesCustomerEmail(step.id) ||
    /\b(your email|email address|contact email)\b/.test(question)
  );
}

function pickCustomerEmailFromAnswers(flow: BookingFlowConfig, answers: DynamicAnswers): string | null {
  for (const step of flow.steps) {
    if (!isEmailStep(step)) continue;
    const normalized = normalizeCustomerEmail(String(answers[step.id] ?? ""));
    if (normalized) return normalized;
  }
  return null;
}

function formatDateTimeValue(localIso: string): string {
  if (!localIso) return "";
  const d = new Date(localIso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function FloatingBookingChatbot({
  organizationId,
  organizationName,
  welcomeMessage,
  themeColor,
  iconColor,
  bookingFlow,
  voiceBooking,
}: FloatingBookingChatbotProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bookingStepState, setBookingStepState] = useState<BookingStepState>("idle");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [answers, setAnswers] = useState<DynamicAnswers>({});
  const [dateTimeDraft, setDateTimeDraft] = useState("");
  const [textDraft, setTextDraft] = useState("");
  const confirmSubmitLockRef = useRef(false);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome", role: "bot", text: welcomeMessage }]);

  const helperText = useMemo(() => {
    if (bookingStepState === "collecting") {
      const step = bookingFlow.steps[activeStepIndex];
      return step?.helperText || "Choose an option.";
    }
    if (bookingStepState === "confirm") return "Confirm your booking details.";
    return bookingFlow.idleHelperText || "Tap an option to start.";
  }, [bookingStepState, bookingFlow.steps, bookingFlow.idleHelperText, activeStepIndex]);

  const quickActions = useMemo(
    () => normalizeQuickActionsArray(bookingFlow.quickActions),
    [bookingFlow.quickActions],
  );

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "ai-assistant-chatbot-state", open }, "*");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  function pushUserMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", text: trimmed }]);
  }

  function pushBotMessage(text: string) {
    setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "bot", text }]);
  }

  async function handleSend(
    messageText: string,
    options?: {
      displayText?: string;
      mergeWithRecentContext?: boolean;
      /** When set (e.g. guided flow confirm), skip NLU on the message and use this payload for the API. */
      guidedParsed?: ParsedBookingUtterance;
    },
  ) {
    const trimmed = messageText.trim();
    if (!trimmed || sending) return;
    pushUserMessage(options?.displayText ?? trimmed);
    setSending(true);
    const reference = new Date();
    const previousUserTail = messages
      .filter((m) => m.role === "user")
      .slice(-5)
      .map((m) => m.text.trim())
      .filter(Boolean)
      .join(" ");
    const shouldMerge = options?.mergeWithRecentContext ?? shouldMergeWithRecentBookingContext(trimmed);
    const parseInput = previousUserTail && shouldMerge ? `${previousUserTail} ${trimmed}` : trimmed;
    const parsed =
      options?.guidedParsed ??
      parseBookingUtterance(parseInput, reference, bookingFlow.slotDurationMinutes);
    const history = [...messages, { id: `user-pending-${reference.getTime()}`, role: "user" as const, text: trimmed }]
      .slice(-10)
      .map((m) => ({ role: m.role, text: m.text }));
    try {
      const res = await fetch("/api/embed/chatbot/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          message: trimmed,
          customerName: pickCustomerNameFromAnswers(bookingFlow, answers),
          customerEmail:
            pickCustomerEmailFromAnswers(bookingFlow, answers) ?? parsed.customerEmail,
          history,
          ...(options?.guidedParsed != null
            ? { bookingFlowQa: buildBookingFlowQaFromAnswers(bookingFlow, answers) }
            : {}),
          parsed: {
            isBookingIntent: parsed.isBookingIntent,
            serviceDescription: parsed.serviceDescription,
            partySize: parsed.partySize,
            customerName: parsed.customerName,
            customerEmail: parsed.customerEmail,
            startTimeIso: parsed.startTime?.toISOString() ?? null,
            endTimeIso: parsed.endTime?.toISOString() ?? null,
          },
        }),
      });
      const data = (await res.json()) as { reply?: string; saved?: boolean };
      if (!res.ok) {
        pushBotMessage(typeof data.reply === "string" ? data.reply : "We couldn’t process that. Please try again or contact them directly.");
        return;
      }
      const reply = typeof data.reply === "string" ? data.reply : buildChatbotReply(parsed, Boolean(data.saved));
      pushBotMessage(reply);
    } catch {
      pushBotMessage("We couldn’t send that just now. Check your connection and try again, or contact them directly.");
    } finally {
      setSending(false);
    }
  }

  function resetBookingFlow() {
    setBookingStepState("idle");
    setActiveStepIndex(0);
    setAnswers({});
    setDateTimeDraft("");
    setTextDraft("");
  }

  async function handleAction(action: string) {
    if (sending) return;
    if (bookingStepState === "idle") {
      const entry = quickActions.find((q) => q.label === action);
      const startGuidedBooking =
        bookingFlow.steps.length > 0 && Boolean(entry?.startsBookingFlow);
      if (startGuidedBooking) {
        pushUserMessage(action);
        pushBotMessage(bookingFlow.steps[0]?.question || "When would you like to come?");
        setBookingStepState("collecting");
        setActiveStepIndex(0);
        setAnswers({});
        return;
      }
      await handleSend(action, { mergeWithRecentContext: false });
      return;
    }
    if (bookingStepState === "collecting") {
      const step = bookingFlow.steps[activeStepIndex];
      if (!step) return resetBookingFlow();
      if (action === "Back to menu") {
        pushUserMessage(action);
        pushBotMessage("No problem. What would you like to do?");
        resetBookingFlow();
        return;
      }
      if (step.inputType === "datetime" || step.inputType === "text" || step.inputType === "email")
        return;
      const selectedOption = step.options.find((opt) => stepLabel(step, opt) === action);
      if (selectedOption == null) return;
      pushUserMessage(stepLabel(step, selectedOption));
      const nextAnswers = { ...answers, [step.id]: stepValue(step, selectedOption) };
      setAnswers(nextAnswers);
      const nextIndex = activeStepIndex + 1;
      if (nextIndex >= bookingFlow.steps.length) {
        pushBotMessage(`Confirm booking: ${buildBookingSummary(bookingFlow, nextAnswers)}?`);
        setBookingStepState("confirm");
      } else {
        setActiveStepIndex(nextIndex);
        pushBotMessage(bookingFlow.steps[nextIndex].question);
      }
      return;
    }
    if (action === "Confirm booking") {
      if (confirmSubmitLockRef.current) return;
      confirmSubmitLockRef.current = true;
      try {
        await handleSend(buildBookingPrompt(bookingFlow, answers), {
          displayText: `Confirm booking (${buildBookingSummary(bookingFlow, answers)})`,
          mergeWithRecentContext: false,
          guidedParsed: parsedBookingFromGuidedAnswers(
            bookingFlow,
            answers,
            bookingFlow.slotDurationMinutes,
          ),
        });
        resetBookingFlow();
      } finally {
        confirmSubmitLockRef.current = false;
      }
      return;
    }
    if (action === "Change details") {
      pushUserMessage(action);
      setAnswers({});
      setActiveStepIndex(0);
      if (bookingFlow.steps.length === 0) {
        pushBotMessage("No guided steps are configured. Send a message with what you would like to change.");
        resetBookingFlow();
        return;
      }
      setBookingStepState("collecting");
      pushBotMessage(bookingFlow.steps[0]?.question || "When would you like to come?");
      return;
    }
    if (action === "Cancel") {
      pushUserMessage(action);
      pushBotMessage("No problem. Let me know whenever you're ready.");
      resetBookingFlow();
    }
  }

  async function handleManualSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput("");
    await handleSend(trimmed, { mergeWithRecentContext: true });
  }

  function handleDateTimePick() {
    if (sending) return;
    const step = bookingFlow.steps[activeStepIndex];
    if (!step || step.inputType !== "datetime") return;
    const formatted = formatDateTimeValue(dateTimeDraft);
    if (!formatted) return;
    pushUserMessage(formatted);
    const nextAnswers = { ...answers, [step.id]: dateTimeDraft };
    setAnswers(nextAnswers);
    const nextIndex = activeStepIndex + 1;
    if (nextIndex >= bookingFlow.steps.length) {
      pushBotMessage(`Confirm booking: ${buildBookingSummary(bookingFlow, nextAnswers)}?`);
      setBookingStepState("confirm");
    } else {
      setActiveStepIndex(nextIndex);
      setDateTimeDraft("");
      pushBotMessage(bookingFlow.steps[nextIndex].question);
    }
  }

  function handleTextPick() {
    if (sending) return;
    const step = bookingFlow.steps[activeStepIndex];
    if (!step || (step.inputType !== "text" && step.inputType !== "email")) return;
    const value = textDraft.trim();
    if (!value) return;
    if (step.inputType === "email" && !normalizeCustomerEmail(value)) {
      pushBotMessage("Please enter a valid email address (for example you@example.com).");
      return;
    }
    pushUserMessage(value);
    const nextAnswers = { ...answers, [step.id]: value };
    setAnswers(nextAnswers);
    const nextIndex = activeStepIndex + 1;
    if (nextIndex >= bookingFlow.steps.length) {
      pushBotMessage(`Confirm booking: ${buildBookingSummary(bookingFlow, nextAnswers)}?`);
      setBookingStepState("confirm");
    } else {
      setActiveStepIndex(nextIndex);
      setTextDraft("");
      pushBotMessage(bookingFlow.steps[nextIndex].question);
    }
  }

  const actionButtons = useMemo(() => {
    if (bookingStepState === "collecting") {
      const step = bookingFlow.steps[activeStepIndex];
      if (!step) return ["Back to menu"];
      if (
        step.inputType === "datetime" ||
        step.inputType === "text" ||
        step.inputType === "email"
      ) {
        return ["Back to menu"];
      }
      return [...step.options.map((opt) => stepLabel(step, opt)), "Back to menu"];
    }
    if (bookingStepState === "confirm") return ["Confirm booking", "Change details", "Cancel"];
    return quickActions.map((q) => q.label);
  }, [bookingStepState, bookingFlow.steps, activeStepIndex, quickActions]);

  return (
    <div
      className="chatbot-widget fixed bottom-5 right-5 z-40 text-[var(--color-text)]"
      data-voice-booking={voiceBooking?.enabled ? "true" : "false"}
      data-voice-agent={voiceBooking?.agentName || undefined}
      style={
        {
          "--chat-accent": themeColor,
          "--chat-accent-fg": iconColor,
        } as CSSProperties
      }
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open booking assistant"
          style={{ backgroundColor: "var(--chat-accent)", color: "var(--chat-accent-fg)" }}
          className="flex h-14 w-14 items-center justify-center rounded-full shadow-[var(--shadow-lg)] ring-4 ring-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] transition hover:scale-[1.04] hover:brightness-105 active:scale-[0.98]"
        >
          <BookingChatbotIcon className="h-6 w-6" />
        </button>
      ) : (
        <div className="relative flex h-[min(88dvh,700px)] max-h-[min(88dvh,700px)] w-[380px] flex-col overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-border))]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_90%_70%_at_50%_-20%,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent)]"
            aria-hidden
          />
          <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                style={{
                  backgroundColor: "var(--chat-accent)",
                  color: "var(--chat-accent-fg)",
                  boxShadow: "var(--shadow-sm)",
                }}
                className="box-border flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-[color-mix(in_srgb,var(--chat-accent)_20%,var(--color-border))]"
              >
                <BookingChatbotIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
                  Booking assistant
                </div>
                <p className="mt-1.5 truncate text-sm font-semibold tracking-tight text-[var(--color-text)]">
                  {organizationName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-xl p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>
          <div ref={messagesViewportRef} className="relative min-h-0 flex-1 overflow-y-auto border-b border-[var(--color-border-muted)] bg-[var(--color-bg)] px-4 py-4">
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "bot"
                      ? "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
                      : "ml-auto bg-[var(--chat-accent)] text-[var(--chat-accent-fg)] shadow-[var(--shadow-sm)] ring-1 ring-[color-mix(in_srgb,var(--chat-accent)_25%,transparent)]"
                  }`}
                >
                  {message.text}
                </div>
              ))}
              {sending ? (
                <div className="inline-flex w-fit max-w-[90%] self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center gap-1.5" aria-label="Assistant is typing">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-primary)] [animation-delay:240ms]" />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="relative shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 backdrop-blur-sm">
            <p className="mb-2.5 text-xs leading-relaxed text-[var(--color-text-muted)]">{helperText}</p>
            {bookingStepState === "collecting" &&
            bookingFlow.steps[activeStepIndex]?.inputType === "datetime" ? (
              <div className="mb-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-2.5">
                <label className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
                  Pick date and time
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={dateTimeDraft}
                    onChange={(e) => setDateTimeDraft(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]"
                  />
                  <button
                    type="button"
                    onClick={handleDateTimePick}
                    disabled={!dateTimeDraft || sending}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-[var(--chat-accent-fg)] disabled:opacity-50"
                    style={{ backgroundColor: "var(--chat-accent)" }}
                  >
                    Use
                  </button>
                </div>
              </div>
            ) : null}
            {bookingStepState === "collecting" &&
            (bookingFlow.steps[activeStepIndex]?.inputType === "text" ||
              bookingFlow.steps[activeStepIndex]?.inputType === "email") ? (
              <div className="mb-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-2.5">
                <label className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {bookingFlow.steps[activeStepIndex]?.inputType === "email"
                    ? "Your email"
                    : "Type your answer"}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={bookingFlow.steps[activeStepIndex]?.inputType === "email" ? "email" : "text"}
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleTextPick();
                      }
                    }}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]"
                    placeholder={
                      bookingFlow.steps[activeStepIndex]?.inputType === "email"
                        ? "you@example.com"
                        : "Type here..."
                    }
                  />
                  <button
                    type="button"
                    onClick={handleTextPick}
                    disabled={!textDraft.trim() || sending}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-[var(--chat-accent-fg)] disabled:opacity-50"
                    style={{ backgroundColor: "var(--chat-accent)" }}
                  >
                    Use
                  </button>
                </div>
              </div>
            ) : null}
            {bookingStepState === "idle" && actionButtons.length === 0 ? (
              <p className="mb-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                No quick-start buttons configured for this assistant.
              </p>
            ) : null}
            {bookingStepState === "idle" ? (
              <div className="mb-2.5 flex gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleManualSend();
                    }
                  }}
                  placeholder="Type a question..."
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-[var(--shadow-sm)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
                />
                <button
                  type="button"
                  onClick={() => void handleManualSend()}
                  disabled={sending || !input.trim()}
                  aria-label="Send message"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--chat-accent-fg)] shadow-[var(--shadow-md)] transition hover:brightness-105 disabled:opacity-50"
                  style={{ backgroundColor: "var(--chat-accent)" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22 11 13 2 9 22 2z" />
                  </svg>
                </button>
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-2">
              {actionButtons.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => void handleAction(action)}
                  disabled={sending}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-left text-sm text-[var(--color-text)] shadow-[var(--shadow-sm)] transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

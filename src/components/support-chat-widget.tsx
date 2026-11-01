"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getSupportChatTicket,
  sendSupportChatMessage,
  type SupportChatMessage,
  type SupportChatTicket,
} from "@/app/(protected)/support/actions";

const STORAGE_KEY = "support-chat-ticket-id";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function ChatBubble({ message }: { message: SupportChatMessage }) {
  const fromUser = message.authorRole === "user";
  const fromAi = message.authorRole === "ai";
  return (
    <div className={`flex ${fromUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
          fromUser
            ? "rounded-br-md bg-[var(--color-text)] text-[var(--color-bg)]"
            : fromAi
              ? "rounded-bl-md border border-violet-200/80 bg-violet-50/90 text-[var(--color-text)] [[data-theme=dark]_&]:border-violet-500/30 [[data-theme=dark]_&]:bg-violet-500/10"
              : "rounded-bl-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
        }`}
      >
        {!fromUser ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            {fromAi ? "AI assistant" : "Support"}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap">{message.body}</p>
        <time
          className={`mt-1 block text-[10px] ${
            fromUser ? "text-[var(--color-bg)]/70" : "text-[var(--color-text-muted)]"
          }`}
        >
          {formatTime(message.createdAt)}
        </time>
      </div>
    </div>
  );
}

export function SupportChatWidget({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState<SupportChatTicket | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [awaitingAi, setAwaitingAi] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const persistTicketId = useCallback((id: string | null) => {
    try {
      if (id) sessionStorage.setItem(STORAGE_KEY, id);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  }, []);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    try {
      let preferred: string | null = null;
      try {
        preferred = sessionStorage.getItem(STORAGE_KEY);
      } catch {
        preferred = null;
      }
      const result = await getSupportChatTicket(preferred);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTicket(result.ticket);
      persistTicketId(result.ticket?.id ?? null);
      const last = result.ticket?.messages[result.ticket.messages.length - 1];
      setAwaitingAi(Boolean(last && last.authorRole === "user"));
    } finally {
      setLoading(false);
    }
  }, [persistTicketId]);

  useEffect(() => {
    if (!enabled || !open) return;
    void loadTicket();
  }, [enabled, open, loadTicket]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [open, ticket?.messages.length, awaitingAi]);

  // Live AI / admin replies for the active chat ticket.
  useEffect(() => {
    if (!enabled || !open || !ticket?.id) return;
    const source = new EventSource(
      `/api/support/tickets/${encodeURIComponent(ticket.id)}/stream`,
    );

    const onTicket = () => {
      void (async () => {
        const result = await getSupportChatTicket(ticket.id);
        if (!result.ok || !result.ticket) return;
        setTicket(result.ticket);
        const last = result.ticket.messages[result.ticket.messages.length - 1];
        setAwaitingAi(Boolean(last && last.authorRole === "user"));
      })();
    };

    source.addEventListener("ticket", onTicket);
    return () => {
      source.removeEventListener("ticket", onTicket);
      source.close();
    };
  }, [enabled, open, ticket?.id]);

  if (!enabled) return null;

  function submit() {
    const text = draft.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const result = await sendSupportChatMessage(text, ticket?.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDraft("");
      setTicket(result.ticket);
      persistTicketId(result.ticket?.id ?? null);
      setAwaitingAi(true);
    });
  }

  function startNewChat() {
    persistTicketId(null);
    setTicket(null);
    setAwaitingAi(false);
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {open ? (
        <section
          className="pointer-events-auto flex h-[min(34rem,calc(100dvh-6.5rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
          aria-label="Support chat"
        >
          <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Support
              </p>
              <h2 className="truncate text-[15px] font-semibold text-[var(--color-text)]">
                Ask anything
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                AI answers first. Our team can follow up.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
              aria-label="Close support chat"
            >
              <span aria-hidden className="text-lg leading-none">
                ×
              </span>
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {loading && !ticket ? (
              <p className="px-1 py-6 text-center text-[12px] text-[var(--color-text-muted)]">
                Loading conversation…
              </p>
            ) : null}
            {!loading && (!ticket || ticket.messages.length === 0) ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-4 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
                Ask about billing, voice agent, knowledge base, or anything else on the
                platform. Your message opens a support request automatically.
              </div>
            ) : null}
            {ticket?.messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {awaitingAi ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[12px] text-[var(--color-text-muted)]">
                  Support AI is typing…
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Link
                href={ticket ? `/support/${ticket.id}` : "/support"}
                className="text-[11px] font-semibold text-[var(--color-primary-h)] hover:underline"
                onClick={() => setOpen(false)}
              >
                Open full Support
              </Link>
              {ticket ? (
                <button
                  type="button"
                  onClick={startNewChat}
                  className="text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  New chat
                </button>
              ) : null}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                rows={2}
                placeholder="Describe your issue…"
                disabled={pending}
                className="min-h-[2.75rem] max-h-28 flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={submit}
                disabled={pending || !draft.trim()}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl vr-btn-primary disabled:opacity-50"
                aria-label="Send message"
              >
                {pending ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
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
                )}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-[var(--color-text)] px-4 text-[13px] font-semibold text-[var(--color-bg)] shadow-[var(--shadow-lg)] transition hover:opacity-90"
        aria-expanded={open}
        aria-label={open ? "Close support chat" : "Open support chat"}
      >
        <span
          className="flex size-7 items-center justify-center rounded-full bg-[var(--color-bg)]/15 text-[11px] font-bold"
          aria-hidden
        >
          ?
        </span>
        <span className="pr-0.5">{open ? "Close" : "Help"}</span>
      </button>
    </div>
  );
}

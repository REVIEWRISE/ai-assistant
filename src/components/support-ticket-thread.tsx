"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  adminNextSupportStatuses,
  supportTicketStatusLabel,
  type SupportTicketStatus,
} from "@/lib/support-tickets";

export type SupportThreadMessage = {
  id: string;
  body: string;
  authorRole: string;
  createdAt: string;
  author: { id: string; fullName: string; email: string };
};

export type SupportThreadTicket = {
  id: string;
  subject: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  organization: { id: string; name: string };
  createdBy: { id: string; fullName: string; email: string };
  assignedTo: { id: string; fullName: string } | null;
  messages: SupportThreadMessage[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initialsFor(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function statusTone(status: string): { className: string; dot: string } {
  switch (status) {
    case "pending":
      return {
        className:
          "border-violet-200 bg-violet-50 text-violet-900 [[data-theme=dark]_&]:border-violet-500/35 [[data-theme=dark]_&]:bg-violet-500/20 [[data-theme=dark]_&]:text-violet-100",
        dot: "bg-violet-600 [[data-theme=dark]_&]:bg-violet-400",
      };
    case "in_progress":
      return {
        className:
          "border-amber-200 bg-amber-50 text-amber-950 [[data-theme=dark]_&]:border-amber-500/35 [[data-theme=dark]_&]:bg-amber-500/20 [[data-theme=dark]_&]:text-amber-100",
        dot: "bg-amber-600 [[data-theme=dark]_&]:bg-amber-400",
      };
    case "completed":
      return {
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-900 [[data-theme=dark]_&]:border-emerald-500/35 [[data-theme=dark]_&]:bg-emerald-500/20 [[data-theme=dark]_&]:text-emerald-100",
        dot: "bg-emerald-600 [[data-theme=dark]_&]:bg-emerald-400",
      };
    case "rejected":
      return {
        className:
          "border-red-200 bg-red-50 text-red-900 [[data-theme=dark]_&]:border-red-500/35 [[data-theme=dark]_&]:bg-red-500/20 [[data-theme=dark]_&]:text-red-100",
        dot: "bg-red-600 [[data-theme=dark]_&]:bg-red-400",
      };
    default:
      return {
        className:
          "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
        dot: "bg-[var(--color-text-muted)]",
      };
  }
}

const NEXT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  pending: "Pending",
  in_progress: "Mark in progress",
  completed: "Mark completed",
  rejected: "Reject request",
};

const NEXT_STATUS_HINTS: Record<SupportTicketStatus, string> = {
  pending: "",
  in_progress: "You’re actively working on this",
  completed: "Close as resolved",
  rejected: "Decline with a reason",
};

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function SupportTicketThread({
  ticket,
  mode,
  backHref,
  canReply,
  onReply,
  onStatusChange,
}: {
  ticket: SupportThreadTicket;
  mode: "user" | "admin";
  backHref: string;
  canReply: boolean;
  onReply: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
  onStatusChange?: (
    formData: FormData,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const menuId = useId();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const threadEndRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const tone = statusTone(ticket.status);
  const nextStatuses = mode === "admin" ? adminNextSupportStatuses(ticket.status) : [];
  const canChangeStatus = Boolean(onStatusChange) && nextStatuses.length > 0;

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [ticket.messages.length]);

  useEffect(() => {
    if (!statusMenuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!statusMenuRef.current?.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setStatusMenuOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [statusMenuOpen]);

  useEffect(() => {
    if (!rejectOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setRejectOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rejectOpen, pending]);

  function submitReply() {
    const formData = new FormData();
    formData.set("ticket_id", ticket.id);
    formData.set("body", body);
    startTransition(async () => {
      const result = await onReply(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBody("");
      toast.success("Message sent.");
      router.refresh();
    });
  }

  function submitStatus(next: SupportTicketStatus, extras?: { reason?: string; note?: string }) {
    if (!onStatusChange) return;
    if (next === "rejected" && (extras?.reason?.trim().length ?? 0) < 3) {
      toast.error("Add a rejection reason.");
      return;
    }
    const formData = new FormData();
    formData.set("ticket_id", ticket.id);
    formData.set("status", next);
    if (next === "rejected" && extras?.reason) {
      formData.set("rejection_reason", extras.reason.trim());
    }
    if (extras?.note?.trim()) formData.set("note", extras.note.trim());
    startTransition(async () => {
      const result = await onStatusChange(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setStatusMenuOpen(false);
      setRejectOpen(false);
      setRejectReason("");
      setRejectNote("");
      toast.success(`Status updated to ${supportTicketStatusLabel(next)}.`);
      router.refresh();
    });
  }

  function chooseStatus(next: SupportTicketStatus) {
    setStatusMenuOpen(false);
    if (next === "rejected") {
      setRejectReason("");
      setRejectNote("");
      setRejectOpen(true);
      return;
    }
    submitStatus(next);
  }

  const statusControl = canChangeStatus ? (
    <div className="relative shrink-0" ref={statusMenuRef}>
      <button
        type="button"
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={statusMenuOpen}
        aria-controls={menuId}
        onClick={() => setStatusMenuOpen((open) => !open)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:brightness-[0.98] disabled:opacity-50 ${tone.className}`}
      >
        <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
        {supportTicketStatusLabel(ticket.status)}
        <ChevronDown className="size-3.5 opacity-70" />
      </button>
      {statusMenuOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-lg)]"
        >
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            Move to
          </p>
          {nextStatuses.map((status) => (
            <button
              key={status}
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => chooseStatus(status)}
              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition hover:bg-[var(--color-bg)] disabled:opacity-50 ${
                status === "rejected"
                  ? "text-red-700 [[data-theme=dark]_&]:text-red-300"
                  : "text-[var(--color-text)]"
              }`}
            >
              <span className="text-[13px] font-semibold">{NEXT_STATUS_LABELS[status]}</span>
              {NEXT_STATUS_HINTS[status] ? (
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {NEXT_STATUS_HINTS[status]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ) : (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.className}`}
    >
      <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {supportTicketStatusLabel(ticket.status)}
    </span>
  );

  return (
    <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-[1.65rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-3 py-2.5 sm:px-4">
        <Link
          href={backHref}
          aria-label={`Back to ${mode === "admin" ? "inbox" : "requests"}`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
        >
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[14px] font-semibold text-[var(--color-text)]">
            {ticket.subject}
          </h1>
          <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
            {ticket.createdBy.fullName}
            <span className="mx-1.5 text-[var(--color-border)]">·</span>
            {ticket.organization.name}
          </p>
        </div>
        {statusControl}
      </div>

      {ticket.status === "rejected" && ticket.rejectionReason ? (
        <div className="border-b border-red-200/70 bg-red-50/80 px-4 py-3 text-[13px] text-red-900 sm:px-5 [[data-theme=dark]_&]:border-red-500/25 [[data-theme=dark]_&]:bg-red-500/[0.08] [[data-theme=dark]_&]:text-red-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Rejected</p>
          <p className="mt-1 leading-relaxed">{ticket.rejectionReason}</p>
        </div>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-0 overflow-y-auto px-4 py-2 sm:px-5">
          {ticket.messages.map((message, index) => {
            const fromAdmin = message.authorRole === "admin";
            const prev = ticket.messages[index - 1];
            const sameAuthor =
              prev &&
              prev.authorRole === message.authorRole &&
              prev.author.id === message.author.id;
            return (
              <article
                key={message.id}
                className={`flex gap-3 ${fromAdmin ? "" : "flex-row-reverse"} ${
                  sameAuthor ? "pt-1.5" : "pt-5"
                }`}
              >
                {sameAuthor ? (
                  <span className="w-9 shrink-0" aria-hidden />
                ) : (
                  <span
                    className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      fromAdmin
                        ? "bg-[var(--color-text)] text-[var(--color-bg)]"
                        : "bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
                    }`}
                    aria-hidden
                  >
                    {initialsFor(message.author.fullName)}
                  </span>
                )}
                <div
                  className={`flex min-w-0 max-w-[min(100%,28rem)] flex-col ${
                    fromAdmin ? "items-start" : "items-end"
                  }`}
                >
                  {!sameAuthor ? (
                    <div
                      className={`mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${
                        fromAdmin ? "" : "justify-end"
                      }`}
                    >
                      <p className="text-[13px] font-semibold text-[var(--color-text)]">
                        {message.author.fullName}
                      </p>
                      <span className="rounded-md bg-[var(--color-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                        {fromAdmin ? "Support" : mode === "user" ? "You" : "Requester"}
                      </span>
                      <time className="text-[11px] text-[var(--color-text-muted)]">
                        {formatDate(message.createdAt)}
                      </time>
                    </div>
                  ) : null}
                  <div
                    className={`w-fit max-w-full rounded-2xl px-3.5 py-2.5 text-left text-[13px] leading-relaxed ${
                      fromAdmin
                        ? "rounded-tl-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
                        : "rounded-tr-md bg-[var(--color-text)] text-[var(--color-bg)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                  </div>
                  {sameAuthor ? (
                    <time className="mt-1 block text-[10px] text-[var(--color-text-muted)]">
                      {formatDate(message.createdAt)}
                    </time>
                  ) : null}
                </div>
              </article>
            );
          })}
          <div ref={threadEndRef} className="h-4" />
        </div>

        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 sm:px-5">
          {canReply ? (
            <div className="flex items-end gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 shadow-[var(--shadow-sm)]">
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (!pending && body.trim()) submitReply();
                  }
                }}
                rows={1}
                maxLength={5000}
                placeholder={
                  mode === "admin" ? "Write a reply…" : "Write a follow-up…"
                }
                className="max-h-28 min-h-9 w-full resize-none bg-transparent px-1.5 py-1.5 text-[13px] leading-5 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
              <button
                type="button"
                disabled={pending || !body.trim()}
                onClick={submitReply}
                aria-label={pending ? "Sending" : "Send message"}
                title="Send"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg vr-btn-primary disabled:opacity-45"
              >
                {pending ? (
                  <span className="size-4 animate-pulse rounded-full bg-current/40" aria-hidden />
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
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
              This request is closed. Start a new request from Support if you still need help.
            </div>
          )}
        </div>
      </section>

      {rejectOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] p-4">
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Close reject dialog"
                onClick={() => {
                  if (!pending) setRejectOpen(false);
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="support-reject-title"
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]"
              >
                <div className="border-b border-[var(--color-border)] px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    Update status
                  </p>
                  <h2
                    id="support-reject-title"
                    className="mt-1 text-lg font-semibold text-[var(--color-text)]"
                  >
                    Reject request
                  </h2>
                  <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                    Tell the requester why this can’t move forward.
                  </p>
                </div>
                <div className="space-y-3 px-5 py-4">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-muted)]">
                      Rejection reason
                    </span>
                    <textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={4}
                      maxLength={2000}
                      autoFocus
                      placeholder="Required…"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-text)]/30"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-muted)]">
                      Optional note in thread
                    </span>
                    <textarea
                      value={rejectNote}
                      onChange={(event) => setRejectNote(event.target.value)}
                      rows={2}
                      maxLength={5000}
                      placeholder="Posted as a support message…"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-text)]/30"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3.5">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setRejectOpen(false)}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-[13px] font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pending || rejectReason.trim().length < 3}
                    onClick={() =>
                      submitStatus("rejected", {
                        reason: rejectReason,
                        note: rejectNote,
                      })
                    }
                    className="rounded-xl border border-red-200 bg-red-600 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 [[data-theme=dark]_&]:border-red-500/40"
                  >
                    {pending ? "Rejecting…" : "Reject request"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function SupportStatusBadge({ status }: { status: string }): ReactNode {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.className}`}
    >
      <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {supportTicketStatusLabel(status)}
    </span>
  );
}

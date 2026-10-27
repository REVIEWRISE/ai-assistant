"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/data-table";
import { SupportStatusBadge } from "@/components/support-ticket-thread";
import type { SupportTicketStatus } from "@/lib/support-tickets";

export type SupportTicketListItem = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  organization: { id: string; name: string };
  createdBy: { id: string; fullName: string; email: string };
  unread: boolean;
};

type StatusFilter = "all" | SupportTicketStatus;

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "rejected", label: "Rejected" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function SupportTicketsPanel({
  tickets,
  mode,
  detailBasePath,
  onCreate,
}: {
  tickets: SupportTicketListItem[];
  mode: "user" | "admin";
  detailBasePath: string;
  onCreate?: (formData: FormData) => Promise<
    { ok: true; ticketId?: string } | { ok: false; error: string }
  >;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>(mode === "admin" ? "pending" : "all");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const counts = useMemo(() => {
    const next: Record<StatusFilter, number> = {
      all: tickets.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
      rejected: 0,
    };
    for (const ticket of tickets) {
      if (ticket.status in next) {
        next[ticket.status as SupportTicketStatus] += 1;
      }
    }
    return next;
  }, [tickets]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (filter !== "all" && ticket.status !== filter) return false;
      if (!q) return true;
      return (
        ticket.subject.toLowerCase().includes(q) ||
        ticket.organization.name.toLowerCase().includes(q) ||
        ticket.createdBy.fullName.toLowerCase().includes(q) ||
        ticket.createdBy.email.toLowerCase().includes(q)
      );
    });
  }, [tickets, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const rows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, safePage, perPage]);

  function openSheet() {
    setSubject("");
    setBody("");
    setEntered(false);
    setSheetOpen(true);
  }

  function closeSheet() {
    if (pending) return;
    setSheetOpen(false);
    setEntered(false);
  }

  useEffect(() => {
    if (!sheetOpen) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        setSheetOpen(false);
        setEntered(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sheetOpen, pending]);

  function submitCreate() {
    if (!onCreate) return;
    const formData = new FormData();
    formData.set("subject", subject);
    formData.set("body", body);
    startTransition(async () => {
      const result = await onCreate(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Support request submitted.");
      setSubject("");
      setBody("");
      setSheetOpen(false);
      router.refresh();
    });
  }

  return (
    <div>
      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--color-border)] px-4 py-4 lg:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                {mode === "admin" ? "Inbox" : "Requests"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">
                  {mode === "admin" ? "Support requests" : "Your support requests"}
                </h2>
                <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
                  {filteredRows.length}
                  {filteredRows.length !== tickets.length ? ` of ${tickets.length}` : ""} shown
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
                {mode === "admin"
                  ? "Filter by status and open a request to reply or update the workflow."
                  : "Track open conversations and submit a new request when you need help."}
              </p>
            </div>
            {mode === "user" && onCreate ? (
              <button
                type="button"
                onClick={openSheet}
                className="rounded-xl vr-btn-primary px-3.5 py-2.5 text-[13px] font-semibold"
              >
                New request
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">
          <div
            className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
            role="tablist"
            aria-label="Filter by support status"
          >
            {FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setFilter(item.id);
                    setCurrentPage(1);
                  }}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[var(--color-bg)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 text-[10px] tabular-nums opacity-70">
                    {counts[item.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="relative block min-w-0 sm:w-72">
            <span className="sr-only">Search support requests</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                mode === "admin"
                  ? "Search workspace, requester…"
                  : "Search subject or workspace…"
              }
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-3 pr-3 text-sm text-[var(--color-text)] outline-none ring-[var(--color-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2"
            />
          </label>
        </div>

        <div className="overflow-x-auto bg-[var(--color-bg)]">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                <th className="px-4 py-3 lg:px-5">Request</th>
                {mode === "admin" ? <th className="px-4 py-3">Requester</th> : null}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 lg:px-5">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={mode === "admin" ? 5 : 4}
                    className="px-4 py-14 text-center lg:px-5"
                  >
                    <p className="text-sm font-semibold text-[var(--color-text)]">No requests here</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {mode === "user"
                        ? "Open a new request when you need help from the team."
                        : "Incoming support requests will show up in this inbox."}
                    </p>
                    {mode === "user" && onCreate ? (
                      <button
                        type="button"
                        onClick={openSheet}
                        className="mt-4 rounded-xl vr-btn-primary px-3.5 py-2 text-[13px] font-semibold"
                      >
                        New request
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                rows.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface)] ${
                      ticket.unread ? "bg-[var(--color-primary-soft)]/35" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 lg:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold text-[var(--color-primary-h)]">
                          {initialsFor(
                            mode === "admin"
                              ? ticket.organization.name
                              : ticket.subject,
                          )}
                          {ticket.unread ? (
                            <span
                              className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--color-primary)] ring-2 ring-[var(--color-bg)]"
                              aria-hidden
                            />
                          ) : null}
                        </span>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p
                              className={`truncate ${
                                ticket.unread
                                  ? "font-bold text-[var(--color-text)]"
                                  : "font-semibold text-[var(--color-text)]"
                              }`}
                            >
                              {ticket.subject}
                            </p>
                            {ticket.unread ? (
                              <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-fg)]">
                                Unread
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                            {ticket.organization.name} · Opened {formatDate(ticket.createdAt)}
                          </p>
                        </div>
                      </div>
                    </td>
                    {mode === "admin" ? (
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[var(--color-text)]">
                          {ticket.createdBy.fullName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                          {ticket.createdBy.email}
                        </p>
                      </td>
                    ) : null}
                    <td className="px-4 py-3.5">
                      <SupportStatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-text-muted)]">
                      {formatDate(ticket.updatedAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right lg:px-5">
                      <Link
                        href={`${detailBasePath}/${ticket.id}`}
                        aria-label={`View ${ticket.subject}`}
                        title="View request"
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                      >
                        <EyeIcon className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          totalItems={filteredRows.length}
          currentPage={safePage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={setCurrentPage}
          onPerPageChange={(size) => {
            setPerPage(size);
            setCurrentPage(1);
          }}
          itemLabel="requests"
        />
      </section>

      {sheetOpen && onCreate
        ? createPortal(
            <div
              className={`fixed inset-0 z-50 flex justify-end transition-colors duration-200 ${
                entered ? "bg-[var(--color-overlay)]" : "bg-transparent"
              }`}
            >
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Close request sheet"
                onClick={closeSheet}
              />
              <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="support-request-sheet-title"
                className={`relative flex h-full w-full max-w-lg flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)] transition-transform duration-300 ease-out ${
                  entered ? "translate-x-0" : "translate-x-full"
                }`}
              >
                <header className="relative shrink-0 overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#0c0c0c_0%,#161616_55%,#222222_100%)] px-5 pb-5 pt-5 text-white">
                  <div
                    className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-white/10 blur-3xl"
                    aria-hidden
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                        Support
                      </p>
                      <h2
                        id="support-request-sheet-title"
                        className="mt-1 text-xl font-semibold tracking-tight text-white"
                      >
                        New request
                      </h2>
                      <p className="mt-1 text-sm text-neutral-400">
                        Tell us what you need help with. The team will reply in-thread.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeSheet}
                      disabled={pending}
                      className="rounded-lg px-2 py-1 text-lg leading-none text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                </header>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-[var(--color-text-muted)]">
                      Subject
                    </span>
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      maxLength={160}
                      autoFocus
                      placeholder="Short summary"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none ring-[var(--color-primary)] focus:ring-2"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-[var(--color-text-muted)]">
                      Details
                    </span>
                    <textarea
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      rows={8}
                      maxLength={5000}
                      placeholder="Include workspace context, what you tried, and what you need…"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none ring-[var(--color-primary)] focus:ring-2"
                    />
                  </label>
                </div>

                <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={closeSheet}
                      disabled={pending}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={pending || !subject.trim() || body.trim().length < 10}
                      onClick={submitCreate}
                      className="rounded-xl vr-btn-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                    >
                      {pending ? "Submitting…" : "Submit request"}
                    </button>
                  </div>
                </footer>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

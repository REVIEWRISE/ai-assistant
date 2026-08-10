"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  DataTable,
  DataTableBody,
  DataTableEmptyState,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/data-table";

type TranscriptTurn = {
  role?: string;
  content?: string;
};

export type CallItem = {
  id: string;
  callId: string;
  agentId: string;
  callStatus: string;
  direction: string;
  fromNumber: string | null;
  toNumber: string | null;
  durationSeconds: number;
  recordingUrl: string | null;
  summary: string | null;
  sentiment: string | null;
  transcript: unknown;
  createdAt: string;
};

const tableGridClass =
  "grid-cols-[140px_130px_90px_100px_minmax(0,1fr)_88px]";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getSentimentTone(sentiment: string | null): string {
  const s = (sentiment || "").toLowerCase().trim();
  if (s === "positive" || s === "friendly") return "vr-app-status-success";
  if (s === "negative" || s === "frustrated") return "vr-app-status-danger";
  return "vr-app-status-warning";
}

function formatPhoneNumber(num: string | null): string {
  if (!num) return "—";
  return num;
}

function formatCallWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CallDetailsSheet({
  call,
  onClose,
}: {
  call: CallItem;
  onClose: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const callerNumber =
    call.direction === "inbound"
      ? formatPhoneNumber(call.fromNumber)
      : formatPhoneNumber(call.toNumber);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-200 ${
        entered ? "bg-[var(--color-overlay)]" : "bg-transparent"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-details-title"
        className={`relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] transition-transform duration-300 ease-out sm:max-w-lg ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="relative shrink-0 overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#0c0c0c_0%,#161616_55%,#222222_100%)] px-5 pb-5 pt-5 text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Call details
              </p>
              <h3
                id="call-details-title"
                className="mt-1 text-xl font-semibold tracking-tight text-white capitalize"
              >
                {call.direction} call
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                  {formatCallWhen(call.createdAt)}
                </span>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getSentimentTone(call.sentiment)}`}
                >
                  {call.sentiment || "neutral"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-lg leading-none text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Overview
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[var(--color-border)]">
              <div className="bg-[var(--color-surface)] px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Duration
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">
                  {formatDuration(call.durationSeconds)}
                </p>
              </div>
              <div className="bg-[var(--color-surface)] px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Caller
                </p>
                <p className="mt-1.5 truncate font-mono text-sm font-semibold text-[var(--color-text)]">
                  {callerNumber}
                </p>
              </div>
            </div>
          </section>

          {call.summary ? (
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                AI summary
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">{call.summary}</p>
            </section>
          ) : null}

          {call.recordingUrl ? (
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Recording
              </p>
              <audio
                src={call.recordingUrl}
                controls
                className="mt-3 w-full"
                preload="none"
              />
            </section>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Transcript
              </p>
            </div>
            <div className="max-h-[22rem] space-y-3 overflow-y-auto p-4">
              {Array.isArray(call.transcript) && call.transcript.length > 0 ? (
                (call.transcript as TranscriptTurn[]).map((turn, index) => {
                  const isAgent = turn.role === "agent";
                  return (
                    <div
                      key={index}
                      className={`flex flex-col ${isAgent ? "items-start" : "items-end"}`}
                    >
                      <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                        {isAgent ? "Support agent" : "Caller"}
                      </span>
                      <p
                        className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          isAgent
                            ? "rounded-tl-none border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
                            : "rounded-tr-none bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
                        }`}
                      >
                        {turn.content}
                      </p>
                    </div>
                  );
                })
              ) : typeof call.transcript === "string" && call.transcript.trim() ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
                  {call.transcript}
                </p>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No transcript available for this call.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Technical reference
            </p>
            <p className="mt-2 break-all font-mono text-[11px] text-[var(--color-text)]">
              call · {call.callId}
            </p>
            <p className="mt-1.5 break-all font-mono text-[10px] text-[var(--color-text-muted)]">
              agent · {call.agentId}
            </p>
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export function VoiceAgentAnalytics({ calls }: { calls: CallItem[] }) {
  const [selectedCall, setSelectedCall] = useState<CallItem | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const totalCalls = calls.length;
  const avgDuration =
    totalCalls > 0
      ? Math.round(calls.reduce((acc, curr) => acc + curr.durationSeconds, 0) / totalCalls)
      : 0;
  const inboundCalls = calls.filter((call) => call.direction.toLowerCase() === "inbound").length;
  const completedCalls = calls.filter((call) => {
    const status = call.callStatus.toLowerCase();
    return status === "completed" || status === "ended" || status === "done";
  }).length;
  const positiveCalls = calls.filter((call) => {
    const sentiment = call.sentiment?.toLowerCase().trim();
    return sentiment === "positive" || sentiment === "friendly";
  }).length;
  const totalPages = Math.max(1, Math.ceil(calls.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedCalls = calls.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <section className="space-y-4">
      <div className="grid overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total calls", value: totalCalls, hint: "all recorded calls" },
          {
            label: "Inbound",
            value: inboundCalls,
            hint: totalCalls > 0 ? `${Math.round((inboundCalls / totalCalls) * 100)}% of volume` : "no call volume",
          },
          { label: "Completed", value: completedCalls, hint: "finished conversations" },
          {
            label: "Avg duration",
            value: formatDuration(avgDuration),
            hint: positiveCalls > 0 ? `${positiveCalls} positive` : "no sentiment yet",
          },
        ].map((metric, index) => (
          <div
            key={metric.label}
            className={`min-w-0 bg-[var(--color-bg)] px-5 py-5 ${index < 3 ? "border-b border-[var(--color-border)] sm:border-r lg:border-b-0" : ""}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {metric.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] tabular-nums">
              {metric.value}
            </p>
            <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{metric.hint}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--color-border)] px-5 py-5 lg:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
            Conversation archive
          </p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.015em] text-[var(--color-text)]">
            Call history
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
            Completed conversations, recordings, sentiment, and transcripts.
          </p>
        </div>
        <div className="p-4 lg:p-5">
          {calls.length === 0 ? (
            <DataTable>
              <DataTableEmptyState
                title="No call history yet"
                description="Completed calls will appear here with recordings, summaries, sentiment, and transcripts."
              />
            </DataTable>
          ) : null}

          {calls.length > 0 ? (
            <>
              <div className="divide-y divide-[var(--color-border-muted)] md:hidden">
                {pagedCalls.map((call) => (
                  <button
                    key={call.id}
                    type="button"
                    onClick={() => setSelectedCall(call)}
                    className="flex w-full items-start gap-3 px-1 py-3.5 text-left transition hover:bg-[var(--color-raised)]"
                    aria-label={`View call from ${formatCallWhen(call.createdAt)}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold capitalize text-[var(--color-text)]">
                        {call.direction} · {formatDuration(call.durationSeconds)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {formatCallWhen(call.createdAt)}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                        <span className="font-medium text-[var(--color-text)]">
                          {call.direction === "inbound"
                            ? formatPhoneNumber(call.fromNumber)
                            : formatPhoneNumber(call.toNumber)}
                        </span>
                        <span className="mx-1.5 text-[var(--color-text-subtle)]">·</span>
                        <span>{call.sentiment || "neutral"}</span>
                      </p>
                    </div>
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center text-[var(--color-text-muted)]">
                      <EyeIcon />
                    </span>
                  </button>
                ))}
                <DataTablePagination
                  totalItems={calls.length}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  perPage={perPage}
                  onPageChange={setPage}
                  onPerPageChange={(size) => {
                    setPerPage(size);
                    setPage(1);
                  }}
                  pageSizes={[5, 10, 20]}
                  itemLabel="calls"
                />
              </div>

              <DataTable className="hidden md:block">
                <DataTableHeader className={`hidden md:grid ${tableGridClass}`}>
                  <div>Date & Time</div>
                  <div>Number</div>
                  <div>Duration</div>
                  <div>Sentiment</div>
                  <div>Summary</div>
                  <div className="text-right">Details</div>
                </DataTableHeader>
                <DataTableBody>
                  {pagedCalls.map((call) => (
                    <DataTableRow
                      key={call.id}
                      className={`group items-center ${tableGridClass}`}
                    >
                      <div className="min-w-0 font-medium">
                        <p>{new Date(call.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {new Date(call.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="min-w-0 font-mono text-xs text-[var(--color-text-muted)]">
                        <p className="font-sans text-xs font-semibold uppercase text-[var(--color-text)]">
                          {call.direction}
                        </p>
                        <p>
                          {call.direction === "inbound"
                            ? formatPhoneNumber(call.fromNumber)
                            : formatPhoneNumber(call.toNumber)}
                        </p>
                      </div>
                      <div>{formatDuration(call.durationSeconds)}</div>
                      <div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold leading-snug ${getSentimentTone(
                            call.sentiment,
                          )}`}
                        >
                          {call.sentiment || "neutral"}
                        </span>
                      </div>
                      <div className="min-w-0 text-[var(--color-text-muted)]">
                        <p className="line-clamp-2 leading-relaxed" title={call.summary || ""}>
                          {call.summary || "—"}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedCall(call)}
                          className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                          aria-label={`View call details from ${formatCallWhen(call.createdAt)}`}
                          title="View details"
                        >
                          <EyeIcon />
                        </button>
                      </div>
                    </DataTableRow>
                  ))}
                </DataTableBody>
                <DataTablePagination
                  totalItems={calls.length}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  perPage={perPage}
                  onPageChange={setPage}
                  onPerPageChange={(size) => {
                    setPerPage(size);
                    setPage(1);
                  }}
                  pageSizes={[5, 10, 20]}
                  itemLabel="calls"
                />
              </DataTable>
            </>
          ) : null}
        </div>
      </section>

      {selectedCall ? (
        <CallDetailsSheet
          key={selectedCall.id}
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      ) : null}
    </section>
  );
}

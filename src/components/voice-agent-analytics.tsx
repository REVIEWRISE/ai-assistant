"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";

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
  transcript: unknown; // JSON representation of turns
  createdAt: string;
};

const tableGridClass =
  "grid-cols-[140px_130px_90px_100px_minmax(0,1fr)_90px]";

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

export function VoiceAgentAnalytics({ calls }: { calls: CallItem[] }) {
  const [selectedCall, setSelectedCall] = useState<CallItem | null>(null);

  // Compute stats
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

  return (
    <section className="space-y-4">
      <div className="grid overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total calls", value: totalCalls, hint: "all recorded calls" },
          { label: "Inbound", value: inboundCalls, hint: totalCalls > 0 ? `${Math.round((inboundCalls / totalCalls) * 100)}% of volume` : "no call volume" },
          { label: "Completed", value: completedCalls, hint: "finished conversations" },
          { label: "Avg duration", value: formatDuration(avgDuration), hint: positiveCalls > 0 ? `${positiveCalls} positive` : "no sentiment yet" },
        ].map((metric, index) => (
          <div key={metric.label} className={`min-w-0 px-4 py-3 ${index < 3 ? "border-b border-[var(--color-border)] sm:border-r lg:border-b-0" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{metric.label}</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text)] tabular-nums">{metric.value}</p>
            <p className="mt-0.5 truncate text-[10px] text-[var(--color-text-muted)]">{metric.hint}</p>
          </div>
        ))}
      </div>

      <Panel
        title="Call history"
        subtitle="Completed conversations, recordings, sentiment, and transcripts"
      >
        {calls.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text-muted)]">
            <p className="font-semibold text-[var(--color-text)]">No call history yet</p>
            <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed">
              Completed calls to your support line will appear here with recordings, summaries, sentiment, and transcripts.
            </p>
          </div>
        ) : null}

        {calls.length > 0 ? (
          <>
            {/* Mobile View */}
            <div className="space-y-3 md:hidden">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[var(--color-text)]">
                      {new Date(call.createdAt).toLocaleDateString()} at{" "}
                      {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getSentimentTone(
                        call.sentiment,
                      )}`}
                    >
                      {call.sentiment || "neutral"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)]">
                    <div>
                      <span className="font-medium text-[var(--color-text)]">Duration:</span>{" "}
                      {formatDuration(call.durationSeconds)}
                    </div>
                    <div>
                      <span className="font-medium text-[var(--color-text)]">Dir:</span>{" "}
                      {call.direction}
                    </div>
                  </div>
                  {call.summary ? (
                    <p className="text-xs text-[var(--color-text-muted)] italic line-clamp-2">
                      &quot;{call.summary}&quot;
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelectedCall(call)}
                    className="w-full text-center rounded-lg border border-[var(--color-border-hover)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] md:block">
              <div
                className={`vr-app-table-header hidden items-center gap-3 px-4 py-3 md:grid ${tableGridClass}`}
              >
                <div>Date & Time</div>
                <div>Number</div>
                <div>Duration</div>
                <div>Sentiment</div>
                <div>Summary</div>
                <div className="text-right">Action</div>
              </div>
              <div className="divide-y divide-[var(--color-border-muted)]">
                {calls.map((call) => (
                  <div
                    key={call.id}
                    className={`group grid items-center gap-3 px-4 py-3 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)] ${tableGridClass}`}
                  >
                    <div className="min-w-0 font-medium">
                      <p>{new Date(call.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="min-w-0 font-mono text-xs text-[var(--color-text-muted)]">
                      <p className="font-sans text-xs uppercase font-semibold text-[var(--color-text)]">
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
                        className="rounded-lg border border-[var(--color-border-hover)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] group-hover:border-[var(--color-border)]"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </Panel>

      {/* Call Details Modal */}
      {typeof document !== "undefined" && selectedCall
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] p-4">
              <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)] flex flex-col max-h-[85vh]">
                {/* Modal Header */}
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary-h)]">
                      Call Details • {selectedCall.direction} ({new Date(selectedCall.createdAt).toLocaleDateString()})
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Call details</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCall(null)}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                  >
                    Close
                  </button>
                </div>

                {/* Modal Content Scroll Area */}
                <div className="p-5 overflow-y-auto space-y-4 text-sm text-[var(--color-text)] flex-1">
                  {/* Metadata and Stats */}
                  <div className="grid gap-3 sm:grid-cols-3 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                    <div>
                      <p className="font-semibold text-[var(--color-text-muted)]">Duration</p>
                      <p className="mt-0.5 font-bold text-sm">{formatDuration(selectedCall.durationSeconds)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-text-muted)]">Caller</p>
                      <p className="mt-0.5 font-bold font-mono text-sm">
                        {selectedCall.direction === "inbound"
                          ? formatPhoneNumber(selectedCall.fromNumber)
                          : formatPhoneNumber(selectedCall.toNumber)}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-text-muted)]">Sentiment</p>
                      <span
                        className={`inline-flex rounded-full mt-0.5 px-2 py-0.5 text-xs font-semibold ${getSentimentTone(
                          selectedCall.sentiment,
                        )}`}
                      >
                        {selectedCall.sentiment || "neutral"}
                      </span>
                    </div>
                  </div>

                  {/* Summary Block */}
                  {selectedCall.summary ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                        AI call summary
                      </p>
                      <p className="mt-2 leading-relaxed">{selectedCall.summary}</p>
                    </div>
                  ) : null}

                  {/* Audio Player */}
                  {selectedCall.recordingUrl ? (
                    <div className="rounded-2xl border border-[var(--color-border)] p-4 flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                        Call Recording
                      </p>
                      <audio
                        src={selectedCall.recordingUrl}
                        controls
                        className="w-full mt-1"
                        preload="none"
                      />
                    </div>
                  ) : null}

                  {/* Transcript turns */}
                  <div className="rounded-2xl border border-[var(--color-border)] p-4 flex flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      Call Transcript
                    </p>
                    <div className="mt-2 space-y-3 overflow-y-auto max-h-[300px] p-2 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border-muted)]">
                       {Array.isArray(selectedCall.transcript) && selectedCall.transcript.length > 0 ? (
                        (selectedCall.transcript as TranscriptTurn[]).map((turn, index) => {
                          const isAgent = turn.role === "agent";
                          return (
                            <div key={index} className={`py-2 flex flex-col ${isAgent ? "items-start" : "items-end"}`}>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                                {isAgent ? "🤖 Support Agent" : "📞 Caller"}
                              </span>
                              <p className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                                isAgent 
                                  ? "bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-tl-none" 
                                  : "bg-[var(--color-primary-soft)] text-[var(--color-primary-h)] rounded-tr-none"
                              }`}>
                                {turn.content}
                              </p>
                            </div>
                          );
                        })
                      ) : typeof selectedCall.transcript === "string" && selectedCall.transcript.trim() ? (
                        <p className="whitespace-pre-wrap leading-relaxed text-sm font-sans p-2">
                          {selectedCall.transcript}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--color-text-muted)] italic p-2">
                          No transcript available for this call.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-4 border-t border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs rounded-b-3xl">
                  <span>Call ID: {selectedCall.callId}</span>
                  <span>Agent ID: {selectedCall.agentId}</span>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

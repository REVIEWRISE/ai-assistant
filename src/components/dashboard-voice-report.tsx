import Link from "next/link";
import { DashboardVoiceFollowUpDone } from "@/components/dashboard-voice-follow-up-done";
import type { VoiceCallReport, VoiceFollowUpReason } from "@/lib/voice-call-report";

const CALLS_HREF = "/voice-agent?tab=analytics";

const REASON_CLASS: Record<VoiceFollowUpReason, string> = {
  unhappy: "vr-app-status-danger",
  failed: "vr-app-status-warning",
  no_booking: "border border-transparent bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]",
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function reportTitle(report: VoiceCallReport) {
  if (report.totalCalls === 0) return `No calls in the last ${report.periodDays} days`;
  if (report.followUpCount === 0) return "No callers need a follow-up";
  return `${report.followUpCount} ${report.followUpCount === 1 ? "caller needs" : "callers need"} a follow-up`;
}

export function DashboardVoiceReport({ report }: { report: VoiceCallReport }) {
  const stats = [
    { label: "Calls", value: report.totalCalls },
    { label: "Booked", value: report.bookingEnabled ? report.bookedCalls : "Off" },
    { label: "Unhappy callers", value: report.unhappyCalls },
    { label: "Avg length", value: formatDuration(report.avgDurationSeconds) },
  ];

  return (
    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)] lg:p-6 [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--color-primary-h)]">
            Voice call report · Last {report.periodDays} days
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-text)]">{reportTitle(report)}</h2>
        </div>
        <Link
          href={CALLS_HREF}
          className="shrink-0 py-1 text-sm font-semibold text-[var(--color-primary-h)] underline-offset-4 hover:underline"
        >
          All calls
        </Link>
      </div>

      {report.totalCalls === 0 ? (
        <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
          Your report will appear here once your voice agent answers calls.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] sm:grid-cols-4 sm:divide-x sm:divide-[var(--color-border)] [[data-theme=dark]_&]:bg-[var(--color-raised)]">
            {stats.map((stat) => (
              <div key={stat.label} className="flex min-w-0 flex-col-reverse px-4 py-3">
                <dt className="text-xs text-[var(--color-text-muted)]">{stat.label}</dt>
                <dd className="mb-0.5 text-lg font-semibold tabular-nums text-[var(--color-text)]">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {report.followUps.length > 0 ? (
            <ul className="mt-4 divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] [[data-theme=dark]_&]:bg-[var(--color-raised)]">
              {report.followUps.map((followUp) => (
                <li key={followUp.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REASON_CLASS[followUp.reason]}`}>
                        {followUp.reasonLabel}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-[var(--color-text)]">
                        {followUp.caller ?? "Unknown caller"}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">{followUp.whenLabel}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-text)]">
                      {followUp.summary ?? "No AI summary was recorded for this call."}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">{followUp.nextStep}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {followUp.caller ? (
                      <a
                        href={`tel:${followUp.caller}`}
                        className="inline-flex min-h-10 items-center rounded-full bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-fill-h)]"
                      >
                        Call back
                      </a>
                    ) : null}
                    <Link
                      href={`${CALLS_HREF}&call=${encodeURIComponent(followUp.id)}`}
                      className="inline-flex min-h-10 items-center rounded-full border border-[var(--color-border-hover)] px-4 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary-h)]"
                    >
                      View call
                    </Link>
                    <DashboardVoiceFollowUpDone callRecordId={followUp.id} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {report.followUpCount > report.followUps.length || report.followUpsDone > 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              {[
                report.followUpCount > report.followUps.length
                  ? `Showing the ${report.followUps.length} most urgent of ${report.followUpCount}.`
                  : null,
                report.followUpsDone > 0
                  ? `${report.followUpsDone} ${report.followUpsDone === 1 ? "follow-up" : "follow-ups"} done this week.`
                  : null,
              ]
                .filter(Boolean)
                .join(" ")}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

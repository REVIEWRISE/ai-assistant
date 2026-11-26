import Link from "next/link";
import type { VoiceCallReport, VoiceReportDay } from "@/lib/voice-call-report";

const SPARK_WIDTH = 112;
const SPARK_HEIGHT = 28;
const BAR_GAP = 3;

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

type Tile = {
  label: string;
  value: string | number;
  color: string;
  /** One value per day, oldest first. */
  series: number[] | null;
  formatPoint: (value: number) => string;
  empty?: React.ReactNode;
  /** e.g. "+4 vs last week"; null hides the line. */
  delta?: string | null;
};

function countDelta(current: number, previous: number | undefined): string | null {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return "Same as last week";
  return `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)} vs last week`;
}

function durationDelta(current: number, previous: number | undefined): string | null {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 5) return "Same as last week";
  return `${diff > 0 ? "▲" : "▼"} ${formatDuration(Math.abs(diff))} vs last week`;
}

function formatRenewal(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function MinutesTile({ minutes }: { minutes: NonNullable<VoiceCallReport["minutes"]> }) {
  const used = Math.min(minutes.usedMinutes, minutes.includedMinutes);
  const percent = minutes.includedMinutes > 0 ? Math.round((used / minutes.includedMinutes) * 100) : 0;
  const exhausted = minutes.usedMinutes >= minutes.includedMinutes;
  const low = !exhausted && minutes.remainingMinutes <= minutes.includedMinutes * 0.2;
  return (
    <div
      className="col-span-2 flex min-w-0 flex-col gap-2 px-4 py-3 xl:col-span-1"
      title={`Plan includes ${minutes.includedMinutes} calling minutes per billing period. Resets ${formatRenewal(minutes.periodEnd)}.`}
    >
      <div className="flex flex-col-reverse">
        <dt className="text-xs text-[var(--color-text-muted)]">Minutes used</dt>
        <dd className="mb-0.5 text-lg font-semibold tabular-nums text-[var(--color-text)]">
          {minutes.usedMinutes}
          <span className="text-sm font-medium text-[var(--color-text-muted)]"> / {minutes.includedMinutes}</span>
        </dd>
      </div>
      <div className="flex h-7 flex-col justify-end gap-1.5">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]"
          role="progressbar"
          aria-label="Included calling minutes used"
          aria-valuemin={0}
          aria-valuemax={minutes.includedMinutes}
          aria-valuenow={used}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${percent}%`,
              background: exhausted ? "var(--viz-red)" : low ? "var(--viz-yellow)" : "var(--viz-blue)",
            }}
          />
        </div>
        <p className="truncate text-[11px] text-[var(--color-text-muted)]">
          {exhausted ? `Used up · resets ${formatRenewal(minutes.periodEnd)}` : `${minutes.remainingMinutes} min left`}
        </p>
      </div>
    </div>
  );
}

/** 7 thin bars; the latest day is solid, earlier days are muted. Each bar has a hover title. */
function Sparkline({ tile, days }: { tile: Tile; days: VoiceReportDay[] }) {
  const values = tile.series ?? [];
  const max = Math.max(1, ...values);
  const slot = SPARK_WIDTH / values.length;
  const barWidth = Math.max(4, slot - BAR_GAP);

  return (
    <svg
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      className="overflow-visible"
      role="img"
      aria-label={`${tile.label} per day: ${values
        .map((value, i) => `${days[i]?.label} ${tile.formatPoint(value)}`)
        .join(", ")}`}
    >
      <line x1={0} x2={SPARK_WIDTH} y1={SPARK_HEIGHT} y2={SPARK_HEIGHT} stroke="var(--color-border)" strokeWidth={1} />
      {values.map((value, i) => {
        const height = value > 0 ? Math.max(3, (value / max) * (SPARK_HEIGHT - 2)) : 0;
        const x = i * slot + (slot - barWidth) / 2;
        const isLatest = i === values.length - 1;
        return (
          <g key={days[i]?.date ?? i}>
            <title>{`${days[i]?.fullLabel}: ${tile.formatPoint(value)}`}</title>
            {/* Full-height hit area so small or empty days are still hoverable. */}
            <rect x={i * slot} y={0} width={slot} height={SPARK_HEIGHT} fill="transparent" />
            {height > 0 ? (
              <rect
                x={x}
                y={SPARK_HEIGHT - height}
                width={barWidth}
                height={height}
                rx={2}
                fill={tile.color}
                opacity={isLatest ? 1 : 0.45}
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function DashboardVoiceStatTiles({
  report,
  bookingHref,
}: {
  report: VoiceCallReport;
  bookingHref: string;
}) {
  const days = report.days;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const prev = report.previous ?? undefined;

  const tiles: Tile[] = [
    {
      label: "Calls",
      value: report.totalCalls,
      color: "var(--viz-blue)",
      series: days.map((d) => d.booked + d.handled + d.followUp),
      formatPoint: (n) => plural(n, "call"),
      delta: countDelta(report.totalCalls, prev?.totalCalls),
    },
    {
      label: "Booked",
      value: report.bookingEnabled ? report.bookedCalls : "Off",
      color: "var(--viz-aqua)",
      series: report.bookingEnabled ? days.map((d) => d.booked) : null,
      formatPoint: (n) => plural(n, "booking"),
      delta: report.bookingEnabled ? countDelta(report.bookedCalls, prev?.bookedCalls) : null,
      empty: (
        <Link
          href={bookingHref}
          className="text-xs font-semibold text-[var(--color-primary-h)] underline-offset-4 hover:underline"
        >
          Turn on phone booking
        </Link>
      ),
    },
    {
      label: "Unhappy callers",
      value: report.unhappyCalls,
      color: "var(--viz-red)",
      series: days.map((d) => d.unhappy),
      formatPoint: (n) => plural(n, "unhappy caller"),
      delta: countDelta(report.unhappyCalls, prev?.unhappyCalls),
    },
    {
      label: "Avg length",
      value: formatDuration(report.avgDurationSeconds),
      color: "var(--viz-violet)",
      series: days.map((d) => {
        const calls = d.booked + d.handled + d.followUp;
        return calls > 0 ? Math.round(d.durationSeconds / calls) : 0;
      }),
      formatPoint: (n) => (n > 0 ? `${formatDuration(n)} avg` : "no calls"),
      delta: durationDelta(report.avgDurationSeconds, prev?.avgDurationSeconds),
    },
  ];

  return (
    <dl
      className={`mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] [&>div]:bg-[var(--color-bg)] [[data-theme=dark]_&>div]:bg-[var(--color-raised)] ${
        report.minutes ? "sm:grid-cols-3 xl:grid-cols-5" : "sm:grid-cols-4"
      }`}
    >
      {tiles.map((tile) => (
        <div key={tile.label} className="flex min-w-0 flex-col gap-2 px-4 py-3">
          <div className="flex flex-col-reverse">
            <dt className="text-xs text-[var(--color-text-muted)]">{tile.label}</dt>
            <dd className="mb-0.5 text-lg font-semibold tabular-nums text-[var(--color-text)]">{tile.value}</dd>
          </div>
          <div className="flex h-7 items-end">
            {tile.series ? <Sparkline tile={tile} days={days} /> : tile.empty}
          </div>
          {tile.delta ? (
            <p className="-mt-1 text-[11px] tabular-nums text-[var(--color-text-muted)]">{tile.delta}</p>
          ) : null}
        </div>
      ))}
      {report.minutes ? <MinutesTile minutes={report.minutes} /> : null}
    </dl>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VoiceReportDay } from "@/lib/voice-call-report";

type SeriesKey = "booked" | "handled" | "followUp";

/** Stack order bottom → top; follow-ups sit on top so the actionable part is easiest to read. */
const SERIES: Array<{ key: SeriesKey; name: string; color: string }> = [
  { key: "booked", name: "Booked", color: "var(--viz-aqua)" },
  { key: "handled", name: "Handled by agent", color: "var(--viz-blue)" },
  { key: "followUp", name: "Needs follow-up", color: "var(--viz-red)" },
];

const AXIS_TICK = { fill: "var(--color-text-muted)", fontSize: 11 };

type BarShapeProps = React.ComponentProps<typeof Rectangle> & { payload?: Row };

type Row = VoiceReportDay & { total: number; topKey: SeriesKey | null };

function TotalLabel(props: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  index?: number;
  rows: Row[];
  seriesKey: SeriesKey;
}) {
  const row = props.index != null ? props.rows[props.index] : undefined;
  if (!row || row.topKey !== props.seriesKey) return null;
  const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
  const y = Number(props.y ?? 0) - 6;
  return (
    <text x={x} y={y} textAnchor="middle" className="fill-[var(--color-text-muted)] text-[11px] font-semibold tabular-nums">
      {row.total}
    </text>
  );
}

function DayTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Row }>;
  series: typeof SERIES;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="min-w-[11rem] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/95 px-3.5 py-2.5 shadow-[var(--shadow-lg)] backdrop-blur-sm">
      <p className="text-xs font-semibold text-[var(--color-text)]">{row.fullLabel}</p>
      <p className="text-[11px] text-[var(--color-text-muted)]">
        {row.total} {row.total === 1 ? "call" : "calls"}
      </p>
      <div className="mt-1.5 space-y-1">
        {[...series].reverse().map((item) => (
          <p key={item.key} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
            <span className="text-[var(--color-text-muted)]">{item.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-[var(--color-text)]">{row[item.key]}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function DashboardVoiceReportChart({
  days,
  bookingEnabled,
  peakWindowLabel,
  peakWindowCalls,
}: {
  days: VoiceReportDay[];
  bookingEnabled: boolean;
  peakWindowLabel: string | null;
  peakWindowCalls: number;
}) {
  // With phone booking off the report shows Booked as "Off", so fold those calls into "Handled".
  const series = bookingEnabled ? SERIES : SERIES.filter((item) => item.key !== "booked");
  const rows: Row[] = days.map((day) => {
    const booked = bookingEnabled ? day.booked : 0;
    const handled = bookingEnabled ? day.handled : day.handled + day.booked;
    const values: Record<SeriesKey, number> = { booked, handled, followUp: day.followUp };
    const topKey = [...series].reverse().find((item) => values[item.key] > 0)?.key ?? null;
    return { ...day, booked, handled, total: booked + handled + day.followUp, topKey };
  });

  const followUpDays = rows.filter((row) => row.followUp > 0);
  const worstDay = followUpDays.reduce<Row | null>(
    (worst, row) => (!worst || row.followUp > worst.followUp ? row : worst),
    null,
  );
  const busiestDay = rows.reduce<Row | null>((best, row) => (!best || row.total > best.total ? row : best), null);

  const insights = [
    busiestDay && busiestDay.total > 0
      ? `Busiest day: ${busiestDay.fullLabel} (${busiestDay.total} calls).`
      : null,
    peakWindowLabel
      ? `Calls peak ${peakWindowLabel} (${peakWindowCalls} this week). Keep someone free to answer then.`
      : null,
    worstDay && worstDay.followUp > 1
      ? `${worstDay.followUp} calls on ${worstDay.label} still need a follow-up.`
      : null,
  ].filter(Boolean);

  return (
    <figure className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--chart-surface)] px-2 pb-3 pt-3 [--chart-surface:var(--color-bg)] sm:px-3 [[data-theme=dark]_&]:[--chart-surface:var(--color-raised)]">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-2">
        <span className="text-sm font-semibold text-[var(--color-text)]">Calls per day</span>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {[...series].reverse().map((item) => (
            <li key={item.key} className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
              {item.name}
            </li>
          ))}
        </ul>
      </figcaption>

      <div className="mt-2 h-48" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 18, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid stroke="var(--color-border-muted)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={8} interval={0} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
            <Tooltip
              cursor={{ fill: "var(--color-border-muted)", opacity: 0.6 }}
              content={<DayTooltip series={series} />}
            />
            {series.map((item) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.name}
                stackId="calls"
                fill={item.color}
                stroke="var(--chart-surface)"
                strokeWidth={2}
                maxBarSize={36}
                isAnimationActive={false}
                shape={(props: BarShapeProps) => (
                  <Rectangle {...props} radius={props.payload?.topKey === item.key ? [4, 4, 0, 0] : 0} />
                )}
              >
                <LabelList content={<TotalLabel rows={rows} seriesKey={item.key} />} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Calls per day, last {rows.length} days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {series.map((item) => (
              <th key={item.key} scope="col">
                {item.name}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date}>
              <th scope="row">{row.fullLabel}</th>
              {series.map((item) => (
                <td key={item.key}>{row[item.key]}</td>
              ))}
              <td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {insights.length > 0 ? (
        <ul className="mt-2 space-y-0.5 px-2 text-xs leading-5 text-[var(--color-text-muted)]">
          {insights.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}

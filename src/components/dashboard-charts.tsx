"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  DashboardChart,
  DashboardOverviewStat,
  DashboardSection,
  DashboardStat,
} from "@/lib/dashboard-data";
import { hasChartData } from "@/lib/dashboard-chart-data";

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/95 px-3.5 py-2.5 shadow-[var(--shadow-lg)] backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <div className="mt-1.5 space-y-1.5">
        {payload.map((entry) => (
          <p key={`${entry.name}-${entry.value}`} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color ?? "#94a3b8" }}
            />
            <span className="font-medium text-[var(--color-text)]">{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-[var(--color-text)]">
              {entry.value}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

/** Map the data layer's legacy hex accents onto the validated, theme-aware chart palette. */
const VIZ_COLOR: Record<string, string> = {
  "#38bdf8": "var(--viz-blue)",
  "#34d399": "var(--viz-aqua)",
  "#2dd4bf": "var(--viz-aqua)",
  "#a78bfa": "var(--viz-violet)",
  "#fbbf24": "var(--viz-yellow)",
  "#f87171": "var(--viz-red)",
};

function vizColor(color: string | undefined, fallback = "var(--viz-blue)"): string {
  if (!color) return fallback;
  return VIZ_COLOR[color.toLowerCase()] ?? color;
}

function ChartShell({
  title,
  subtitle,
  accent,
  featured = false,
  legend,
  children,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  featured?: boolean;
  legend?: Array<{ name: string; color: string }>;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] ${
        featured ? "lg:col-span-2" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
            <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
          </div>
          {subtitle ? (
            <p className="mt-1 max-w-xl pl-4 text-xs leading-relaxed text-[var(--color-text-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {legend && legend.length > 1 ? (
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {legend.map((item) => (
              <li key={item.name} className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
                {item.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="px-2 pb-3 pt-2 sm:px-3">{children}</div>
    </div>
  );
}

/** Shown instead of the chart when there is no data yet — one message, no placeholder shapes. */
function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="mx-2 mb-1 flex min-h-[132px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-6 text-center">
      <p className="text-xs font-semibold text-[var(--color-text)]">No activity yet</p>
      <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-[var(--color-text-muted)]">{message}</p>
    </div>
  );
}

const AXIS_TICK = { fill: "var(--color-text-muted)", fontSize: 11 };

function DashboardLineChartCard({
  chart,
  accent,
}: {
  chart: Extract<DashboardChart, { kind: "line" }>;
  accent: string;
}) {
  const featured = chart.featured ?? false;
  const empty = !hasChartData(chart);
  const series = chart.series.map((item) => ({ ...item, color: vizColor(item.color) }));

  if (empty) {
    return (
      <ChartShell title={chart.title} subtitle={chart.subtitle} accent={vizColor(accent)} featured={featured}>
        <EmptyChartMessage message={chart.emptyMessage ?? "Daily counts appear here once there’s activity."} />
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title={chart.title}
      subtitle={chart.subtitle}
      accent={vizColor(accent)}
      featured={featured}
      legend={series.map((item) => ({ name: item.name, color: vizColor(chart.series.find((s) => s.key === item.key)?.color) }))}
    >
      <div className="relative h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart.data} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
            <defs>
              {series.map((item) => (
                <linearGradient key={item.key} id={`fill-${chart.id}-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--color-border-muted)" vertical={false} />
            <XAxis dataKey={chart.labelKey} tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={8} />
            <YAxis
              allowDecimals={false}
              tick={AXIS_TICK}
              width={32}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border-hover)", strokeWidth: 1 }} />
            {series.map((item) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={item.color}
                strokeWidth={2}
                fill={`url(#fill-${chart.id}-${item.key})`}
                dot={{ r: 4, fill: item.color, stroke: "var(--color-surface)", strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: "var(--color-surface)", strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}

function DashboardBarChartCard({
  chart,
  accent,
}: {
  chart: Extract<DashboardChart, { kind: "bar" }>;
  accent: string;
}) {
  const featured = chart.featured ?? false;
  const empty = !hasChartData(chart);
  const baseColor = vizColor(chart.data.find((point) => point.color)?.color ?? chart.color ?? accent);

  if (empty) {
    return (
      <ChartShell title={chart.title} subtitle={chart.subtitle} accent={baseColor} featured={featured}>
        <EmptyChartMessage message={chart.emptyMessage ?? "Counts appear here once there’s activity."} />
      </ChartShell>
    );
  }

  return (
    <ChartShell title={chart.title} subtitle={chart.subtitle} accent={baseColor} featured={featured}>
      <div className="relative h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} margin={{ top: 20, right: 12, left: -12, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke="var(--color-border-muted)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={8} interval={0} />
            <YAxis
              allowDecimals={false}
              tick={AXIS_TICK}
              width={32}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-bg)" }} />
            <Bar dataKey="value" name={chart.title} radius={[4, 4, 0, 0]} maxBarSize={44}>
              {chart.data.map((point) => (
                <Cell key={point.label} fill={vizColor(point.color, baseColor)} />
              ))}
                <LabelList dataKey="value" position="top" offset={6} style={{ fill: "var(--color-text)", fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}

export function DashboardOverviewGrid({
  stats,
  organizationName,
  eyebrow = "Workspace pulse",
  caption = "Live operational totals",
}: {
  stats: DashboardOverviewStat[];
  organizationName?: string | null;
  eyebrow?: string;
  caption?: string;
}) {
  if (!stats.length) return null;

  const gridCols =
    stats.length === 1
      ? "grid-cols-1"
      : stats.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : stats.length === 3
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] lg:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">{eyebrow}</p>
          <h2 className="mt-1 text-base font-semibold text-[var(--color-text)]">
            {organizationName ?? "Collective performance"}
          </h2>
        </div>
        <p className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[10px] font-medium text-[var(--color-text-muted)]">{caption}</p>
      </div>
      <div className={`grid gap-3 ${gridCols}`}>
        {stats.map((stat) => (
          <Link
            key={stat.id}
            href={stat.href}
            className={`group relative min-w-0 overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${
              stats.length === 1
                ? "flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap"
                : ""
            }`}
            style={{
              borderColor: `color-mix(in srgb, ${stat.accent} 18%, var(--color-border))`,
              background: `linear-gradient(145deg, color-mix(in srgb, ${stat.accent} 8%, var(--color-surface)), var(--color-surface) 62%)`,
            }}
          >
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{stat.title}</p>
                <p className="mt-2 text-[1.7rem] font-semibold leading-none tracking-tight text-[var(--color-text)] tabular-nums">{stat.value}</p>
                <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">{stat.hint}</p>
              </div>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold"
                style={{
                  color: stat.accent,
                  backgroundColor: `color-mix(in srgb, ${stat.accent} 13%, transparent)`,
                }}
                aria-hidden
              >
                {stat.title.charAt(0)}
              </span>
            </div>
            <p
              className={`text-[11px] font-semibold ${stats.length === 1 ? "shrink-0 sm:self-end" : "mt-2.5"}`}
              style={{ color: stat.accent }}
            >
              View details{" "}
              <span className="inline-block transition-transform group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DashboardSectionSummary({
  stats,
}: {
  stats: DashboardStat[];
  accent: string;
}) {
  if (!stats.length) return null;

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] sm:grid-cols-4 sm:divide-x sm:divide-[var(--color-border)]">
      {stats.slice(0, 4).map((stat) => (
        <div key={stat.label} className="min-w-0 px-4 py-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{stat.label}</dt>
          <dd className="mt-0.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold tabular-nums text-[var(--color-text)]">{stat.value}</span>
            {stat.hint ? <span className="text-[11px] text-[var(--color-text-muted)]">{stat.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DashboardChartGrid({
  charts,
  accent,
}: {
  charts: DashboardChart[];
  accent: string;
}) {
  if (!charts.length) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {charts.map((chart) =>
        chart.kind === "line" ? (
          <DashboardLineChartCard key={chart.id} chart={chart} accent={accent} />
        ) : (
          <DashboardBarChartCard key={chart.id} chart={chart} accent={accent} />
        ),
      )}
    </div>
  );
}

export function DashboardStatFallback({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3.5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {stat.label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[var(--color-text)] tabular-nums">
            {stat.value}
          </p>
          {stat.hint ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">{stat.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export type { DashboardSection };

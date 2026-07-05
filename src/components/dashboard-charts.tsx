"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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

function hasChartData(chart: DashboardChart): boolean {
  if (chart.kind === "line") {
    return chart.data.some((point) =>
      chart.series.some((series) => Number(point[series.key] ?? 0) > 0),
    );
  }
  return chart.data.some((point) => point.value > 0);
}

function ChartShell({
  title,
  subtitle,
  accent,
  featured = false,
  children,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  featured?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] ${
        featured ? "lg:col-span-2" : ""
      }`}
    >
      <div className="p-4 lg:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
            </div>
            {subtitle ? (
              <p className="mt-1.5 max-w-xl pl-4 text-xs leading-relaxed text-[var(--color-text-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function ChartEmptyState({
  title,
  subtitle,
  message,
  accent,
  featured = false,
}: {
  title: string;
  subtitle?: string;
  message: string;
  accent: string;
  featured?: boolean;
}) {
  return (
    <ChartShell title={title} subtitle={subtitle} accent={accent} featured={featured}>
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)] px-6 py-10 text-center">
        <div
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-lg font-semibold text-[var(--color-text-muted)]"
          aria-hidden
        >
          —
        </div>
        <p className="text-sm font-medium text-[var(--color-text)]">No activity yet</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-text-muted)]">{message}</p>
      </div>
    </ChartShell>
  );
}

function DashboardLineChartCard({
  chart,
  accent,
}: {
  chart: Extract<DashboardChart, { kind: "line" }>;
  accent: string;
}) {
  const featured = chart.featured ?? false;

  if (!hasChartData(chart)) {
    return (
      <ChartEmptyState
        title={chart.title}
        subtitle={chart.subtitle}
        message={chart.emptyMessage ?? "No data yet."}
        accent={accent}
        featured={featured}
      />
    );
  }

  return (
    <ChartShell title={chart.title} subtitle={chart.subtitle} accent={accent} featured={featured}>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey={chart.labelKey}
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--color-text-subtle)", fontSize: 11 }}
              width={32}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--color-border-hover)", strokeDasharray: "4 4" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            {chart.series.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.name}
                stroke={series.color}
                strokeWidth={3}
                dot={{ r: 4, fill: series.color, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
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
  const barColor = chart.data.find((point) => point.color)?.color ?? chart.color ?? accent;
  const featured = chart.featured ?? false;

  if (!hasChartData(chart)) {
    return (
      <ChartEmptyState
        title={chart.title}
        subtitle={chart.subtitle}
        message={chart.emptyMessage ?? "No data yet."}
        accent={barColor}
        featured={featured}
      />
    );
  }

  return (
    <ChartShell title={chart.title} subtitle={chart.subtitle} accent={barColor} featured={featured}>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--color-text-subtle)", fontSize: 11 }}
              width={32}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name={chart.title} fill={barColor} radius={[10, 10, 0, 0]} maxBarSize={56}>
              {chart.data.map((point) => (
                <Cell key={point.label} fill={point.color ?? barColor} />
              ))}
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
}: {
  stats: DashboardOverviewStat[];
  organizationName?: string | null;
}) {
  if (!stats.length) return null;

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--color-border)] px-5 py-4 lg:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
          Workspace overview
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">
          Collective performance
          {organizationName ? (
            <span className="font-normal text-[var(--color-text-muted)]"> · {organizationName}</span>
          ) : null}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Combined stats across bookings, review response, voice support, and users.
        </p>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:p-5">
        {stats.map((stat) => (
          <Link
            key={stat.id}
            href={stat.href}
            className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))] hover:bg-[var(--color-raised)] hover:shadow-[var(--shadow-sm)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {stat.title}
            </p>
            <p
              className="mt-2 text-3xl font-semibold tracking-tight tabular-nums"
              style={{ color: stat.accent }}
            >
              {stat.value}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">{stat.hint}</p>
            <p className="mt-3 text-xs font-semibold text-[var(--color-primary-h)] transition group-hover:underline">
              Open module →
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DashboardSectionSummary({
  stats,
  accent,
}: {
  stats: DashboardStat[];
  accent: string;
}) {
  if (!stats.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {stats.slice(0, 4).map((stat) => (
        <div
          key={stat.label}
          className="min-w-[9rem] flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {stat.label}
          </p>
          <p
            className={`mt-1 text-xl font-semibold tabular-nums ${stat.accent ? "" : "text-[var(--color-text)]"}`}
            style={stat.accent ? { color: stat.accent } : undefined}
          >
            {stat.value}
          </p>
          {stat.hint ? <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{stat.hint}</p> : null}
        </div>
      ))}
    </div>
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
    <div className="grid gap-4 lg:grid-cols-2">
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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3"
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

import Link from "next/link";
import {
  DashboardChartGrid,
  DashboardOverviewGrid,
  DashboardSectionSummary,
  DashboardStatFallback,
  type DashboardSection,
} from "@/components/dashboard-charts";
import type { DashboardData } from "@/lib/dashboard-data";

function DashboardSectionCard({ section }: { section: DashboardSection }) {
  const hasCharts = section.charts.length > 0;

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--color-border)] px-5 py-4 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {section.id.replace("-", " ")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">{section.title}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{section.description}</p>
          </div>
          <Link
            href={section.href}
            className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-primary-soft)]"
          >
            Open module
          </Link>
        </div>
      </div>

      <div className="space-y-4 p-4 lg:space-y-5 lg:p-5">
        {hasCharts ? (
          <>
            <DashboardSectionSummary stats={section.stats} accent={section.accent} />
            <DashboardChartGrid charts={section.charts} accent={section.accent} />
          </>
        ) : (
          <DashboardStatFallback stats={section.stats} />
        )}
      </div>
    </section>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-5 lg:space-y-6">
      {data.emptyMessage ? (
        <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">No modules assigned</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{data.emptyMessage}</p>
        </section>
      ) : (
        <>
          <DashboardOverviewGrid stats={data.overviewStats} organizationName={data.organizationName} />

          <div className="space-y-5">
            {data.sections.map((section) => (
              <DashboardSectionCard key={section.id} section={section} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

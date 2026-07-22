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
    <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 pb-3 pt-4 lg:px-5 lg:pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
            style={{
              color: section.accent,
              backgroundColor: `color-mix(in srgb, ${section.accent} 12%, transparent)`,
            }}
            aria-hidden
          >
            {section.title.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
              {section.id.replace("-", " ")}
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-[var(--color-text)]">{section.title}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">{section.description}</p>
          </div>
        </div>
        <Link
          href={section.href}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:text-[var(--color-primary-h)]"
        >
          Open module
          <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
        </Link>
      </div>

      <div className="space-y-3 px-4 pb-4 lg:px-5 lg:pb-5">
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

function DashboardStartHere({ links }: { links: DashboardData["quickLinks"] }) {
  if (!links.length) return null;

  return (
    <aside className="rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] bg-[linear-gradient(145deg,var(--color-primary-soft),var(--color-surface)_65%)] p-4 shadow-[var(--shadow-sm)] lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">Start here</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--color-text)]">Get your workspace working</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
              Complete these essentials to start collecting activity.
            </p>
          </div>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-sm font-semibold text-[var(--color-primary-h)] shadow-[var(--shadow-sm)]" aria-hidden>
          {links.length}
        </span>
      </div>
      <div className="mt-4 space-y-1.5">
        {links.slice(0, 3).map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-[color-mix(in_srgb,var(--color-bg)_75%,transparent)]"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[10px] font-semibold text-[var(--color-text-muted)]">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-[var(--color-text)]">{link.label}</span>
              <span className="mt-0.5 block truncate text-[10px] text-[var(--color-text-muted)]">{link.description}</span>
            </span>
            <span className="text-xs text-[var(--color-text-subtle)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary-h)]" aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const hasActivity = data.overviewStats.some((stat) =>
    typeof stat.value === "number" ? stat.value > 0 : Number.parseFloat(String(stat.value)) > 0,
  );

  return (
    <div className="mx-auto max-w-[92rem] space-y-4 lg:space-y-5">
      {data.emptyMessage ? (
        <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">No modules assigned</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{data.emptyMessage}</p>
        </section>
      ) : (
        <>
          <section className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-primary-h)]">
                {data.heroEyebrow}
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--color-text)] lg:text-2xl">
                {data.heroTitle}{data.heroTitleAccent ? ` ${data.heroTitleAccent}` : ""}
              </h1>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--color-text-muted)] lg:text-sm">
                {data.heroDescription}
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${hasActivity ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"}`}>
              <span className={`size-1.5 rounded-full ${hasActivity ? "bg-emerald-500" : "bg-[var(--color-text-subtle)]"}`} aria-hidden />
              {hasActivity ? "Workspace active" : "Ready for setup"}
            </span>
          </section>

          <div className={`grid gap-4 ${hasActivity ? "" : "xl:grid-cols-[minmax(0,1fr)_21rem]"}`}>
            <DashboardOverviewGrid stats={data.overviewStats} organizationName={data.organizationName} />
            {!hasActivity ? <DashboardStartHere links={data.quickLinks} /> : null}
          </div>

          <div className="space-y-4">
            {data.sections.map((section) => (
              <DashboardSectionCard key={section.id} section={section} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

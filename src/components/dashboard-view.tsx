import Link from "next/link";
import { Suspense } from "react";
import {
  DashboardChartGrid,
  DashboardOverviewGrid,
  DashboardSectionSummary,
  DashboardStatFallback,
  type DashboardSection,
} from "@/components/dashboard-charts";
import { GettingStartedStepper } from "@/components/getting-started-stepper";
import type {
  DashboardData,
  DashboardPlatformStat,
  DashboardWorkspaceBilling,
} from "@/lib/dashboard-data";

function DashboardSectionCard({ section }: { section: DashboardSection }) {
  const hasCharts = section.charts.length > 0;

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-5 lg:px-6 lg:pt-6">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold shadow-[var(--shadow-sm)]"
            style={{
              color: section.accent,
              backgroundColor: `color-mix(in srgb, ${section.accent} 10%, var(--color-surface))`,
              borderColor: `color-mix(in srgb, ${section.accent} 22%, var(--color-border))`,
            }}
            aria-hidden
          >
            {section.title.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: section.accent }}>
              {section.id.replace("-", " ")}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-text)]">{section.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">{section.description}</p>
          </div>
        </div>
        <Link
          href={section.href}
          className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:text-[var(--color-primary-h)]"
        >
          Open module
          <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
        </Link>
      </div>

      <div className="space-y-3 px-5 pb-5 lg:px-6 lg:pb-6">
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

function DashboardStartHere({
  links,
  eyebrow = "Start here",
  title = "Get your workspace working",
  description = "Complete these essentials to start collecting activity.",
  limit = 3,
  layout = "list",
}: {
  links: DashboardData["quickLinks"];
  eyebrow?: string;
  title?: string;
  description?: string;
  limit?: number;
  layout?: "list" | "grid";
}) {
  if (!links.length) return null;
  const shown = links.slice(0, limit);

  return (
    <aside className="rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] bg-[linear-gradient(145deg,var(--color-primary-soft),var(--color-surface)_65%)] p-4 shadow-[var(--shadow-sm)] lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">{eyebrow}</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--color-text)]">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {description}
            </p>
          </div>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-sm font-semibold text-[var(--color-primary-h)] shadow-[var(--shadow-sm)]" aria-hidden>
          {shown.length}
        </span>
      </div>
      <div className={layout === "grid" ? "mt-4 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3" : "mt-4 space-y-1.5"}>
        {shown.map((link, index) => (
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

function platformToneClass(tone: DashboardPlatformStat["tone"]) {
  switch (tone) {
    case "danger":
      return "border-red-200 bg-red-50 text-red-800 [[data-theme=dark]_&]:border-red-500/30 [[data-theme=dark]_&]:bg-red-500/15 [[data-theme=dark]_&]:text-red-200";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900 [[data-theme=dark]_&]:border-amber-500/30 [[data-theme=dark]_&]:bg-amber-500/15 [[data-theme=dark]_&]:text-amber-200";
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 [[data-theme=dark]_&]:border-emerald-500/30 [[data-theme=dark]_&]:bg-emerald-500/15 [[data-theme=dark]_&]:text-emerald-200";
    default:
      return "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]";
  }
}

function DashboardPlatformAttention({ stats }: { stats: DashboardPlatformStat[] }) {
  if (!stats.length) return null;

  return (
    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] lg:p-5">
      <div className="mb-4 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
          Across the platform
        </p>
        <h2 className="mt-1 text-base font-semibold text-[var(--color-text)]">Workspaces, refunds, and audit</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.id}
            href={stat.href}
            className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:shadow-[var(--shadow-md)]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {stat.title}
            </p>
            <p className="mt-2 text-[1.7rem] font-semibold tabular-nums leading-none tracking-tight text-[var(--color-text)]">
              {stat.value}
            </p>
            <p className={`mt-3 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${platformToneClass(stat.tone)}`}>
              {stat.hint}
            </p>
            <p className="mt-3 text-[11px] font-semibold text-[var(--color-primary-h)]">
              Open
              <span className="inline-block transition-transform group-hover:translate-x-0.5" aria-hidden>
                {" "}
                →
              </span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function WorkspaceBillingChips({
  billing,
  href,
  showAdminGrant = true,
}: {
  billing: DashboardWorkspaceBilling;
  href?: string | null;
  showAdminGrant?: boolean;
}) {
  const chips = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)]">
        {billing.status}
      </span>
      {billing.planLabel ? (
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
          {billing.planLabel}
          {billing.interval ? ` · ${billing.interval}` : ""}
        </span>
      ) : null}
      {billing.periodHint ? (
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
          {billing.periodHint}
        </span>
      ) : null}
      {billing.cancelAtPeriodEnd ? (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 [[data-theme=dark]_&]:border-amber-500/30 [[data-theme=dark]_&]:bg-amber-500/15 [[data-theme=dark]_&]:text-amber-300">
          Cancels at period end
        </span>
      ) : null}
      {showAdminGrant && billing.billingAdminOverride ? (
        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-800 [[data-theme=dark]_&]:border-violet-500/30 [[data-theme=dark]_&]:bg-violet-500/15 [[data-theme=dark]_&]:text-violet-300">
          Admin grant
        </span>
      ) : null}
    </div>
  );

  if (!href) return chips;

  return (
    <Link href={href} className="transition hover:opacity-90">
      {chips}
    </Link>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const isAdmin = data.roleName === "Admin";
  const hasActivity = data.overviewStats.some((stat) =>
    typeof stat.value === "number" ? stat.value > 0 : Number.parseFloat(String(stat.value)) > 0,
  );
  const attention =
    data.heroBadge === "Needs attention" ||
    data.heroBadge === "Finish setup" ||
    data.heroBadge === "Cancels soon";

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        {!isAdmin ? (
          <GettingStartedStepper
            organizationId={data.organizationId}
            organizationName={data.organizationName}
            steps={data.setupSteps}
          />
        ) : null}
      </Suspense>
      {data.emptyMessage ? (
        <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">No modules assigned</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{data.emptyMessage}</p>
        </section>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(125deg,#0c0c0c_0%,#161616_52%,#222222_100%)] px-5 py-6 text-white shadow-[var(--shadow-lg)] lg:px-7 lg:py-7">
            <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-white/5 blur-3xl" aria-hidden />

            <div className="relative grid items-end gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.72fr)]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    {data.heroEyebrow}
                  </p>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${attention || hasActivity ? "border-white/20 bg-white/10 text-neutral-100" : "border-white/10 bg-white/[0.06] text-neutral-400"}`}>
                    <span className={`size-1.5 rounded-full ${attention ? "bg-amber-300" : hasActivity || data.heroBadge === "All clear" ? "bg-white" : "bg-neutral-500"}`} aria-hidden />
                    {data.heroBadge}
                  </span>
                </div>
                <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.025em] text-white lg:text-[2rem] lg:leading-tight">
                  {data.heroTitle}
                  {data.heroTitleAccent ? <span className="text-neutral-400"> {data.heroTitleAccent}</span> : null}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
                  {data.heroDescription}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-2">
                {data.headlineStats.slice(0, 4).map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3 backdrop-blur-sm">
                    <p className="truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{stat.label}</p>
                    <p className="mt-1.5 text-xl font-semibold tabular-nums text-white">{stat.value}</p>
                  </div>
                ))}
                {data.headlineStats.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 sm:col-span-3 xl:col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Accessible modules</p>
                    <p className="mt-1.5 text-xl font-semibold text-white">{data.sections.length}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {isAdmin ? <DashboardPlatformAttention stats={data.platformStats} /> : null}

          {isAdmin ? (
            <DashboardStartHere
              links={data.quickLinks}
              eyebrow="Admin shortcuts"
              title="Jump to the usual work"
              description="Billing, users, and the audit log — not this workspace’s setup checklist."
              limit={6}
              layout="grid"
            />
          ) : null}

          {isAdmin ? (
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                  This workspace
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">
                  {data.organizationName ?? "No workspace selected"}
                </h2>
              </div>
              {data.workspaceBilling ? <WorkspaceBillingChips billing={data.workspaceBilling} /> : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                  Your workspace
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">
                  {data.organizationName ?? "No workspace selected"}
                </h2>
              </div>
              {data.workspaceBilling ? (
                <WorkspaceBillingChips
                  billing={data.workspaceBilling}
                  href={data.isOwner ? "/subscription" : null}
                  showAdminGrant={false}
                />
              ) : null}
            </div>
          )}

          <DashboardOverviewGrid
            stats={data.overviewStats}
            organizationName={data.organizationName}
            eyebrow={isAdmin ? "Customer activity" : "Today"}
            caption={
              isAdmin
                ? "Bookings, reviews, and voice for the selected workspace"
                : "Bookings, reviews, and calls in this workspace"
            }
          />

          {!isAdmin ? (
            <DashboardStartHere
              links={data.quickLinks}
              eyebrow={hasActivity ? "Shortcuts" : "Start here"}
              title={hasActivity ? "Jump into a module" : "Get your workspace working"}
              description={
                hasActivity
                  ? "Open bookings, reviews, the phone agent, or your plan."
                  : "Complete these essentials to start collecting activity."
              }
              limit={6}
              layout="grid"
            />
          ) : null}

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

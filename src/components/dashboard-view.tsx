import Link from "next/link";
import { Suspense } from "react";
import {
  DashboardChartGrid,
  DashboardOverviewGrid,
  DashboardSectionSummary,
  DashboardStatFallback,
  type DashboardSection,
} from "@/components/dashboard-charts";
import { DashboardVoiceReport } from "@/components/dashboard-voice-report";
import { DashboardWorkspacePrompt } from "@/components/dashboard-workspace-prompt";
import { GettingStartedStepper } from "@/components/getting-started-stepper";
import { LandingLogoMark } from "@/components/landing/landing-logo-mark";
import type {
  DashboardData,
  DashboardPlatformStat,
} from "@/lib/dashboard-data";

function DashboardSectionCard({ section }: { section: DashboardSection }) {
  const hasCharts = section.charts.length > 0;

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
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
            <p className="text-xs font-semibold capitalize" style={{ color: section.accent }}>
              {section.id.replace("-", " ")}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-text)]">{section.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">{section.description}</p>
          </div>
        </div>
        <Link
          href={section.href}
          className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:text-[var(--color-primary-h)] [[data-theme=dark]_&]:border-[var(--color-border-hover)] [[data-theme=dark]_&]:bg-[var(--color-raised)]"
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

function platformToneDot(tone: DashboardPlatformStat["tone"]) {
  switch (tone) {
    case "danger":
      return "bg-red-300";
    case "warning":
      return "bg-amber-300";
    case "success":
      return "bg-emerald-300";
    default:
      return null;
  }
}

function DashboardPlatformTiles({ stats }: { stats: DashboardPlatformStat[] }) {
  return (
    <div
      className={`relative mt-6 grid grid-cols-2 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1 ${
        stats.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-5"
      }`}
    >
      {stats.map((stat) => {
        const dot = platformToneDot(stat.tone);
        return (
          <Link
            key={stat.id}
            href={stat.href}
            className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 transition hover:border-white/40 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <p className="truncate text-xs text-white/85">{stat.title}</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums leading-none text-white">{stat.value}</p>
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-4 text-white/85">
              {dot ? <span className={`mt-1 size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden /> : null}
              {stat.hint}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const isAdmin = data.roleName === "Admin";
  const hasActivity = data.overviewStats.some((stat) =>
    typeof stat.value === "number" ? stat.value > 0 : Number.parseFloat(String(stat.value)) > 0,
  );
  // Non-admins already get the "Getting started" bar; don't repeat it as a hero badge.
  const showHeroBadge = isAdmin || data.heroBadge !== "Finish setup";
  const needsAttention = data.heroBadge === "Needs attention";
  const attention =
    needsAttention ||
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
          <section className="vr-app-hero vr-app-blue relative overflow-hidden px-5 py-6 lg:px-7 lg:py-7">
            <LandingLogoMark className="lp-mark -bottom-28 -right-12 w-[30rem] max-w-none" />

            {isAdmin ? (
              <div className="relative">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-white/85">
                    {data.heroEyebrow}
                  </p>
                  {showHeroBadge ? (
                  <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${needsAttention ? "vr-attention-pill" : attention || hasActivity ? "border-white/25 bg-white/15 text-white" : "border-white/20 bg-white/10 text-white/85"}`}>
                    <span className={`size-1.5 rounded-full ${needsAttention ? "bg-white motion-safe:animate-pulse" : attention ? "bg-amber-300" : hasActivity || data.heroBadge === "All clear" ? "bg-white" : "bg-white/50"}`} aria-hidden />
                    {data.heroBadge}
                  </span>
                  ) : null}
                </div>
                <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.025em] text-white lg:text-[2rem] lg:leading-tight">
                  {data.heroTitle}
                  {data.heroTitleAccent ? <span className="text-white/80"> {data.heroTitleAccent}</span> : null}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85">
                  {data.heroDescription}
                </p>
              </div>
                <DashboardPlatformTiles stats={data.platformStats} />
              </div>
            ) : (
              <div className="relative grid items-end gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.72fr)]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-white/85">
                    {data.heroEyebrow}
                  </p>
                  {showHeroBadge ? (
                  <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${needsAttention ? "vr-attention-pill" : attention || hasActivity ? "border-white/25 bg-white/15 text-white" : "border-white/20 bg-white/10 text-white/85"}`}>
                    <span className={`size-1.5 rounded-full ${needsAttention ? "bg-white motion-safe:animate-pulse" : attention ? "bg-amber-300" : hasActivity || data.heroBadge === "All clear" ? "bg-white" : "bg-white/50"}`} aria-hidden />
                    {data.heroBadge}
                  </span>
                  ) : null}
                </div>
                <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.025em] text-white lg:text-[2rem] lg:leading-tight">
                  {data.heroTitle}
                  {data.heroTitleAccent ? <span className="text-white/80"> {data.heroTitleAccent}</span> : null}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85">
                  {data.heroDescription}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-2">
                {data.headlineStats.slice(0, 4).map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-3">
                    <p className="truncate text-xs text-white/85">{stat.label}</p>
                    <p className="mt-1.5 text-xl font-semibold tabular-nums text-white">{stat.value}</p>
                  </div>
                ))}
                {data.headlineStats.length === 0 && !data.needsWorkspace ? (
                  <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 sm:col-span-3 xl:col-span-2">
                    <p className="text-xs text-white/85">Accessible modules</p>
                    <p className="mt-1.5 text-xl font-semibold text-white">{data.sections.length}</p>
                  </div>
                ) : null}
              </div>
              </div>
            )}
          </section>

          {data.needsWorkspace ? <DashboardWorkspacePrompt workspaces={data.workspaceChoices} /> : null}

          {isAdmin ? (
          <DashboardOverviewGrid
            stats={data.overviewStats}
            title={data.organizationName ? "Last 30 days" : null}
            eyebrow={isAdmin ? "Customer activity" : "Today"}
            caption={
              data.overviewStats.some((stat) => stat.id === "voice")
                ? "Bookings, reviews, and calls in this workspace"
                : "Bookings and reviews in this workspace"
            }
          />
          ) : null}


          {data.voiceReport ? <DashboardVoiceReport report={data.voiceReport} /> : null}

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

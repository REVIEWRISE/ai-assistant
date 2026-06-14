import Link from "next/link";
import {
  AppPageHero,
  AppPageHeroBadge,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
import { Panel } from "@/components/ui";
import type { DashboardData, DashboardSection } from "@/lib/dashboard-data";

function DashboardSectionCard({ section }: { section: DashboardSection }) {
  return (
    <Panel
      title={section.title}
      subtitle={section.description}
      action={
        <Link
          href={section.href}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-primary-soft)]"
        >
          Open
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {section.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-sm)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {stat.label}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[var(--color-text)]">{stat.value}</p>
            {stat.hint ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">{stat.hint}</p> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-5 lg:space-y-6">
      <AppPageHero
        eyebrow={data.heroEyebrow}
        title={
          data.heroTitleAccent ? (
            <>
              {data.heroTitle}{" "}
              <span className="vr-brand-gradient-text">{data.heroTitleAccent}</span>
            </>
          ) : (
            data.heroTitle
          )
        }
        description={data.heroDescription}
      >
        {data.organizationName ? (
          <AppPageHeroBadge>
            {data.roleName} · {data.organizationName}
          </AppPageHeroBadge>
        ) : (
          <AppPageHeroBadge>{data.roleName}</AppPageHeroBadge>
        )}
        {data.headlineStats.length > 0 ? (
          <AppPageHeroStatPanel>
            <AppPageHeroStatGrid columns={data.headlineStats.length >= 4 ? "4" : "3"}>
              {data.headlineStats.map((stat) => (
                <AppPageHeroStat key={stat.label} label={stat.label} value={stat.value} />
              ))}
            </AppPageHeroStatGrid>
          </AppPageHeroStatPanel>
        ) : null}
      </AppPageHero>

      {data.emptyMessage ? (
        <Panel title="No modules assigned" subtitle="Ask an administrator to grant menu access for your role.">
          <p className="text-sm text-[var(--color-text-muted)]">{data.emptyMessage}</p>
        </Panel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="space-y-5">
            {data.sections.map((section) => (
              <DashboardSectionCard key={section.id} section={section} />
            ))}
          </div>

          {data.quickLinks.length > 0 ? (
            <aside className="space-y-5">
              <Panel title="Quick links" subtitle="Jump to the modules available for your role.">
                <ul className="space-y-2">
                  {data.quickLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-primary-soft)]"
                      >
                        <span className="text-sm font-semibold text-[var(--color-text)]">{link.label}</span>
                        <span className="mt-0.5 text-xs text-[var(--color-text-muted)]">{link.description}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>

              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Your access
                </p>
                <p className="mt-2 text-sm text-[var(--color-text)]">
                  Signed in as <span className="font-semibold">{data.roleName}</span>
                  {data.organizationName ? (
                    <>
                      {" "}
                      for <span className="font-semibold">{data.organizationName}</span>
                    </>
                  ) : null}
                  .
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Stats and shortcuts match the menus assigned to your role. Admins see all modules; other roles see
                  only what permissions allow.
                </p>
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}

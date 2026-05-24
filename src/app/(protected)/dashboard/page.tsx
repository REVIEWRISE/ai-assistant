import { AuthSuccessToasts } from "@/components/auth-success-toasts";
import { AppPageHero } from "@/components/app-page-hero";
import { Panel } from "@/components/ui";

export default function DashboardPage() {
  return (
    <div className="space-y-5 lg:space-y-6">
      <AuthSuccessToasts />
      <AppPageHero
        eyebrow="Executive Summary"
        title={
          <>
            Your <span className="vr-brand-gradient-text">operations</span> at a glance.
          </>
        }
        description="KPIs and charts for reviews, appointments, and leads will appear here as each module ships."
      />

      <Panel
        title="Coming Soon"
        subtitle="More dashboard widgets will be added here as modules are finalized."
      >
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-text)] shadow-[var(--shadow-sm)]">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 6v6l4 2" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              Dashboard widgets are being rebuilt.
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Review, appointment, lead, and cross-channel analytics panels are
              temporarily hidden and will return in a dedicated release.
            </p>
            <div className="mt-4 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] shadow-[var(--shadow-sm)]">
              Coming Soon
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

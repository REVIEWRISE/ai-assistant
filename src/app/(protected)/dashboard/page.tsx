import { AuthSuccessToasts } from "@/components/auth-success-toasts";
import { Panel } from "@/components/ui";

export default function DashboardPage() {
  return (
    <div className="space-y-5 lg:space-y-6">
      <AuthSuccessToasts />
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
              Executive Summary
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
              End-to-end AI operations view with realistic demo data.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              This dashboard now includes mock data for performance, workload,
              risk, activity, and revenue impact so you can validate the full
              UI and data model before API integration.
            </p>
          </div>
        </div>
      </section>

      <Panel
        title="Coming Soon"
        subtitle="More dashboard widgets will be added here as modules are finalized."
      >
        <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(160deg,#f8fafc,#eef2f7)] p-6 text-slate-700 shadow-sm">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
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
            <p className="text-lg font-semibold text-slate-900">
              Dashboard widgets are being rebuilt.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Review, appointment, lead, and cross-channel analytics panels are
              temporarily hidden and will return in a dedicated release.
            </p>
            <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
              Coming Soon
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

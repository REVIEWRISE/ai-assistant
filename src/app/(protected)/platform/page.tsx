import Link from "next/link";
import { Panel } from "@/components/ui";

export default function PlatformSettingsPage() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Platform Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          Configure system-wide integrations.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Manage provider connections, API keys, and platform-level behaviors.
        </p>
      </section>

      <Panel title="Configuration Areas" subtitle="Choose a module to configure">
        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <Link
            href="/platform/providers"
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Providers</p>
            <p className="mt-1 text-xs text-slate-500">
              Connect external systems and configure credentials.
            </p>
          </Link>
        </div>
      </Panel>
    </div>
  );
}

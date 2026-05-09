import Link from "next/link";
import { Panel } from "@/components/ui";

export default function AccessManagementPage() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Access Control
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          Manage menus, roles, and permissions.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Define which menu items are visible for each role and control feature
          access through permissions.
        </p>
      </section>

      <Panel title="Access Modules" subtitle="Choose a section to configure">
        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <Link
            href="/settings/access/roles"
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Roles</p>
            <p className="mt-1 text-xs text-slate-500">
              Manage role tiers and access scope.
            </p>
          </Link>
          <Link
            href="/settings/access/menus"
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Menus</p>
            <p className="mt-1 text-xs text-slate-500">
              Configure menu labels and hierarchy.
            </p>
          </Link>
          <Link
            href="/settings/access/permissions"
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Permissions</p>
            <p className="mt-1 text-xs text-slate-500">
              Define feature-level permission keys.
            </p>
          </Link>
        </div>
      </Panel>
    </div>
  );
}

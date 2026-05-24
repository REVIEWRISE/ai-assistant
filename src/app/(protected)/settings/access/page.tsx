import Link from "next/link";
import { AppPageHero } from "@/components/app-page-hero";
import { Panel } from "@/components/ui";

export default function AccessManagementPage() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <AppPageHero
        eyebrow="Access Control"
        title={
          <>
            Manage menus, roles, and{" "}
            <span className="vr-brand-gradient-text">permissions</span>
          </>
        }
        description="Define which menu items are visible for each role and control feature access through permissions."
      />

      <Panel title="Access Modules" subtitle="Choose a section to configure">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <Link
            href="/settings/access/roles"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-surface)]"
          >
            <p className="font-semibold text-[var(--color-text)]">Roles</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Manage role tiers and access scope.
            </p>
          </Link>
          <Link
            href="/settings/access/menus"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-surface)]"
          >
            <p className="font-semibold text-[var(--color-text)]">Menus</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Configure menu labels and hierarchy.
            </p>
          </Link>
          <Link
            href="/settings/access/permissions"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-surface)]"
          >
            <p className="font-semibold text-[var(--color-text)]">Permissions</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Define feature-level permission keys.
            </p>
          </Link>
        </div>
      </Panel>
    </div>
  );
}

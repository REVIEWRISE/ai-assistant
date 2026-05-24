import Link from "next/link";
import {
  AppPageHero,
} from "@/components/app-page-hero";
import { Panel } from "@/components/ui";

export default function PlatformSettingsPage() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <AppPageHero
        eyebrow="Platform Settings"
        title={
          <>
            Configure system-wide{" "}
            <span className="vr-brand-gradient-text">integrations</span>
          </>
        }
        description="Manage provider connections, API keys, and platform-level behaviors."
      />

      <Panel title="Configuration Areas" subtitle="Choose a module to configure">
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <Link
            href="/platform/providers"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-surface)]"
          >
            <p className="font-semibold text-[var(--color-text)]">Providers</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Connect external systems and configure credentials.
            </p>
          </Link>
        </div>
      </Panel>
    </div>
  );
}

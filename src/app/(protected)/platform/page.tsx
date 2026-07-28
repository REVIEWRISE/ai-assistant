import Link from "next/link";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { PlatformNav } from "@/components/platform-nav";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlatformSettingsPage() {
  await requireAdminSession();
  const providers = await prisma.provider.findMany({
    select: { type: true, status: true, config: true },
  });
  const enabledProviders = providers.filter(
    (provider) => provider.status === "enabled",
  ).length;
  const providerTypes = new Set(providers.map((provider) => provider.type)).size;

  const modules = [
    {
      href: "/platform/providers",
      eyebrow: "Integrations",
      title: "Providers",
      description:
        "Configure external services, connection requirements, and API behavior.",
      count: providers.length,
      label: providers.length === 1 ? "provider" : "providers",
    },
  ];

  return (
    <div className="mx-auto max-w-[92rem] space-y-4">
      <AppointmentPageHeader
        variant="command"
        eyebrow="Platform Settings"
        title="Platform configuration"
        description="Manage provider connections, API keys, and platform-level behaviors. Billing lives under its own admin menu."
        status={`${enabledProviders} providers enabled`}
        statusTone={enabledProviders > 0 ? "success" : "warning"}
        metrics={[
          {
            label: "Providers",
            value: providers.length,
            hint: "integration records",
          },
          {
            label: "Enabled",
            value: enabledProviders,
            hint: "available services",
          },
          {
            label: "Provider types",
            value: providerTypes,
            hint: "service categories",
          },
        ]}
      />

      <PlatformNav />

      <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--color-border)] px-4 py-4 lg:px-5">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            Configuration areas
          </h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            System-wide settings shared across every organization.
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 lg:p-5">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-raised)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
                  {module.eyebrow}
                </p>
                <span className="rounded-full bg-[var(--color-surface)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
                  {module.count} {module.label}
                </span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-[var(--color-text)]">
                {module.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                {module.description}
              </p>
              <p className="mt-4 text-xs font-semibold text-[var(--color-primary-h)]">
                Open module →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

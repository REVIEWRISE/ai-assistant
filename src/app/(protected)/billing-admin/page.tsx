import Link from "next/link";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { requireAdminSession } from "@/lib/auth-session";
import { getBillingCatalogPlans } from "@/lib/billing-plan-repository";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BillingAdminPage() {
  await requireAdminSession();

  const [orgCount, catalog] = await Promise.all([
    prisma.organization.count(),
    getBillingCatalogPlans(),
  ]);
  const planCount = catalog.plans.length;

  const modules = [
    {
      href: "/billing-admin/organizations",
      eyebrow: "Workspaces",
      title: "Organizations",
      description: "View workspace plans, trials, and paid status.",
      count: orgCount,
      label: orgCount === 1 ? "workspace" : "workspaces",
    },
    {
      href: "/billing-admin/plans",
      eyebrow: "Catalog",
      title: "Plans & modules",
      description: "View and edit commercial plans from the Vyntrise Billing service.",
      count: planCount,
      label: planCount === 1 ? "plan" : "plans",
    },
  ];

  return (
    <div className="mx-auto max-w-[92rem] space-y-4">
      <AppointmentPageHeader
        variant="command"
        eyebrow="Billing"
        title="Billing administration"
        description="View workspace subscriptions and the plan catalog. Platform Settings stays for system configuration."
        status={`${orgCount} workspaces`}
        statusTone="success"
        metrics={[
          { label: "Workspaces", value: orgCount, hint: "customer organizations" },
          {
            label: "Plans",
            value: planCount,
            hint: catalog.error ? "billing unavailable" : "from Billing API",
          },
        ]}
      />

      <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--color-border)] px-4 py-4 lg:px-5">
          <h2 className="text-base font-semibold text-[var(--color-text)]">Billing areas</h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Commercial controls for plans and customer workspaces.
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
              <h3 className="mt-5 text-base font-semibold text-[var(--color-text)]">{module.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                {module.description}
              </p>
              <p className="mt-4 text-xs font-semibold text-[var(--color-primary-h)]">Open →</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppointmentPageHeader } from "@/components/appointment-page-header";

export const dynamic = "force-dynamic";

export default async function AccessManagementPage() {
  const [roleCount, menuCount, rolePermissionCount, memberPermissionCount] =
    await Promise.all([
      prisma.role.count(),
      prisma.menuItem.count(),
      prisma.menuAccess.count(),
      prisma.organizationMemberMenuAccess.count(),
    ]);

  const totalRules = rolePermissionCount + memberPermissionCount;
  const status =
    roleCount === 0
      ? "Start with roles"
      : menuCount === 0
        ? "Add menus next"
        : rolePermissionCount === 0
          ? "Assign permissions"
          : "Policy configured";

  const modules = [
    {
      href: "/settings/access/roles",
      step: "01",
      eyebrow: "Identity",
      title: "Roles",
      description: "Define reusable access tiers for administrators and team members.",
      count: roleCount,
      countLabel: roleCount === 1 ? "role" : "roles",
      ready: roleCount > 0,
    },
    {
      href: "/settings/access/menus",
      step: "02",
      eyebrow: "Navigation",
      title: "Menus",
      description: "Maintain the routes and navigation items that can be granted.",
      count: menuCount,
      countLabel: menuCount === 1 ? "menu" : "menus",
      ready: menuCount > 0,
    },
    {
      href: "/settings/access/permissions",
      step: "03",
      eyebrow: "Policy",
      title: "Permissions",
      description: "Assign role defaults and organization-specific user overrides.",
      count: totalRules,
      countLabel: totalRules === 1 ? "rule" : "rules",
      ready: rolePermissionCount > 0,
    },
  ];

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <AppointmentPageHeader
        variant="command"
        eyebrow="Access Control"
        title="Access governance"
        description="Define which menu items are visible for each role and control feature access through permissions."
        status={status}
        statusTone={rolePermissionCount > 0 ? "success" : "warning"}
        actions={[
          { href: "/settings/access/roles", label: "Manage roles" },
          { href: "/settings/access/permissions", label: "Assign permissions", primary: true },
        ]}
        metrics={[
          { label: "Roles", value: roleCount, hint: "access tiers" },
          { label: "Menus", value: menuCount, hint: "grantable routes" },
          {
            label: "Role defaults",
            value: rolePermissionCount,
            hint: "baseline rules",
          },
          {
            label: "User overrides",
            value: memberPermissionCount,
            hint: "organization rules",
          },
        ]}
      />

      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--color-border)] px-4 py-4 lg:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Setup path
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Access modules</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Configure identity, navigation, then policy—in that order.
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-3 lg:p-5">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-raised)] hover:shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
                    {module.step} · {module.eyebrow}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                    module.ready
                      ? "vr-app-status-success"
                      : "bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
                  }`}
                >
                  {module.count} {module.countLabel}
                </span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-[var(--color-text)]">
                {module.title}
              </h3>
              <p className="mt-1.5 min-h-10 text-xs leading-relaxed text-[var(--color-text-muted)]">
                {module.description}
              </p>
              <p className="mt-4 text-xs font-semibold text-[var(--color-primary-h)] transition group-hover:underline">
                Open module →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
            Baseline
          </p>
          <h3 className="mt-2 text-sm font-semibold text-[var(--color-text)]">Role defaults</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
            Menus granted to a role become the default access for everyone with that role.
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
            Exception
          </p>
          <h3 className="mt-2 text-sm font-semibold text-[var(--color-text)]">User overrides</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
            Organization-specific rules replace role defaults for one selected member.
          </p>
        </div>
      </section>
    </div>
  );
}

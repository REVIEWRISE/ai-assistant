import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProvidersManager } from "@/components/providers-manager";
import { ProvidersToasts } from "@/components/providers-toasts";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { PlatformNav } from "@/components/platform-nav";
import { requireSession } from "@/lib/auth-session";
import { createProvider, deleteProvider, updateProvider } from "./actions";

export const dynamic = "force-dynamic";

export default async function PlatformProvidersPage() {
  const session = await requireSession();
  const [providers, adminRole] = await Promise.all([
    prisma.provider.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.userRole.findFirst({
      where: { userId: session.userId, role: { name: "Admin" } },
      select: { id: true },
    }),
  ]);

  const totalProviders = providers.length;
  const providerTypeCount = new Set(providers.map((provider) => provider.type)).size;
  const newest = providers[providers.length - 1];
  const newestLabel = newest ? new Date(newest.createdAt).toLocaleDateString() : "—";
  const enabledCount = providers.filter((provider) => provider.status === "enabled").length;
  const disabledCount = totalProviders - enabledCount;
  const configuredCount = providers.filter((provider) => Boolean(provider.config)).length;

  const status =
    totalProviders === 0
      ? "No providers yet"
      : enabledCount === 0
        ? "All providers disabled"
        : `${enabledCount} enabled`;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        <ProvidersToasts />
      </Suspense>

      <AppointmentPageHeader
        variant="command"
        eyebrow="Platform Settings"
        title="Provider connections"
        description="Connect external systems to power automation, routing, and analytics across every organization."
        status={status}
        statusTone={enabledCount > 0 ? "success" : "warning"}
        actions={[
          { href: "/platform", label: "Platform overview" },
          ...(adminRole
            ? [{ href: "/platform/billing-plans", label: "Billing plans", primary: true }]
            : [{ href: "/platform/providers", label: "Manage providers", primary: true }]),
        ]}
        metrics={[
          {
            label: "Total providers",
            value: totalProviders,
            hint: newest ? `Newest · ${newest.name} (${newestLabel})` : "no integrations yet",
          },
          {
            label: "Enabled",
            value: enabledCount,
            hint: disabledCount > 0 ? `${disabledCount} disabled` : "all active",
          },
          {
            label: "Configured",
            value: configuredCount,
            hint: "with provider settings",
          },
          {
            label: "Provider types",
            value: providerTypeCount,
            hint: "service categories",
          },
        ]}
      />

      <PlatformNav showBilling={Boolean(adminRole)} />

      <ProvidersManager
        providers={providers as Array<{
          id: string;
          name: string;
          type: string;
          apiUrl: string | null;
          logoUrl: string | null;
          status: string;
          config: unknown;
          description: string | null;
          createdAt: Date;
        }>}
        onCreateProvider={createProvider}
        onUpdateProvider={updateProvider}
        onDeleteProvider={deleteProvider}
      />
    </div>
  );
}

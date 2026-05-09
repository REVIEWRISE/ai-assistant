import { prisma } from "@/lib/prisma";
import { ProvidersManager } from "@/components/providers-manager";
import { ProvidersToasts } from "@/components/providers-toasts";
import { createProvider, deleteProvider, updateProvider } from "./actions";

export default async function PlatformProvidersPage() {
  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: "asc" },
  });

  const totalProviders = providers.length;
  const newest = providers[providers.length - 1];
  const newestLabel = newest ? new Date(newest.createdAt).toLocaleDateString() : "—";

  return (
    <div className="space-y-4 lg:space-y-6">
      <ProvidersToasts />
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Platform Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          Provider Connections
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Connect external systems to power automation, routing, and analytics.
        </p>
        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Total Providers</p>
            <p className="text-lg font-semibold text-white">{totalProviders}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Provider Types</p>
            <p className="text-lg font-semibold text-white">
              {new Set(providers.map((provider: { type: string }) => provider.type)).size}
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Last Added</p>
            <p className="text-lg font-semibold text-white">{newestLabel}</p>
          </div>
        </div>
      </section>

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

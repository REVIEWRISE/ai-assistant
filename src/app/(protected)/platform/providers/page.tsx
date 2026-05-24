import { prisma } from "@/lib/prisma";
import { ProvidersManager } from "@/components/providers-manager";
import { ProvidersToasts } from "@/components/providers-toasts";
import {
  AppPageHero,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
import { createProvider, deleteProvider, updateProvider } from "./actions";

export default async function PlatformProvidersPage() {
  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: "asc" },
  });

  const totalProviders = providers.length;
  const providerTypeCount = new Set(providers.map((provider: { type: string }) => provider.type)).size;
  const newest = providers[providers.length - 1];
  const newestLabel = newest ? new Date(newest.createdAt).toLocaleDateString() : "—";

  return (
    <div className="space-y-4 lg:space-y-6">
      <ProvidersToasts />
      <AppPageHero
        eyebrow="Platform Settings"
        title={
          <>
            Provider{" "}
            <span className="vr-brand-gradient-text">connections</span>
          </>
        }
        description="Connect external systems to power automation, routing, and analytics."
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="3">
            <AppPageHeroStat label="Total Providers" value={totalProviders} />
            <AppPageHeroStat label="Provider Types" value={providerTypeCount} />
            <AppPageHeroStat label="Last Added" value={newestLabel} />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

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

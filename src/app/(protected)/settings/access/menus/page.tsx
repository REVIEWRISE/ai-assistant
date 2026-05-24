import { prisma } from "@/lib/prisma";
import { MenusManager } from "@/components/menus-manager";
import { MenusToasts } from "@/components/menus-toasts";
import {
  AppPageHero,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
import { createMenuItem, deleteMenuItem, updateMenuItem } from "./actions";

export default async function AccessMenusPage() {
  const menus = await prisma.menuItem.findMany({
    orderBy: { createdAt: "asc" },
  });

  const totalMenus = menus.length;
  const newest = menus[menus.length - 1];
  const newestLabel = newest ? new Date(newest.createdAt).toLocaleDateString() : "—";

  return (
    <div className="space-y-4 lg:space-y-6">
      <MenusToasts />
      <AppPageHero
        eyebrow="Access Control"
        title={<span className="vr-brand-gradient-text">Menus</span>}
        description="Organize menu structure, labels, and navigation order."
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="3">
            <AppPageHeroStat label="Total Menus" value={totalMenus} />
            <AppPageHeroStat label="Newest Menu" value={newest?.label ?? "—"} />
            <AppPageHeroStat label="Last Created" value={newestLabel} />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

      <MenusManager
        menus={menus}
        onCreateMenu={createMenuItem}
        onUpdateMenu={updateMenuItem}
        onDeleteMenu={deleteMenuItem}
      />
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { PermissionsManager } from "@/components/permissions-manager";
import { PermissionsToasts } from "@/components/permissions-toasts";
import {
  AppPageHero,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
import { createMenuAccess, deleteMenuAccess } from "./actions";

export default async function AccessPermissionsPage() {
  const permissions = await prisma.menuAccess.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      role: { select: { id: true, name: true } },
      menuItem: { select: { id: true, label: true, path: true } },
    },
  });

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const menus = await prisma.menuItem.findMany({
    orderBy: { label: "asc" },
    select: { id: true, label: true, path: true },
  });

  const totalPermissions = permissions.length;
  const newest = permissions[permissions.length - 1];
  const newestLabel = newest ? new Date(newest.createdAt).toLocaleDateString() : "—";

  return (
    <div className="space-y-4 lg:space-y-6">
      <PermissionsToasts />
      <AppPageHero
        eyebrow="Access Control"
        title={<span className="vr-brand-gradient-text">Permissions</span>}
        description="Define feature-level permissions and assign them to roles."
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="3">
            <AppPageHeroStat label="Total Permissions" value={totalPermissions} />
            <AppPageHeroStat
              label="Newest Permission"
              value={newest ? `${newest.role.name} → ${newest.menuItem.label}` : "—"}
            />
            <AppPageHeroStat label="Last Created" value={newestLabel} />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

      <PermissionsManager
        permissions={permissions}
        roles={roles}
        menus={menus}
        onCreatePermission={createMenuAccess}
        onDeletePermission={deleteMenuAccess}
      />
    </div>
  );
}

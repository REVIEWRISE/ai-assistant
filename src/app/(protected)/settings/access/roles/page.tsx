import { prisma } from "@/lib/prisma";
import { RolesToasts } from "@/components/roles-toasts";
import { RolesManager } from "@/components/roles-manager";
import {
  AppPageHero,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
import { createRole, deleteRole, updateRole } from "./actions";

export default async function AccessRolesPage() {
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "asc" },
  });

  const totalRoles = roles.length;
  const newest = roles[roles.length - 1];
  const newestLabel = newest ? new Date(newest.createdAt).toLocaleDateString() : "—";

  return (
    <div className="space-y-4 lg:space-y-6">
      <RolesToasts />
      <AppPageHero
        eyebrow="Access Control"
        title={
          <>
            <span className="vr-brand-gradient-text">Roles</span>
          </>
        }
        description="Define role tiers and assign the permissions each role can access."
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="3">
            <AppPageHeroStat label="Total Roles" value={totalRoles} />
            <AppPageHeroStat label="Newest Role" value={newest?.name ?? "—"} />
            <AppPageHeroStat label="Last Created" value={newestLabel} />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

      <RolesManager
        roles={roles}
        onCreateRole={createRole}
        onUpdateRole={updateRole}
        onDeleteRole={deleteRole}
      />
    </div>
  );
}

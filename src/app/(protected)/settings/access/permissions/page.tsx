import { prisma } from "@/lib/prisma";
import { PermissionsHub } from "@/components/permissions-hub";
import { PermissionsToasts } from "@/components/permissions-toasts";
import {
  AppPageHero,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
import {
  createMemberMenuAccess,
  createRoleMenuAccess,
  deleteMemberMenuAccess,
  deleteRoleMenuAccess,
} from "./actions";

export default async function AccessPermissionsPage() {
  const [memberPermissions, rolePermissions, organizations, memberships, roles, menus] =
    await Promise.all([
      prisma.organizationMemberMenuAccess.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          organization: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true, email: true } },
          menuItem: { select: { id: true, label: true, path: true } },
        },
      }),
      prisma.menuAccess.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          role: { select: { id: true, name: true } },
          menuItem: { select: { id: true, label: true, path: true } },
        },
      }),
      prisma.organization.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.organizationMember.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          organization: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.role.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.menuItem.findMany({
        orderBy: { label: "asc" },
        select: { id: true, label: true, path: true },
      }),
    ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PermissionsToasts />
      <AppPageHero
        eyebrow="Access Control"
        title={<span className="vr-brand-gradient-text">Permissions</span>}
        description="Manage role defaults and per-user organization overrides in one place."
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="3">
            <AppPageHeroStat label="Role Defaults" value={rolePermissions.length} />
            <AppPageHeroStat label="User Overrides" value={memberPermissions.length} />
            <AppPageHeroStat label="Roles" value={roles.length} />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

      <PermissionsHub
        roleCount={rolePermissions.length}
        memberCount={memberPermissions.length}
        roleSection={{
          permissions: rolePermissions.map((permission) => ({
            id: permission.id,
            role: permission.role,
            menuItem: permission.menuItem,
            createdAt: permission.createdAt.toISOString(),
          })),
          roles,
          menus,
          onCreatePermission: createRoleMenuAccess,
          onDeletePermission: deleteRoleMenuAccess,
        }}
        memberSection={{
          permissions: memberPermissions.map((permission) => ({
            id: permission.id,
            organization: permission.organization,
            user: permission.user,
            menuItem: permission.menuItem,
            createdAt: permission.createdAt.toISOString(),
          })),
          organizations,
          memberships: memberships.map((membership) => ({
            organizationId: membership.organizationId,
            organizationName: membership.organization.name,
            userId: membership.userId,
            userName: membership.user.fullName,
            userEmail: membership.user.email,
          })),
          menus,
          onCreatePermission: createMemberMenuAccess,
          onDeletePermission: deleteMemberMenuAccess,
        }}
      />
    </div>
  );
}

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { PermissionsHub } from "@/components/permissions-hub";
import { PermissionsToasts } from "@/components/permissions-toasts";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import {
  createMemberMenuAccess,
  createRoleMenuAccess,
  deleteMemberMenuAccess,
  deleteRoleMenuAccess,
} from "./actions";

export const dynamic = "force-dynamic";

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

  const totalRules = rolePermissions.length + memberPermissions.length;
  const rolesWithGrants = new Set(rolePermissions.map((permission) => permission.role.id)).size;
  const status =
    rolePermissions.length === 0
      ? "Assign role defaults"
      : memberPermissions.length > 0
        ? `${totalRules} rules active`
        : "Role defaults configured";

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        <PermissionsToasts />
      </Suspense>

      <AppointmentPageHeader
        variant="command"
        eyebrow="Access Control"
        title="Permission policy"
        description="Manage role defaults and per-user organization overrides that control which menus appear."
        status={status}
        statusTone={rolePermissions.length > 0 ? "success" : "warning"}
        actions={[
          { href: "/settings/access/roles", label: "Manage roles" },
          { href: "/settings/access/menus", label: "Manage menus", primary: true },
        ]}
        metrics={[
          {
            label: "Role defaults",
            value: rolePermissions.length,
            hint: `${rolesWithGrants} of ${roles.length} roles covered`,
          },
          {
            label: "User overrides",
            value: memberPermissions.length,
            hint: "organization-specific grants",
          },
          {
            label: "Roles",
            value: roles.length,
            hint: "available tiers",
          },
          {
            label: "Menus",
            value: menus.length,
            hint: "grantable routes",
          },
        ]}
      />

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

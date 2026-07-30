import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { RolesToasts } from "@/components/roles-toasts";
import { RolesManager } from "@/components/roles-manager";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { createRole, deleteRole, updateRole } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccessRolesPage() {
  const [roles, permissionCount, menuCount] = await Promise.all([
    prisma.role.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            userRoles: true,
            menuAccesses: true,
          },
        },
      },
    }),
    prisma.menuAccess.count(),
    prisma.menuItem.count(),
  ]);

  const totalRoles = roles.length;
  const assignedUsers = roles.reduce((sum, role) => sum + role._count.userRoles, 0);
  const rolesWithGrants = roles.filter((role) => role._count.menuAccesses > 0).length;
  const newest = roles[roles.length - 1];
  const newestLabel = newest ? new Date(newest.createdAt).toLocaleDateString() : "—";

  const status =
    totalRoles === 0
      ? "No roles yet"
      : rolesWithGrants === totalRoles
        ? "Roles configured"
        : `${totalRoles - rolesWithGrants} without menu grants`;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        <RolesToasts />
      </Suspense>

      <AppointmentPageHeader
        variant="command"
        eyebrow="Access Control"
        title="Role tiers"
        description="Define reusable access levels, then grant menus and permissions to each role."
        status={status}
        statusTone={totalRoles === 0 || rolesWithGrants < totalRoles ? "warning" : "success"}
        actions={[
          { href: "/settings/access/menus", label: "Manage menus" },
          { href: "/settings/access/permissions", label: "Assign permissions", primary: true },
        ]}
        metrics={[
          {
            label: "Total roles",
            value: totalRoles,
            hint: newest ? `Newest · ${newest.name} (${newestLabel})` : "no tiers yet",
          },
          {
            label: "Assigned users",
            value: assignedUsers,
            hint: assignedUsers === 1 ? "account using a role" : "accounts using roles",
          },
          {
            label: "Permission rules",
            value: permissionCount,
            hint: `${menuCount} menus available`,
          },
          {
            label: "Roles with grants",
            value: rolesWithGrants,
            hint:
              rolesWithGrants === totalRoles && totalRoles > 0
                ? "every role has menu access"
                : "finish permission setup",
          },
        ]}
      />

      <RolesManager
        roles={roles.map((role) => ({
          id: role.id,
          name: role.name,
          createdAt: role.createdAt,
          userCount: role._count.userRoles,
          permissionCount: role._count.menuAccesses,
        }))}
        onCreateRole={createRole}
        onUpdateRole={updateRole}
        onDeleteRole={deleteRole}
      />
    </div>
  );
}

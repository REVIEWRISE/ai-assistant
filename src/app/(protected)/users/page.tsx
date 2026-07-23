import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/users-manager";
import { UsersToasts } from "@/components/users-toasts";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { createUser, deleteUser, updateUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        userRoles: {
          include: { role: true },
          take: 1,
        },
      },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.accountStatus === "active").length;
  const invitedUsers = users.filter((user) => user.accountStatus === "invited").length;
  const suspendedUsers = users.filter((user) => user.accountStatus === "suspended").length;
  const adminUsers = users.filter(
    (user) => user.userRoles[0]?.role?.name.toLowerCase() === "admin",
  ).length;
  const attentionUsers = totalUsers - activeUsers;
  const newest = users[users.length - 1];
  const newestLabel = newest ? new Date(newest.createdAt).toLocaleDateString() : "—";

  const status =
    totalUsers === 0
      ? "No accounts yet"
      : attentionUsers > 0
        ? `${attentionUsers} need attention`
        : "Directory healthy";

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        <UsersToasts />
      </Suspense>

      <AppointmentPageHeader
        variant="command"
        eyebrow="User Management"
        title="Team directory"
        description="Invite teammates, assign roles, and keep account access current across the workspace."
        status={status}
        statusTone={totalUsers === 0 || attentionUsers > 0 ? "warning" : "success"}
        actions={[
          { href: "/settings/access/roles", label: "Manage roles" },
          { href: "/settings/access/permissions", label: "Menu permissions", primary: true },
        ]}
        metrics={[
          {
            label: "Total users",
            value: totalUsers,
            hint: newest ? `Newest · ${newest.fullName} (${newestLabel})` : "no accounts yet",
          },
          {
            label: "Active",
            value: activeUsers,
            hint: `${Math.round((activeUsers / Math.max(totalUsers, 1)) * 100)}% of directory`,
          },
          {
            label: "Administrators",
            value: adminUsers,
            hint: "elevated workspace access",
          },
          {
            label: "Needs attention",
            value: attentionUsers,
            hint:
              attentionUsers === 0
                ? "all accounts active"
                : `${invitedUsers} invited · ${suspendedUsers} suspended`,
          },
        ]}
      />

      <UsersManager
        users={users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          accountStatus: user.accountStatus,
          roleName: user.userRoles[0]?.role?.name ?? "User",
          roleId: user.userRoles[0]?.role?.id ?? null,
          createdAt: user.createdAt,
        }))}
        roles={roles}
        onCreateUser={createUser}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
      />
    </div>
  );
}

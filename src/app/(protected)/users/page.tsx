import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/users-manager";
import { UsersToasts } from "@/components/users-toasts";
import {
  AppPageHero,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
import { createUser, deleteUser, updateUser } from "./actions";

export default async function UserManagementPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      userRoles: {
        include: { role: true },
        take: 1,
      },
    },
  });

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const totalUsers = users.length;
  const newest = users[users.length - 1];
  const newestLabel = newest ? new Date(newest.createdAt).toLocaleDateString() : "—";

  return (
    <div className="space-y-4 lg:space-y-6">
      <UsersToasts />
      <AppPageHero
        eyebrow="User Management"
        title={
          <>
            Manage workspace users and{" "}
            <span className="vr-brand-gradient-text">roles</span>
          </>
        }
        description="Invite new team members, assign roles, and control account status."
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="3">
            <AppPageHeroStat label="Total Users" value={totalUsers} />
            <AppPageHeroStat label="Newest User" value={newest?.fullName ?? "—"} />
            <AppPageHeroStat label="Last Added" value={newestLabel} />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

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

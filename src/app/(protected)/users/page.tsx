import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/users-manager";
import { UsersToasts } from "@/components/users-toasts";
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
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          User Management
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          Manage workspace users and roles.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Invite new team members, assign roles, and control account status.
        </p>
        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Total Users</p>
            <p className="text-lg font-semibold text-white">{totalUsers}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Newest User</p>
            <p className="text-lg font-semibold text-white">{newest?.fullName ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Last Added</p>
            <p className="text-lg font-semibold text-white">{newestLabel}</p>
          </div>
        </div>
      </section>

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

import { prisma } from "@/lib/prisma";
import { PermissionsManager } from "@/components/permissions-manager";
import { PermissionsToasts } from "@/components/permissions-toasts";
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
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Access Control
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          Permissions
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Define feature-level permissions and assign them to roles.
        </p>

        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Total Permissions</p>
            <p className="text-lg font-semibold text-white">{totalPermissions}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Newest Permission</p>
            <p className="text-lg font-semibold text-white">
              {newest ? `${newest.role.name} → ${newest.menuItem.label}` : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Last Created</p>
            <p className="text-lg font-semibold text-white">{newestLabel}</p>
          </div>
        </div>
      </section>

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

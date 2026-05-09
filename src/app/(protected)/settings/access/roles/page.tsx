import { prisma } from "@/lib/prisma";
import { RolesToasts } from "@/components/roles-toasts";
import { RolesManager } from "@/components/roles-manager";
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
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Access Control
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          Roles
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Define role tiers and assign the permissions each role can access.
        </p>

        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Total Roles</p>
            <p className="text-lg font-semibold text-white">{totalRoles}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Newest Role</p>
            <p className="text-lg font-semibold text-white">{newest?.name ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Last Created</p>
            <p className="text-lg font-semibold text-white">{newestLabel}</p>
          </div>
        </div>
      </section>

      <RolesManager
        roles={roles}
        onCreateRole={createRole}
        onUpdateRole={updateRole}
        onDeleteRole={deleteRole}
      />
    </div>
  );
}

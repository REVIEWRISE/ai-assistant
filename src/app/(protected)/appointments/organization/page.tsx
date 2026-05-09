import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileToasts } from "@/components/profile-toasts";
import { OrganizationsManager } from "@/components/organizations-manager";
import {
  createOrganization,
  deleteOrganization,
  switchOrganization,
  updateOrganizationName,
} from "@/app/(protected)/profile/actions";

export default async function AppointmentOrganizationPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    select: {
      activeOrganization: {
        select: { name: true, timezone: true, createdAt: true },
      },
      activeOrganizationId: true,
      user: {
        select: {
          organizationMembers: {
            select: {
              organization: { select: { id: true, name: true, createdAt: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!session) {
    redirect("/login");
  }

  if (!session.activeOrganization) {
    redirect("/appointments");
  }

  const organizations = session.user.organizationMembers.map((member) => member.organization);
  const totalOrganizations = organizations.length;
  const newestOrganization = organizations[organizations.length - 1];
  const newestLabel = newestOrganization
    ? new Date(newestOrganization.createdAt).toLocaleDateString()
    : "—";

  return (
    <div className="space-y-5">
      <ProfileToasts />
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Appointment Agent
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          Organization setup for booking operations
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Manage the organization context used by the appointment agent.
        </p>
        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Total Organizations</p>
            <p className="text-lg font-semibold text-white">{totalOrganizations}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Newest Organization</p>
            <p className="text-lg font-semibold text-white">{newestOrganization?.name ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Last Created</p>
            <p className="text-lg font-semibold text-white">{newestLabel}</p>
          </div>
        </div>
      </section>
      <OrganizationsManager
        organizations={organizations}
        activeOrganizationId={session.activeOrganizationId ?? ""}
        returnTo="/appointments/organization"
        onCreateOrganization={createOrganization}
        onUpdateOrganization={updateOrganizationName}
        onSwitchOrganization={switchOrganization}
        onDeleteOrganization={deleteOrganization}
      />
    </div>
  );
}

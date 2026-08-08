import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileToasts } from "@/components/profile-toasts";
import { OrganizationsManager } from "@/components/organizations-manager";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { userHasAdminRole } from "@/lib/admin-view-only";
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
      userId: true,
      activeOrganization: {
        select: { id: true, name: true, logoUrl: true, timezone: true, createdAt: true },
      },
      activeOrganizationId: true,
      user: {
        select: {
          organizationMembers: {
            select: {
              organization: { select: { id: true, name: true, logoUrl: true, createdAt: true } },
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

  const isAdmin = await userHasAdminRole(session.userId);
  // Match the header workspace selector: admins see every workspace, not only memberships.
  const organizations = isAdmin
    ? await prisma.organization.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, logoUrl: true, createdAt: true },
      })
    : session.user.organizationMembers.map((member) => member.organization);

  const totalOrganizations = organizations.length;
  const newestOrganization = organizations
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const newestLabel = newestOrganization
    ? new Date(newestOrganization.createdAt).toLocaleDateString()
    : "—";

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <ProfileToasts />
      <AppointmentPageHeader
        variant="command"
        title="Organization workspace"
        description="Choose which business the Appointment Agent should operate, or create another workspace."
        status={session.activeOrganization?.name ?? "No active organization"}
        statusTone={session.activeOrganization ? "success" : "warning"}
        metrics={[
          { label: "Organizations", value: totalOrganizations, hint: totalOrganizations === 1 ? "workspace" : "workspaces" },
          { label: "Active workspace", value: session.activeOrganization?.name ?? "Not selected" },
          { label: "Newest", value: newestOrganization?.name ?? "—", hint: newestLabel },
        ]}
      />
      <OrganizationsManager
        organizations={organizations}
        activeOrganizationId={session.activeOrganizationId ?? ""}
        canForceDelete={isAdmin}
        returnTo="/appointments/organization"
        onCreateOrganization={createOrganization}
        onUpdateOrganization={updateOrganizationName}
        onSwitchOrganization={switchOrganization}
        onDeleteOrganization={deleteOrganization}
      />
    </div>
  );
}

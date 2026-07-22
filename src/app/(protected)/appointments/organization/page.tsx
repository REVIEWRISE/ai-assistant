import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileToasts } from "@/components/profile-toasts";
import { OrganizationsManager } from "@/components/organizations-manager";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
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
        select: { name: true, logoUrl: true, timezone: true, createdAt: true },
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

  const organizations = session.user.organizationMembers.map((member) => member.organization);
  const totalOrganizations = organizations.length;
  const newestOrganization = organizations[organizations.length - 1];
  const newestLabel = newestOrganization
    ? new Date(newestOrganization.createdAt).toLocaleDateString()
    : "—";

  return (
    <div className="mx-auto max-w-[92rem] space-y-4">
      <ProfileToasts />
      <AppointmentPageHeader
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
        returnTo="/appointments/organization"
        onCreateOrganization={createOrganization}
        onUpdateOrganization={updateOrganizationName}
        onSwitchOrganization={switchOrganization}
        onDeleteOrganization={deleteOrganization}
      />
    </div>
  );
}

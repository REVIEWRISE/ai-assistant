import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileToasts } from "@/components/profile-toasts";
import { OrganizationsManager } from "@/components/organizations-manager";
import {
  AppPageHero,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
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
      <AppPageHero
        eyebrow="Appointment Agent"
        title={
          <>
            Organization setup for{" "}
            <span className="vr-brand-gradient-text">booking operations</span>
          </>
        }
        description="Manage the organization context used by the appointment agent."
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="3">
            <AppPageHeroStat label="Total Organizations" value={totalOrganizations} />
            <AppPageHeroStat label="Newest Organization" value={newestOrganization?.name ?? "—"} />
            <AppPageHeroStat label="Last Created" value={newestLabel} />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>
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

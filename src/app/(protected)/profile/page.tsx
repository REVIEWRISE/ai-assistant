import { ProfileTabs } from "@/components/profile-tabs";
import { ProfileToasts } from "@/components/profile-toasts";
import {
  AppPageHero,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
import { getAllowedMenuPathsForUser } from "@/lib/allowed-menu-paths";
import { prisma } from "@/lib/prisma";
import { isHrefAllowedForNav, redirectPathWhenMenuForbidden } from "@/lib/nav-access";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  updatePassword,
  updateProfile,
} from "./actions";

export default async function ProfileSettingsPage() {
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
      activeOrganizationId: true,
      user: {
        select: {
          fullName: true,
          email: true,
          accountStatus: true,
          emailVerified: true,
          userRoles: {
            select: {
              role: { select: { name: true } },
            },
            take: 1,
          },
          organizationMembers: {
            select: {
              organization: { select: { id: true, name: true } },
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

  const allowedPaths = await getAllowedMenuPathsForUser(session.userId);
  if (!isHrefAllowedForNav("/profile", allowedPaths)) {
    redirect(redirectPathWhenMenuForbidden(allowedPaths));
  }

  const user = session.user;
  const roleName = user.userRoles[0]?.role?.name ?? "Member";
  const orgOptions = user.organizationMembers.map((member) => member.organization);
  const activeOrg = orgOptions.find((org) => org.id === session.activeOrganizationId) ?? orgOptions[0] ?? null;
  const orgName = activeOrg?.name ?? "Workspace";
  const initials =
    user.fullName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || user.email.slice(0, 2).toUpperCase();
  const statusLabel =
    user.accountStatus?.charAt(0).toUpperCase() + user.accountStatus.slice(1);

  return (
    <div className="space-y-4 lg:space-y-6">
      <ProfileToasts />
      <AppPageHero
        eyebrow="Account Settings"
        title={
          <>
            Manage your profile and{" "}
            <span className="vr-brand-gradient-text">workspace preferences</span>
          </>
        }
        description="Keep your profile and security settings aligned with how your team operates day-to-day."
      >
        <AppPageHeroStatPanel>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-base font-bold text-[var(--color-text)]">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user.fullName}</p>
              <p className="text-xs text-slate-300">
                {roleName} • {orgName}
              </p>
            </div>
          </div>
          <AppPageHeroStatGrid columns="3">
            <AppPageHeroStat label="Role" value={roleName} />
            <AppPageHeroStat label="Status" value={statusLabel} />
            <AppPageHeroStat label="Email" value={user.emailVerified ? "Verified" : "Unverified"} />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

      <ProfileTabs
        fullName={user.fullName}
        email={user.email}
        roleName={roleName}
        onUpdateProfile={updateProfile}
        onUpdatePassword={updatePassword}
      />
    </div>
  );
}

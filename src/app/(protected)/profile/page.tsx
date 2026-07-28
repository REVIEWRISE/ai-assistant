import { Suspense } from "react";
import { ProfileTabs } from "@/components/profile-tabs";
import { ProfileToasts } from "@/components/profile-toasts";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { getAllowedMenuPathsForUser } from "@/lib/allowed-menu-paths";
import { prisma } from "@/lib/prisma";
import { isHrefAllowedForNav, redirectPathWhenMenuForbidden } from "@/lib/nav-access";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  updatePassword,
  updateProfile,
} from "./actions";

export const dynamic = "force-dynamic";

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

  const allowedPaths = await getAllowedMenuPathsForUser(
    session.userId,
    session.activeOrganizationId,
  );
  if (!isHrefAllowedForNav("/profile", allowedPaths)) {
    redirect(redirectPathWhenMenuForbidden(allowedPaths));
  }

  const user = session.user;
  const roleName = user.userRoles[0]?.role?.name ?? "Member";
  const orgOptions = user.organizationMembers.map((member) => member.organization);
  const activeOrg =
    orgOptions.find((org) => org.id === session.activeOrganizationId) ?? orgOptions[0] ?? null;
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
  const isActive = user.accountStatus?.toLowerCase() === "active";

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        <ProfileToasts />
      </Suspense>

      <AppointmentPageHeader
        variant="command"
        eyebrow="Account Settings"
        title="Your profile"
        description="Update personal details, review workspace membership, and keep your sign-in credentials current."
        status={statusLabel}
        statusTone={isActive ? "success" : "warning"}
        metrics={[
          {
            label: "Role",
            value: roleName,
            hint: "account permissions",
          },
          {
            label: "Active workspace",
            value: orgName,
            hint: "current context",
          },
          {
            label: "Workspaces",
            value: orgOptions.length,
            hint: orgOptions.length === 1 ? "membership" : "memberships",
          },
          {
            label: "Email status",
            value: user.emailVerified ? "Verified" : "Pending",
            hint: user.emailVerified ? "identity confirmed" : "verification needed",
          },
        ]}
      />

      <ProfileTabs
        initials={initials}
        fullName={user.fullName}
        email={user.email}
        roleName={roleName}
        organizationName={orgName}
        organizationCount={orgOptions.length}
        emailVerified={user.emailVerified}
        onUpdateProfile={updateProfile}
        onUpdatePassword={updatePassword}
      />
    </div>
  );
}

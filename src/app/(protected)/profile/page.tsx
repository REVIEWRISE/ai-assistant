import { ProfileTabs } from "@/components/profile-tabs";
import { ProfileToasts } from "@/components/profile-toasts";
import { prisma } from "@/lib/prisma";
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
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
              Account Settings
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
              Manage your profile and workspace preferences.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              Keep your profile, notifications, and security settings aligned
              with how your team operates day-to-day.
            </p>
          </div>

          <div className="basis-full w-full rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-base font-bold text-slate-900">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{user.fullName}</p>
                <p className="text-xs text-slate-300">
                  {roleName} • {orgName}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-white/10 px-2 py-1.5">
                <p className="text-slate-300">Role</p>
                <p className="font-semibold text-white">{roleName}</p>
              </div>
              <div className="rounded-lg bg-white/10 px-2 py-1.5">
                <p className="text-slate-300">Status</p>
                <p className="font-semibold text-white">{statusLabel}</p>
              </div>
              <div className="rounded-lg bg-white/10 px-2 py-1.5">
                <p className="text-slate-300">Email</p>
                <p className="font-semibold text-white">
                  {user.emailVerified ? "Verified" : "Unverified"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

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

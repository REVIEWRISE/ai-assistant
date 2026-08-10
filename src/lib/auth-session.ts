import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { prisma } from "@/lib/prisma";

const sessionSelect = {
  id: true,
  userId: true,
  activeOrganizationId: true,
  activeOrganization: {
    select: {
      id: true,
      name: true,
      knowledgeBase: { select: { status: true } },
    },
  },
} as const;

export type AppSession = NonNullable<Awaited<ReturnType<typeof getValidSession>>>;

/** Prefer an existing membership; admins may fall back to any workspace. */
export async function resolveDefaultOrganizationId(userId: string): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });
  if (membership?.organizationId) return membership.organizationId;

  if (await userHasAdminRole(userId)) {
    const organization = await prisma.organization.findFirst({
      select: { id: true },
      orderBy: { name: "asc" },
    });
    return organization?.id ?? null;
  }

  return null;
}

/**
 * If the session has no usable active organization, pick a default and persist it.
 * Fixes deploy/login cases where the header shows a workspace but the session is unset.
 */
export async function ensureSessionHasActiveOrganization<
  T extends {
    id: string;
    userId: string;
    activeOrganizationId: string | null;
    activeOrganization?: { id: string; name: string } | null;
  },
>(session: T): Promise<T & { activeOrganizationId: string | null }> {
  if (session.activeOrganizationId && session.activeOrganization) {
    return session;
  }

  const nextOrganizationId = await resolveDefaultOrganizationId(session.userId);
  if (!nextOrganizationId) {
    return { ...session, activeOrganizationId: null };
  }

  if (nextOrganizationId === session.activeOrganizationId && session.activeOrganization) {
    return session;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { activeOrganizationId: nextOrganizationId },
  });

  const refreshed = await prisma.session.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      userId: true,
      activeOrganizationId: true,
      activeOrganization: {
        select: {
          id: true,
          name: true,
          knowledgeBase: { select: { status: true } },
        },
      },
    },
  });

  if (!refreshed) {
    return { ...session, activeOrganizationId: nextOrganizationId };
  }

  return { ...session, ...refreshed };
}

/** One session lookup per request (shared by layout + pages). */
export const getValidSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) return null;

  return prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: sessionSelect,
  });
});

export const requireSession = cache(async (): Promise<AppSession> => {
  const session = await getValidSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, emailVerified: true },
  });
  if (user && !user.emailVerified) {
    redirect(`/verify-email/pending?email=${encodeURIComponent(user.email)}`);
  }

  return ensureSessionHasActiveOrganization(session);
});

export async function requireAdminSession(): Promise<AppSession> {
  const session = await requireSession();
  const adminRole = await prisma.userRole.findFirst({
    where: {
      userId: session.userId,
      role: { name: "Admin" },
    },
    select: { id: true },
  });

  if (!adminRole) redirect("/dashboard");
  return session;
}

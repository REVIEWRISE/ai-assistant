import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { prisma } from "@/lib/prisma";
import { hashSessionToken } from "@/lib/session-token";

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

/**
 * Prefer an existing membership for regular users.
 * Admins default to null (“All workspaces”) so ops screens stay global until they pick one.
 */
export async function resolveDefaultOrganizationId(userId: string): Promise<string | null> {
  if (await userHasAdminRole(userId)) {
    return null;
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });
  return membership?.organizationId ?? null;
}

/**
 * If the session has no usable active organization, pick a default and persist it.
 * Admins may keep null for the global “All workspaces” view.
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

  const isAdmin = await userHasAdminRole(session.userId);
  if (isAdmin) {
    if (session.activeOrganizationId && !session.activeOrganization) {
      await prisma.session.update({
        where: { id: session.id },
        data: { activeOrganizationId: null },
      });
      return { ...session, activeOrganizationId: null, activeOrganization: null };
    }
    return { ...session, activeOrganizationId: null };
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

  const tokenHash = hashSessionToken(token);

  return prisma.session.findFirst({
    where: {
      token: tokenHash,
      expiresAt: { gt: new Date() },
    },
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

export type ActiveOrganizationSession = AppSession & {
  activeOrganizationId: string;
  activeOrganization: NonNullable<AppSession["activeOrganization"]>;
};

/**
 * Product modules (appointments, reviews, voice) need one concrete workspace.
 * “All workspaces” is only for admin ops screens — redirect to the picker otherwise.
 */
export async function requireActiveOrganization(
  redirectTo = "/appointments/organization?error=organization_required",
): Promise<ActiveOrganizationSession> {
  const session = await requireSession();
  if (!session.activeOrganizationId || !session.activeOrganization) {
    redirect(redirectTo);
  }
  return session as ActiveOrganizationSession;
}

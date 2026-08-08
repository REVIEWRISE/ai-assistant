import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ensureSessionHasActiveOrganization } from "@/lib/auth-session";
import {
  getAllowedMenuPathsForUser,
  displayRoleFromUserRoles,
  userHasAdminRole,
} from "@/lib/allowed-menu-paths";
import { getOrgBilling } from "@/lib/entitlements";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawSession = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          userRoles: { include: { role: true } },
          organizationMembers: {
            select: {
              organization: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      activeOrganization: { select: { id: true, name: true } },
    },
  });

  if (!rawSession || rawSession.expiresAt < new Date()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = await ensureSessionHasActiveOrganization(rawSession);

  const roles = session.user.userRoles.map((ur) => ur.role);
  const isAdmin = userHasAdminRole(roles);
  const organizationId = session.activeOrganization?.id ?? session.activeOrganizationId ?? null;
  const [allowedPaths, billing, organizations] = await Promise.all([
    getAllowedMenuPathsForUser(session.userId, organizationId),
    organizationId ? getOrgBilling(organizationId) : Promise.resolve(null),
    isAdmin
      ? prisma.organization.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve(
          (session.user.organizationMembers ?? []).map((member) => member.organization),
        ),
  ]);

  return NextResponse.json(
    {
      user: {
        fullName: session.user.fullName,
        email: session.user.email,
        role: displayRoleFromUserRoles(roles),
        organization: session.activeOrganization?.name ?? "Workspace",
        organizationId,
      },
      organizations,
      allowedNavPaths: Array.from(allowedPaths),
      billing: billing
        ? {
            planSlug: billing.planSlug,
            billingStatus: billing.billingStatus,
            trialEndsAt: billing.trialEndsAt?.toISOString() ?? null,
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

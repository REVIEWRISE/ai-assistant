import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAllowedMenuPathsForUser, displayRoleFromUserRoles } from "@/lib/allowed-menu-paths";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = await prisma.session.findUnique({
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

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const roles = session.user.userRoles.map((ur) => ur.role);
  const allowedPaths = await getAllowedMenuPathsForUser(
    session.userId,
    session.activeOrganization?.id ?? null,
  );

  return NextResponse.json({
    user: {
      fullName: session.user.fullName,
      email: session.user.email,
      role: displayRoleFromUserRoles(roles),
      organization: session.activeOrganization?.name ?? "Workspace",
      organizationId: session.activeOrganization?.id ?? null,
    },
    organizations: (session.user.organizationMembers ?? []).map((member) => member.organization),
    allowedNavPaths: Array.from(allowedPaths),
  });
}

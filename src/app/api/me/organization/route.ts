import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";

export async function POST(req: Request) {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { organizationId?: string };
  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  if (!organizationId) {
    return NextResponse.json({ error: "organization_required" }, { status: 400 });
  }

  const isAdmin = await userHasAdminRole(session.userId);
  if (!isAdmin) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.userId, organizationId },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "organization_invalid" }, { status: 403 });
    }
  } else {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!organization) {
      return NextResponse.json({ error: "organization_invalid" }, { status: 403 });
    }
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { activeOrganizationId: organizationId },
  });

  return NextResponse.json({ ok: true });
}

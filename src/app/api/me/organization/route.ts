import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { userHasAdminRole } from "@/lib/admin-view-only";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { organizationId?: string };
  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  if (!organizationId) {
    return NextResponse.json({ error: "organization_required" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { token },
    select: { id: true, userId: true, expiresAt: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

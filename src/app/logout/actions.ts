"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function logoutUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;

  if (token) {
    // Look up session before deleting so we can write an audit event
    const session = await prisma.session.findFirst({
      where: { token },
      select: { id: true, userId: true, activeOrganizationId: true },
    });

    if (session) {
      // Invalidate the session in DB
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {/* non-blocking */});

      // Audit logout
      if (session.activeOrganizationId) {
        await prisma.auditEvent.create({
          data: {
            organizationId: session.activeOrganizationId,
            actorId: session.userId,
            action: "auth.logout",
            metadata: {},
          },
        }).catch(() => {/* non-blocking */});
      }
    }

    // Clear the httpOnly cookie server-side
    cookieStore.set("ai_session", "", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      sameSite: "lax",
    });
  }

  redirect("/login");
}

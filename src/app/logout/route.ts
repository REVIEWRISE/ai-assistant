import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Logout via GET /logout — clears the httpOnly session cookie and redirects.
 * Must be a Route Handler (not a page) so cookies can be modified.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;

  if (token) {
    const session = await prisma.session.findFirst({
      where: { token },
      select: { id: true, userId: true, activeOrganizationId: true },
    });

    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {
        /* non-blocking */
      });

      if (session.activeOrganizationId) {
        await prisma.auditEvent
          .create({
            data: {
              organizationId: session.activeOrganizationId,
              actorId: session.userId,
              action: "auth.logout",
              metadata: {},
            },
          })
          .catch(() => {
            /* non-blocking */
          });
      }
    }

    cookieStore.set("ai_session", "", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      sameSite: "lax",
    });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

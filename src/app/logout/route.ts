import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/app-origin";
import { prisma } from "@/lib/prisma";

function loginRedirectTarget(request: Request, appOrigin: string): URL {
  if (appOrigin) {
    return new URL("/login", `${appOrigin}/`);
  }

  const url = new URL("/login", request.url);
  // Dev servers often bind 0.0.0.0; browsers cannot navigate there.
  if (url.hostname === "0.0.0.0" || url.hostname === "[::]" || url.hostname === "::") {
    url.hostname = "localhost";
  }
  return url;
}

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

  const origin = await getAppOrigin();
  return NextResponse.redirect(loginRedirectTarget(request, origin));
}

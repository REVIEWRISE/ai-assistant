import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Logout via POST /logout — clears the httpOnly session cookie and redirects.
 * Must be a Route Handler (not a page) so cookies can be modified.
 *
 * POST-only, not GET: logging out deletes the session (a state change), and a
 * plain GET has none of the CSRF protection Next.js gives Server Actions —
 * a third party could force a visitor's session to end via e.g. an <img>
 * pointed at this URL. GET below is a harmless redirect only, in case
 * anything still links here with an anchor tag.
 */
export async function POST(request: Request) {
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

  // 303: browser follows up with a GET on the redirect target instead of re-POSTing.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

/** Inert — does not touch the session. Only POST actually logs out. */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url));
}

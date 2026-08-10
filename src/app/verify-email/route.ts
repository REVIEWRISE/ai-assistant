import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { consumeEmailVerificationToken } from "@/lib/email-verification";
import { resolveDefaultOrganizationId } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

function safePostVerifyPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/onboarding/plan?success=verified";
  }
  return raw;
}

function appOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const origin = appOrigin(request);

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email/pending?error=invalid", origin));
  }

  const result = await consumeEmailVerificationToken(token);
  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/verify-email/pending?error=${result.reason}`, origin),
    );
  }

  const cookieStore = await cookies();
  const responseNextPath = safePostVerifyPath(cookieStore.get("post_verify_next")?.value);
  const redirectResponse = NextResponse.redirect(new URL(responseNextPath, origin));

  const existingSession = cookieStore.get("ai_session")?.value;
  let hasValidSession = false;

  if (existingSession) {
    const session = await prisma.session.findFirst({
      where: {
        token: existingSession,
        userId: result.userId,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    hasValidSession = Boolean(session);
  }

  if (!hasValidSession) {
    const activeOrganizationId = await resolveDefaultOrganizationId(result.userId);
    const sessionToken = crypto.randomUUID();
    await prisma.session.create({
      data: {
        userId: result.userId,
        activeOrganizationId,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });
    redirectResponse.cookies.set("ai_session", sessionToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
  }

  redirectResponse.cookies.delete("post_verify_next");

  await prisma.auditEvent
    .create({
      data: {
        organizationId:
          (await resolveDefaultOrganizationId(result.userId)) ??
          "00000000-0000-0000-0000-000000000000",
        actorId: result.userId,
        action: "auth.email_verified",
        metadata: {},
      },
    })
    .catch(() => undefined);

  return redirectResponse;
}

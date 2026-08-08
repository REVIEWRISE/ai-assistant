"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { resolveDefaultOrganizationId } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

export async function loginUser(formData: FormData) {
  const ip = await getRequestIp();
  const rl = checkLoginRateLimit(ip);
  if (!rl.allowed) {
    const minutes = Math.ceil(rl.retryAfterMs / 60000);
    redirect(`/login?error=rate_limited&retry=${minutes}`);
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Audit failed login attempt (no user found — use null actor/org)
    await prisma.auditEvent.create({
      data: {
        organizationId: "00000000-0000-0000-0000-000000000000",
        actorId: null,
        action: "auth.login_failed",
        metadata: { reason: "user_not_found", email },
      },
    }).catch(() => {/* non-blocking */});
    redirect("/login?error=invalid");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });
    await prisma.auditEvent.create({
      data: {
        organizationId: membership?.organizationId ?? "00000000-0000-0000-0000-000000000000",
        actorId: user.id,
        action: "auth.login_failed",
        metadata: { reason: "invalid_password" },
      },
    }).catch(() => {/* non-blocking */});
    redirect("/login?error=invalid");
  }

  if (!user.emailVerified) {
    redirect(
      `/verify-email/pending?email=${encodeURIComponent(user.email)}&error=unverified`,
    );
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });

  let activeOrganizationId = membership?.organizationId ?? null;
  if (!activeOrganizationId) {
    activeOrganizationId = await resolveDefaultOrganizationId(user.id);
  }

  const sessionToken = crypto.randomUUID();
  await prisma.session.create({
    data: {
      userId: user.id,
      activeOrganizationId,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  // Audit successful login
  if (activeOrganizationId) {
    await prisma.auditEvent.create({
      data: {
        organizationId: activeOrganizationId,
        actorId: user.id,
        action: "auth.login_success",
        metadata: {},
      },
    }).catch(() => {/* non-blocking */});
  }

  // Clear the rate limit counter on successful login
  resetRateLimit(`login:${ip}`);

  const cookieStore = await cookies();
  cookieStore.set("ai_session", sessionToken, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  redirect("/dashboard?success=login");
}

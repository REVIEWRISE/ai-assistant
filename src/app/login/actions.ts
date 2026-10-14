"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { isValidEmail } from "@/lib/email-policy";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { isLocked, lockoutRetryAfterMs, recordFailedLogin, resetFailedLogins } from "@/lib/account-lockout";
import { writePlatformAudit } from "@/lib/platform-audit";
import { finishCredentialsLogin, isAccountBlocked } from "@/lib/login-completion";
import { setTwoFactorCookie, startLoginChallenge } from "@/lib/two-factor";

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

  if (!isValidEmail(email)) {
    redirect("/login?error=invalid_email");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Audit failed login attempt (no user found — use null actor/org)
    await writePlatformAudit({
      action: "auth.login_failed",
      metadata: { reason: "user_not_found", email },
    });
    redirect("/login?error=invalid");
  }

  if (!user.passwordHash) {
    // Same response as a wrong password so the form doesn't reveal which emails have accounts.
    await writePlatformAudit({
      actorId: user.id,
      action: "auth.login_failed",
      metadata: { reason: "no_password_set" },
    });
    redirect("/login?error=invalid");
  }

  if (isLocked(user)) {
    const minutes = Math.ceil(lockoutRetryAfterMs(user) / 60000);
    await writePlatformAudit({
      actorId: user.id,
      action: "auth.login_blocked_locked",
      metadata: { retryMinutes: minutes },
    });
    redirect(`/login?error=locked&retry=${minutes}`);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });
    await writePlatformAudit({
      actorId: user.id,
      organizationId: membership?.organizationId,
      action: "auth.login_failed",
      metadata: { reason: "invalid_password" },
    });
    await recordFailedLogin(user);
    redirect("/login?error=invalid");
  }

  // Password is correct: clear the rate limit counter and any lockout state
  resetRateLimit(`login:${ip}`);
  await resetFailedLogins(user.id);

  if (isAccountBlocked(user.accountStatus)) {
    await writePlatformAudit({
      actorId: user.id,
      action: "auth.login_blocked_suspended",
      metadata: { accountStatus: user.accountStatus },
    });
    redirect("/login?error=suspended");
  }

  if (user.twoFactorEnabled) {
    const challenge = await startLoginChallenge(user);
    await setTwoFactorCookie(challenge.rawToken);
    await writePlatformAudit({
      actorId: user.id,
      action: "auth.2fa_challenge_sent",
      metadata: { delivered: challenge.sent },
    });
    redirect(challenge.sent ? "/login/verify" : "/login/verify?error=send_failed");
  }

  await finishCredentialsLogin(user);
}

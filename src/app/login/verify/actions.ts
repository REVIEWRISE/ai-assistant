"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkTwoFactorRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { writePlatformAudit } from "@/lib/platform-audit";
import { finishCredentialsLogin } from "@/lib/login-completion";
import {
  clearTwoFactorCookie,
  readTwoFactorCookie,
  resendLoginChallengeCode,
  setTwoFactorCookie,
  verifyLoginChallenge,
} from "@/lib/two-factor";

async function enforceRateLimit() {
  const ip = await getRequestIp();
  const rl = checkTwoFactorRateLimit(ip);
  if (!rl.allowed) {
    const minutes = Math.ceil(rl.retryAfterMs / 60000);
    redirect(`/login/verify?error=rate_limited&retry=${minutes}`);
  }
}

export async function verifyLoginCode(formData: FormData) {
  await enforceRateLimit();

  const token = await readTwoFactorCookie();
  if (!token) redirect("/login?error=2fa_expired");

  const code = String(formData.get("code") || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) {
    redirect("/login/verify?error=format");
  }

  const result = await verifyLoginChallenge(token, code);
  if (!result.ok) {
    if (result.userId) {
      await writePlatformAudit({
        actorId: result.userId,
        action: "auth.2fa_failed",
        metadata: { reason: result.reason },
      });
    }
    if (result.reason === "wrong_code") redirect("/login/verify?error=wrong_code");
    await clearTwoFactorCookie();
    redirect(`/login?error=${result.reason === "too_many_attempts" ? "2fa_locked" : "2fa_expired"}`);
  }

  await clearTwoFactorCookie();

  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    select: { id: true, email: true, emailVerified: true, accountStatus: true },
  });
  if (!user) redirect("/login?error=invalid");

  await finishCredentialsLogin(user, { twoFactor: true });
}

export async function resendLoginCode() {
  await enforceRateLimit();

  const token = await readTwoFactorCookie();
  if (!token) redirect("/login?error=2fa_expired");

  const result = await resendLoginChallengeCode(token);
  if (!result.ok) {
    await clearTwoFactorCookie();
    redirect("/login?error=2fa_expired");
  }

  // Refresh the cookie lifetime to match the renewed challenge.
  await setTwoFactorCookie(token);
  redirect(result.sent ? "/login/verify?status=resent" : "/login/verify?error=send_failed");
}

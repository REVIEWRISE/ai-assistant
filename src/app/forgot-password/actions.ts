"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { writePlatformAudit } from "@/lib/platform-audit";
import { sendPasswordResetEmail } from "@/lib/password-reset";

export async function requestPasswordReset(formData: FormData) {
  const ip = await getRequestIp();
  const rl = checkLoginRateLimit(ip);
  if (!rl.allowed) {
    const minutes = Math.ceil(rl.retryAfterMs / 60000);
    redirect(`/forgot-password?error=rate_limited&retry=${minutes}`);
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) {
    redirect("/forgot-password?error=missing");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      authIdentities: {
        select: { provider: true },
      },
    },
  });

  if (!user) {
    // Audit failed attempt for non-existent user
    await writePlatformAudit({
      action: "auth.password_reset_requested_unknown",
      metadata: { email },
    });
    // For security reasons, display success message to prevent user enumeration
    redirect(`/forgot-password?status=sent&email=${encodeURIComponent(email)}`);
  }

  const result = await sendPasswordResetEmail({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
  });

  await writePlatformAudit({
    actorId: user.id,
    action: "auth.password_reset_requested",
    metadata: { email: user.email, skippedSmtp: result.skipped ?? false },
  });

  let redirectUrl = `/forgot-password?status=sent&email=${encodeURIComponent(email)}`;
  if (result.sent) {
    redirectUrl += "&delivered=true";
  } else if (result.error) {
    redirectUrl += `&smtpError=${encodeURIComponent(result.error)}`;
  }

  // In development, also provide the reset link in query params so it can be previewed/tested immediately
  if (process.env.NODE_ENV !== "production" && result.resetUrl) {
    redirectUrl += `&devUrl=${encodeURIComponent(result.resetUrl)}`;
  }

  redirect(redirectUrl);
}

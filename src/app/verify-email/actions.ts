"use server";

import { redirect } from "next/navigation";
import { sendEmailVerification } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { checkVerificationResendRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

export async function resendVerificationEmail(formData: FormData) {
  const ip = await getRequestIp();
  const rl = checkVerificationResendRateLimit(ip);
  if (!rl.allowed) {
    redirect("/verify-email/pending?error=rate_limited");
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) {
    redirect("/verify-email/pending?error=missing");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true, emailVerified: true },
  });

  // Avoid email enumeration for unknown addresses.
  if (!user) {
    redirect(`/verify-email/pending?email=${encodeURIComponent(email)}&sent=1`);
  }

  if (user.emailVerified) {
    redirect(`/login?success=already_verified`);
  }

  const sendResult = await sendEmailVerification({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
  });

  if (!sendResult.sent) {
    redirect(
      `/verify-email/pending?email=${encodeURIComponent(email)}&error=${
        sendResult.skipped ? "smtp_unavailable" : "send_failed"
      }`,
    );
  }

  redirect(`/verify-email/pending?email=${encodeURIComponent(email)}&sent=1`);
}

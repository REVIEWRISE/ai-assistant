"use server";

import { redirect } from "next/navigation";
import { consumePasswordReset, validatePasswordResetToken } from "@/lib/password-reset";
import { writePlatformAudit } from "@/lib/platform-audit";

export async function performPasswordReset(formData: FormData) {
  const token = String(formData.get("token") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!token) {
    redirect("/forgot-password?error=invalid");
  }

  if (!password || !confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=missing`);
  }

  if (password !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=mismatch`);
  }

  const validateRes = await validatePasswordResetToken(token);
  if (!validateRes.ok) {
    redirect(`/forgot-password?error=${validateRes.reason}`);
  }

  const result = await consumePasswordReset(token, password);
  if (!result.ok) {
    if (result.reason === "weak_password" || result.reason === "weak_password_personal") {
      redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${result.reason}`);
    }
    redirect(`/forgot-password?error=${result.reason}`);
  }

  await writePlatformAudit({
    actorId: validateRes.user.id,
    action: "auth.password_reset_success",
    metadata: { email: validateRes.user.email },
  });

  redirect("/login?success=password_reset");
}

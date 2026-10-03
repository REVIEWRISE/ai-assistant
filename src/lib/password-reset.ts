import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { PRODUCT_NAME } from "@/lib/brand";
import { getAppUrl } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";
import { isSmtpConfigured, sendSmtpHtmlEmail } from "@/lib/smtp-mail";

const log = createLogger("password-reset");

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPasswordResetEmailHtml(params: {
  fullName: string;
  resetUrl: string;
}): string {
  const name = escapeHtml(params.fullName.trim() || "there");
  const url = escapeHtml(params.resetUrl);
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;background:#0c0c0c;">
              <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#a1a1aa;">${escapeHtml(PRODUCT_NAME)}</p>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.2;color:#ffffff;">Reset your password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#18181b;line-height:1.6;">Hi ${name},</p>
              <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.65;">
                We received a request to reset your ${PRODUCT_NAME} account password. Click the button below to choose a new password. This link is valid for 1 hour.
              </p>
              <p style="margin:0 0 24px;">
                <a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#111111;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                  Reset password
                </a>
              </p>
              <p style="margin:0 0 16px;font-size:12px;color:#71717a;line-height:1.6;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;">
                If the button does not work, copy and paste this link into your browser:<br />
                <a href="${url}" style="color:#18181b;word-break:break-all;">${url}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function issuePasswordResetToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);

  return rawToken;
}

export async function sendPasswordResetEmail(params: {
  userId: string;
  email: string;
  fullName: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string; resetUrl: string }> {
  const rawToken = await issuePasswordResetToken(params.userId);
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;

  if (!isSmtpConfigured()) {
    log.warn("SMTP not configured — password reset email skipped", {
      userId: params.userId,
      resetUrl,
    });
    return { sent: false, skipped: true, resetUrl };
  }

  const result = await sendSmtpHtmlEmail({
    to: params.email,
    subject: `Reset your ${PRODUCT_NAME} password`,
    html: buildPasswordResetEmailHtml({
      fullName: params.fullName,
      resetUrl,
    }),
  });

  if (!result.ok) {
    log.error("Failed to send password reset email", {
      userId: params.userId,
      error: result.error ?? "unknown",
      skipped: result.skipped,
    });
    return { sent: false, skipped: result.skipped, error: result.error, resetUrl };
  }

  return { sent: true, resetUrl };
}

export async function validatePasswordResetToken(
  rawToken: string,
): Promise<{ ok: true; user: { id: string; email: string; fullName: string } } | { ok: false; reason: "invalid" | "expired" }> {
  if (!rawToken || !rawToken.trim()) return { ok: false, reason: "invalid" };
  const tokenHash = hashToken(rawToken.trim());
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, email: true, fullName: true },
      },
    },
  });

  if (!record) return { ok: false, reason: "invalid" };
  if (record.expiresAt.getTime() <= Date.now()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => undefined);
    return { ok: false, reason: "expired" };
  }

  return { ok: true, user: record.user };
}

export async function consumePasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "expired" | "weak_password" }> {
  if (newPassword.length < 8) {
    return { ok: false, reason: "weak_password" };
  }

  const validRes = await validatePasswordResetToken(rawToken);
  if (!validRes.ok) return validRes;

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: validRes.user.id },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: validRes.user.id } }),
    // Delete any existing sessions to log out active sessions on password reset
    prisma.session.deleteMany({ where: { userId: validRes.user.id } }),
  ]);

  return { ok: true };
}

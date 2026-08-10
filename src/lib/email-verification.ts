import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { PRODUCT_NAME } from "@/lib/brand";
import { getAppUrl } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";
import { isSmtpConfigured, sendSmtpHtmlEmail } from "@/lib/smtp-mail";

const log = createLogger("email-verification");

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

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

function buildVerificationEmailHtml(params: {
  fullName: string;
  verifyUrl: string;
}): string {
  const name = escapeHtml(params.fullName.trim() || "there");
  const url = escapeHtml(params.verifyUrl);
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
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.2;color:#ffffff;">Verify your email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#18181b;line-height:1.6;">Hi ${name},</p>
              <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.65;">
                Confirm your email address to finish setting up your workspace. This link expires in 24 hours.
              </p>
              <p style="margin:0 0 24px;">
                <a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#111111;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                  Verify email address
                </a>
              </p>
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;">
                If the button does not work, paste this link into your browser:<br />
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

export async function issueEmailVerificationToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);

  return rawToken;
}

export async function sendEmailVerification(params: {
  userId: string;
  email: string;
  fullName: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const rawToken = await issueEmailVerificationToken(params.userId);
  const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;

  if (!isSmtpConfigured()) {
    log.warn("SMTP not configured — verification email skipped", {
      userId: params.userId,
      verifyUrl: process.env.NODE_ENV === "production" ? undefined : verifyUrl,
    });
    return { sent: false, skipped: true };
  }

  const result = await sendSmtpHtmlEmail({
    to: params.email,
    subject: `Verify your ${PRODUCT_NAME} email`,
    html: buildVerificationEmailHtml({
      fullName: params.fullName,
      verifyUrl,
    }),
  });

  if (!result.ok) {
    log.error("failed to send verification email", {
      userId: params.userId,
      error: result.error ?? "unknown",
      skipped: result.skipped,
    });
    return { sent: false, skipped: result.skipped, error: result.error };
  }

  return { sent: true };
}

export async function consumeEmailVerificationToken(
  rawToken: string,
): Promise<{ ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" }> {
  const tokenHash = hashToken(rawToken.trim());
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!record) return { ok: false, reason: "invalid" };
  if (record.expiresAt.getTime() <= Date.now()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => undefined);
    return { ok: false, reason: "expired" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true, updatedAt: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { ok: true, userId: record.userId };
}

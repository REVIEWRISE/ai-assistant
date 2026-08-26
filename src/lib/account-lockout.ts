import { prisma } from "@/lib/prisma";
import { PRODUCT_NAME } from "@/lib/brand";
import { createLogger } from "@/lib/logger";
import { isSmtpConfigured, sendSmtpHtmlEmail } from "@/lib/smtp-mail";

const log = createLogger("account-lockout");

// SOC 2 CC6.1 — brute-force protection on top of the existing per-IP rate
// limit (src/lib/rate-limit.ts). Rate limiting throttles a single IP; this
// throttles a single account regardless of how many IPs an attacker rotates
// through.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isLocked(user: { lockedUntil: Date | null }): boolean {
  return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
}

export function lockoutRetryAfterMs(user: { lockedUntil: Date | null }): number {
  if (!user.lockedUntil) return 0;
  return Math.max(0, user.lockedUntil.getTime() - Date.now());
}

/**
 * Records a failed login attempt. Locks the account once MAX_FAILED_ATTEMPTS
 * is reached and fires a (best-effort, non-blocking) notification email.
 */
export async function recordFailedLogin(user: {
  id: string;
  email: string;
  fullName: string;
  failedLoginAttempts: number;
}): Promise<void> {
  const attempts = user.failedLoginAttempts + 1;
  const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: shouldLock ? 0 : attempts, // reset counter once a lockout is applied
      lockedUntil,
    },
  });

  if (shouldLock) {
    notifyAccountLocked({ email: user.email, fullName: user.fullName }).catch(() => {
      /* best-effort — never block the login flow on email delivery */
    });
  }
}

/** Clears lockout state after a successful login. */
export async function resetFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}

async function notifyAccountLocked(params: { email: string; fullName: string }): Promise<void> {
  if (!isSmtpConfigured()) {
    log.warn("SMTP not configured — lockout notification skipped", { email: params.email });
    return;
  }

  const name = escapeHtml(params.fullName.trim() || "there");
  const minutes = Math.round(LOCKOUT_DURATION_MS / 60000);
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;background:#0c0c0c;">
              <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#a1a1aa;">${escapeHtml(PRODUCT_NAME)}</p>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.2;color:#ffffff;">Account temporarily locked</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#18181b;line-height:1.6;">Hi ${name},</p>
              <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.65;">
                We locked your account for ${minutes} minutes after ${MAX_FAILED_ATTEMPTS} failed sign-in attempts.
                If this was you, just try again after the lockout period. If it wasn't, you should change your password once you're back in.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const result = await sendSmtpHtmlEmail({
    to: params.email,
    subject: `Your ${PRODUCT_NAME} account was temporarily locked`,
    html,
  });

  if (!result.ok) {
    log.error("failed to send lockout notification", { email: params.email, error: result.error });
  }
}

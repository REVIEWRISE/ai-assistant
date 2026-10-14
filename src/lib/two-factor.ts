import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PRODUCT_NAME } from "@/lib/brand";
import { createLogger } from "@/lib/logger";
import { isSmtpConfigured, sendSmtpHtmlEmail } from "@/lib/smtp-mail";

const log = createLogger("two-factor");

export const TWO_FACTOR_COOKIE = "ai_2fa";
const CHALLENGE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const MAX_ATTEMPTS = 5;

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildLoginCodeEmailHtml(params: { fullName: string; code: string }): string {
  const name = escapeHtml(params.fullName.trim() || "there");
  const code = escapeHtml(params.code);
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
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.2;color:#ffffff;">Your sign-in code</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#18181b;line-height:1.6;">Hi ${name},</p>
              <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.65;">
                Enter this code to finish signing in. It expires in 10 minutes.
              </p>
              <p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#111111;">${code}</p>
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;">
                If you did not try to sign in, someone may know your password. Change it from your profile settings.
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

async function sendLoginCode(params: {
  userId: string;
  email: string;
  fullName: string;
  code: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    log.warn("SMTP not configured — two-step sign-in code email skipped", {
      userId: params.userId,
      code: process.env.NODE_ENV === "production" ? undefined : params.code,
    });
    return { sent: false, skipped: true };
  }

  const result = await sendSmtpHtmlEmail({
    to: params.email,
    subject: `Your ${PRODUCT_NAME} sign-in code`,
    html: buildLoginCodeEmailHtml({ fullName: params.fullName, code: params.code }),
  });

  if (!result.ok) {
    log.error("failed to send two-step sign-in code", {
      userId: params.userId,
      error: result.error ?? "unknown",
      skipped: result.skipped,
    });
    return { sent: false, skipped: result.skipped, error: result.error };
  }

  return { sent: true };
}

/** Replace any pending challenge for the user, email a fresh code, and return the raw cookie token. */
export async function startLoginChallenge(user: {
  id: string;
  email: string;
  fullName: string;
}): Promise<{ rawToken: string; sent: boolean; error?: string }> {
  const rawToken = randomBytes(32).toString("hex");
  const code = generateCode();

  await prisma.$transaction([
    prisma.loginChallenge.deleteMany({ where: { userId: user.id } }),
    prisma.loginChallenge.create({
      data: {
        userId: user.id,
        tokenHash: hashValue(rawToken),
        codeHash: hashValue(code),
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      },
    }),
  ]);

  const result = await sendLoginCode({ userId: user.id, email: user.email, fullName: user.fullName, code });
  return { rawToken, sent: result.sent || Boolean(result.skipped), error: result.error };
}

/** Issue a new code for an existing, unexpired challenge (resets attempts and expiry). */
export async function resendLoginChallengeCode(
  rawToken: string,
): Promise<{ ok: true; sent: boolean } | { ok: false }> {
  const record = await prisma.loginChallenge.findUnique({
    where: { tokenHash: hashValue(rawToken) },
    select: {
      id: true,
      expiresAt: true,
      user: { select: { id: true, email: true, fullName: true } },
    },
  });
  if (!record || record.expiresAt.getTime() <= Date.now()) return { ok: false };

  const code = generateCode();
  await prisma.loginChallenge.update({
    where: { id: record.id },
    data: {
      codeHash: hashValue(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  const result = await sendLoginCode({
    userId: record.user.id,
    email: record.user.email,
    fullName: record.user.fullName,
    code,
  });
  return { ok: true, sent: result.sent || Boolean(result.skipped) };
}

export type VerifyLoginChallengeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" | "wrong_code"; userId?: string };

/** Check a submitted code. Consumes the challenge on success or once attempts run out. */
export async function verifyLoginChallenge(
  rawToken: string,
  code: string,
): Promise<VerifyLoginChallengeResult> {
  const record = await prisma.loginChallenge.findUnique({
    where: { tokenHash: hashValue(rawToken) },
    select: { id: true, userId: true, codeHash: true, attempts: true, expiresAt: true },
  });

  if (!record) return { ok: false, reason: "invalid" };
  if (record.expiresAt.getTime() <= Date.now()) {
    await prisma.loginChallenge.delete({ where: { id: record.id } }).catch(() => undefined);
    return { ok: false, reason: "expired", userId: record.userId };
  }

  const submitted = Buffer.from(hashValue(code.trim()), "hex");
  const expected = Buffer.from(record.codeHash, "hex");
  if (submitted.length === expected.length && timingSafeEqual(submitted, expected)) {
    await prisma.loginChallenge.deleteMany({ where: { userId: record.userId } });
    return { ok: true, userId: record.userId };
  }

  const attempts = record.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await prisma.loginChallenge.delete({ where: { id: record.id } }).catch(() => undefined);
    return { ok: false, reason: "too_many_attempts", userId: record.userId };
  }

  await prisma.loginChallenge.update({ where: { id: record.id }, data: { attempts } });
  return { ok: false, reason: "wrong_code", userId: record.userId };
}

export async function setTwoFactorCookie(rawToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TWO_FACTOR_COOKIE, rawToken, {
    path: "/login",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: CHALLENGE_TTL_MS / 1000,
    sameSite: "lax",
  });
}

export async function readTwoFactorCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TWO_FACTOR_COOKIE)?.value ?? null;
}

export async function clearTwoFactorCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TWO_FACTOR_COOKIE, "", { path: "/login", maxAge: 0 });
}

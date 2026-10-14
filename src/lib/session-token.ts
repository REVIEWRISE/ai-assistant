import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * SHA-256 hash for session tokens before storing in the database.
 * Prevents plain-text session token theft if a read-only database backup is leaked.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Generate a cryptographically random session token (32 bytes / 64 hex chars)
 * and its SHA-256 hash for database storage.
 */
export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Invalidate active sessions for a user (e.g. on password change, lockout, suspension).
 * If exceptSessionId is provided, that session remains active.
 */
export async function invalidateUserSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      userId,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
  });
  return result.count;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Create a DB session for the user and set the `ai_session` + `last_auth_provider` cookies.
 * Must be called from a server action or route handler.
 */
export async function createUserSession(
  userId: string,
  activeOrganizationId: string | null,
  provider: "credentials" | "google",
): Promise<void> {
  const { rawToken, tokenHash } = generateSessionToken();
  await prisma.session.create({
    data: {
      userId,
      activeOrganizationId,
      token: tokenHash,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("ai_session", rawToken, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    sameSite: "lax",
  });
  cookieStore.set("last_auth_provider", provider, {
    path: "/",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });
}

import { createHash, randomBytes } from "crypto";
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

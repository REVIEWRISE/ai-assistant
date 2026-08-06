/**
 * Resolve the best-available client IP from Next.js server action / route handler context.
 * Trusts X-Forwarded-For set by the nginx reverse proxy.
 */
import { headers } from "next/headers";

export async function getRequestIp(): Promise<string> {
  const hdrs = await headers();
  // nginx sets X-Real-IP to the direct client IP
  const realIp = hdrs.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Fallback: first entry in X-Forwarded-For
  const forwarded = hdrs.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "unknown";
}

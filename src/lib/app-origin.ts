import { headers } from "next/headers";

function sanitizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`);
    if (url.hostname === "0.0.0.0" || url.hostname === "[::]" || url.hostname === "::") {
      url.hostname = "localhost";
    }
    return url.origin;
  } catch {
    return trimmed;
  }
}

/** Public base URL for links and embeds (no trailing slash). */
export async function getAppOrigin(): Promise<string> {
  const fromEnv = sanitizeOrigin(process.env.NEXT_PUBLIC_APP_URL ?? "");
  if (fromEnv) return fromEnv;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return sanitizeOrigin(`${proto}://${host}`);
  return "";
}

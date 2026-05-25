import { getValidSession } from "@/lib/auth-session";

/** True when the request has a non-expired `ai_session` cookie. For public pages (e.g. landing CTAs). */
export async function hasValidSession(): Promise<boolean> {
  const session = await getValidSession();
  return Boolean(session);
}

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/** True when the request has a non-expired `ai_session` cookie. For public pages (e.g. landing CTAs). */
export async function hasValidSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) return false;

  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  return Boolean(session);
}

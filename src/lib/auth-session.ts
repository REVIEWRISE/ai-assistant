import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const sessionSelect = {
  id: true,
  userId: true,
  activeOrganizationId: true,
  activeOrganization: {
    select: {
      id: true,
      name: true,
      knowledgeBase: { select: { status: true } },
    },
  },
} as const;

export type AppSession = NonNullable<Awaited<ReturnType<typeof getValidSession>>>;

/** One session lookup per request (shared by layout + pages). */
export const getValidSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) return null;

  return prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: sessionSelect,
  });
});

export async function requireSession(): Promise<AppSession> {
  const session = await getValidSession();
  if (!session) redirect("/login");
  return session;
}

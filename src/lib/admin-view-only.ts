import { prisma } from "@/lib/prisma";

export async function userHasAdminRole(userId: string): Promise<boolean> {
  const adminRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: { name: "Admin" },
    },
    select: { id: true },
  });

  return Boolean(adminRole);
}

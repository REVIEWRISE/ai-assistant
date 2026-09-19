import "server-only";

import { prisma } from "@/lib/prisma";

export async function purgeOrganization(input: {
  organizationId: string;
  sessionId: string;
  fallbackOrganizationId: string | null;
}): Promise<void> {
  const { organizationId, sessionId, fallbackOrganizationId } = input;

  await prisma.$transaction(async (tx) => {
    await tx.session.updateMany({
      where: { activeOrganizationId: organizationId },
      data: { activeOrganizationId: null },
    });

    await tx.session.update({
      where: { id: sessionId },
      data: { activeOrganizationId: fallbackOrganizationId },
    });

    await tx.billingWebhookEvent.deleteMany({
      where: { organizationId },
    });

    await tx.organization.delete({
      where: { id: organizationId },
    });
  });
}

export async function fallbackOrganizationIdForAdmin(
  organizationId: string,
): Promise<string | null> {
  const other = await prisma.organization.findFirst({
    where: { id: { not: organizationId } },
    orderBy: { name: "asc" },
    select: { id: true },
  });
  return other?.id ?? null;
}

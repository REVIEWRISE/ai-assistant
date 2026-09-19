import "server-only";

import { prisma } from "@/lib/prisma";

/** Legacy sentinel some older events used. New writes never use this id. */
export const PLATFORM_AUDIT_ORG_ID = "00000000-0000-0000-0000-000000000000";

async function resolveAuditOrganizationId(
  preferredOrganizationId?: string | null,
): Promise<string | null> {
  const preferred = preferredOrganizationId?.trim();
  if (preferred && preferred !== PLATFORM_AUDIT_ORG_ID) {
    const match = await prisma.organization.findUnique({
      where: { id: preferred },
      select: { id: true },
    });
    if (match) return match.id;
  }

  const fallback = await prisma.organization.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return fallback?.id ?? null;
}

/** Write an audit row without using a fake organization id that violates the FK. */
export async function writePlatformAudit(input: {
  action: string;
  actorId?: string | null;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const organizationId = await resolveAuditOrganizationId(input.organizationId);
  if (!organizationId) return;

  await prisma.auditEvent
    .create({
      data: {
        organizationId,
        actorId: input.actorId ?? null,
        action: input.action,
        metadata: {
          scope: "platform",
          ...(input.metadata ?? {}),
        },
      },
    })
    .catch(() => {
      /* non-blocking */
    });
}

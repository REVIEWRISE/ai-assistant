import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { AuditEventsManager } from "@/components/audit-events-manager";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RECENT_EVENT_LIMIT = 500;

export default async function PlatformAuditPage() {
  await requireAdminSession();

  const since24HoursAgo = new Date();
  since24HoursAgo.setUTCDate(since24HoursAgo.getUTCDate() - 1);

  const [events, organizations, totalInDatabase, recentDayCount] = await Promise.all([
    prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_EVENT_LIMIT,
      include: {
        actor: { select: { id: true, fullName: true, email: true } },
        organization: { select: { id: true, name: true } },
      },
    }),
    prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 300,
    }),
    prisma.auditEvent.count(),
    prisma.auditEvent.count({
      where: {
        createdAt: { gte: since24HoursAgo },
      },
    }),
  ]);

  const uniqueActions = new Set(events.map((event) => event.action)).size;
  const uniqueActors = new Set(
    events.map((event) => event.actorId).filter((id): id is string => Boolean(id)),
  ).size;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <AppointmentPageHeader
        variant="command"
        eyebrow="Platform Settings"
        title="Audit log"
        description="Inspect authentication, administration, and system events across every organization."
        status={recentDayCount > 0 ? `${recentDayCount} in last 24h` : "Quiet last 24h"}
        statusTone={recentDayCount > 0 ? "success" : "warning"}
        actions={[{ href: "/platform", label: "Platform overview" }]}
        metrics={[
          {
            label: "Stored events",
            value: totalInDatabase,
            hint:
              totalInDatabase > RECENT_EVENT_LIMIT
                ? `viewing latest ${RECENT_EVENT_LIMIT}`
                : "full history loaded",
          },
          {
            label: "Last 24 hours",
            value: recentDayCount,
            hint: "recent activity",
          },
          {
            label: "Action types",
            value: uniqueActions,
            hint: "in loaded window",
          },
          {
            label: "Actors",
            value: uniqueActors,
            hint: "users in loaded window",
          },
        ]}
      />

      <AuditEventsManager
        events={events.map((event) => ({
          id: event.id,
          action: event.action,
          organizationId: event.organizationId,
          organizationName: event.organization.name,
          actorId: event.actorId,
          actorName: event.actor?.fullName ?? null,
          actorEmail: event.actor?.email ?? null,
          metadata: event.metadata,
          createdAt: event.createdAt,
        }))}
        organizations={organizations}
        totalInDatabase={totalInDatabase}
      />
    </div>
  );
}

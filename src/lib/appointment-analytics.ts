import { prisma } from "@/lib/prisma";

export type AppointmentTrendDay = {
  dayLabel: string;
  recorded: number;
  synced: number;
};

export type AppointmentAnalytics = {
  trend: AppointmentTrendDay[];
  totalLast30Days: number;
  postedToCalendarLast30Days: number;
  awaitingCalendarLast30Days: number;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function isPostedToCalendar(a: {
  providerSyncStatus: string;
  externalCalendarEventId: string | null;
}): boolean {
  return a.providerSyncStatus === "synced" || Boolean(a.externalCalendarEventId);
}

/**
 * Last 7 UTC days of booking activity plus 30-day rollups for the organization.
 */
export async function getAppointmentAnalytics(
  organizationId: string,
  now: Date,
): Promise<AppointmentAnalytics> {
  const endDay = startOfUtcDay(now);
  const startDay = new Date(endDay);
  startDay.setUTCDate(startDay.getUTCDate() - 6);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      createdAt: { gte: startDay, lte: now },
    },
    select: {
      createdAt: true,
      providerSyncStatus: true,
      externalCalendarEventId: true,
    },
  });

  const trend: AppointmentTrendDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDay);
    d.setUTCDate(startDay.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();

    const dayLabel = new Date(Date.UTC(y, m, day)).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

    let recorded = 0;
    let synced = 0;
    for (const a of appointments) {
      const c = a.createdAt;
      if (c.getUTCFullYear() !== y || c.getUTCMonth() !== m || c.getUTCDate() !== day) continue;
      recorded += 1;
      if (isPostedToCalendar(a)) synced += 1;
    }
    trend.push({ dayLabel, recorded, synced });
  }

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [totalLast30Days, postedToCalendarLast30Days] = await Promise.all([
    prisma.appointment.count({
      where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.appointment.count({
      where: {
        organizationId,
        createdAt: { gte: thirtyDaysAgo },
        OR: [{ providerSyncStatus: "synced" }, { externalCalendarEventId: { not: null } }],
      },
    }),
  ]);

  const awaitingCalendarLast30Days = await prisma.appointment.count({
    where: {
      organizationId,
      createdAt: { gte: thirtyDaysAgo },
      externalCalendarEventId: null,
      NOT: { providerSyncStatus: "synced" },
    },
  });

  return {
    trend,
    totalLast30Days,
    postedToCalendarLast30Days,
    awaitingCalendarLast30Days,
  };
}

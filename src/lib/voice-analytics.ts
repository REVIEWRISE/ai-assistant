import { prisma } from "@/lib/prisma";

export type VoiceTrendDay = {
  dayLabel: string;
  calls: number;
  bookings: number;
};

export type VoiceAnalytics = {
  trend: VoiceTrendDay[];
  totalCallsLast30Days: number;
  voiceBookingsLast30Days: number;
  inboundCallsLast30Days: number;
  avgDurationSeconds: number;
  sentimentCounts: Array<{ label: string; value: number }>;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function normalizeSentiment(sentiment: string | null): "Positive" | "Neutral" | "Negative" {
  const value = (sentiment ?? "").toLowerCase().trim();
  if (value === "positive" || value === "friendly") return "Positive";
  if (value === "negative" || value === "frustrated") return "Negative";
  return "Neutral";
}

export async function getVoiceAnalytics(
  organizationId: string,
  now: Date,
): Promise<VoiceAnalytics> {
  const endDay = startOfUtcDay(now);
  const startDay = new Date(endDay);
  startDay.setUTCDate(startDay.getUTCDate() - 6);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [recentCalls, recentBookings, callsLast30Days, bookingsLast30Days, inboundLast30Days] =
    await Promise.all([
      prisma.retellCall.findMany({
        where: {
          organizationId,
          createdAt: { gte: startDay, lte: now },
        },
        select: { createdAt: true },
      }),
      prisma.appointment.findMany({
        where: {
          organizationId,
          source: "voice_retell",
          createdAt: { gte: startDay, lte: now },
        },
        select: { createdAt: true },
      }),
      prisma.retellCall.findMany({
        where: {
          organizationId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          durationSeconds: true,
          direction: true,
          sentiment: true,
        },
      }),
      prisma.appointment.count({
        where: {
          organizationId,
          source: "voice_retell",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.retellCall.count({
        where: {
          organizationId,
          createdAt: { gte: thirtyDaysAgo },
          direction: "inbound",
        },
      }),
    ]);

  const trend: VoiceTrendDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDay);
    d.setUTCDate(startDay.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();

    let calls = 0;
    let bookings = 0;

    for (const call of recentCalls) {
      const created = call.createdAt;
      if (created.getUTCFullYear() === y && created.getUTCMonth() === m && created.getUTCDate() === day) {
        calls += 1;
      }
    }

    for (const booking of recentBookings) {
      const created = booking.createdAt;
      if (created.getUTCFullYear() === y && created.getUTCMonth() === m && created.getUTCDate() === day) {
        bookings += 1;
      }
    }

    trend.push({
      dayLabel: formatDayLabel(new Date(Date.UTC(y, m, day))),
      calls,
      bookings,
    });
  }

  const totalCallsLast30Days = callsLast30Days.length;
  const avgDurationSeconds =
    totalCallsLast30Days > 0
      ? Math.round(
          callsLast30Days.reduce((sum, call) => sum + call.durationSeconds, 0) / totalCallsLast30Days,
        )
      : 0;

  const sentimentMap = new Map<string, number>([
    ["Positive", 0],
    ["Neutral", 0],
    ["Negative", 0],
  ]);
  for (const call of callsLast30Days) {
    const bucket = normalizeSentiment(call.sentiment);
    sentimentMap.set(bucket, (sentimentMap.get(bucket) ?? 0) + 1);
  }

  return {
    trend,
    totalCallsLast30Days,
    voiceBookingsLast30Days: bookingsLast30Days,
    inboundCallsLast30Days: inboundLast30Days,
    avgDurationSeconds,
    sentimentCounts: Array.from(sentimentMap.entries()).map(([label, value]) => ({ label, value })),
  };
}

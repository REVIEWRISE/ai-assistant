import { prisma } from "@/lib/prisma";
import { normalizePhoneDigits } from "@/lib/retell-phone-numbers";

export type RetellPhoneNumberStats = {
  phoneNumber: string;
  phoneNumberPretty: string | null;
  nickname: string | null;
  retellAgentId: string | null;
  isPrimary: boolean;
  callsReceived: number;
  callsProcessed: number;
  bookingsCount: number;
};

export async function getOrgRetellPhoneNumberStats(
  organizationId: string,
  days = 30,
): Promise<RetellPhoneNumberStats[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const [phones, calls, bookings] = await Promise.all([
    prisma.retellPhoneNumber.findMany({
      where: { organizationId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    }),
    prisma.retellCall.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: {
        callId: true,
        toNumber: true,
        summary: true,
        durationSeconds: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        organizationId,
        source: "voice_retell",
        createdAt: { gte: since },
        retellCallId: { not: null },
      },
      select: { retellCallId: true },
    }),
  ]);

  const bookingCallIds = new Set(
    bookings.map((b) => b.retellCallId).filter((id): id is string => Boolean(id?.trim())),
  );

  const callsByLine = new Map<string, typeof calls>();
  for (const call of calls) {
    const key = normalizePhoneDigits(call.toNumber ?? "");
    if (!key) continue;
    const bucket = callsByLine.get(key) ?? [];
    bucket.push(call);
    callsByLine.set(key, bucket);
  }

  return phones.map((phone) => {
    const key = normalizePhoneDigits(phone.phoneNumber);
    const lineCalls = callsByLine.get(key) ?? [];
    const callsReceived = lineCalls.length;
    const callsProcessed = lineCalls.filter(
      (call) => Boolean(call.summary?.trim()) || call.durationSeconds > 0,
    ).length;
    const bookingsCount = lineCalls.filter((call) => bookingCallIds.has(call.callId)).length;

    return {
      phoneNumber: phone.phoneNumber,
      phoneNumberPretty: phone.phoneNumberPretty,
      nickname: phone.nickname,
      retellAgentId: phone.retellAgentId,
      isPrimary: phone.isPrimary,
      callsReceived,
      callsProcessed,
      bookingsCount,
    };
  });
}

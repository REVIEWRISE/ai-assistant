/**
 * Seeds sample voice calls (and the appointments some of them booked) so the
 * dashboard "Voice call report · Last 7 days" has something to show.
 *
 *   npm run seed:voice-calls -- --org="QA Billing Workspace"
 *   npm run seed:voice-calls -- --org=<organization id> --reset   # remove samples only
 *
 * Re-running replaces the previous samples. Every sample call id starts with
 * "sample_call_", so samples never mix with real Retell calls.
 * Sample calls count toward the workspace's included calling minutes.
 */
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "../src/generated/prisma";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const SAMPLE_PREFIX = "sample_call_";
const HOUR = 60 * 60 * 1000;

type SampleCall = {
  hoursAgo: number;
  from: string;
  status: "ended" | "error";
  durationSeconds: number;
  sentiment: "positive" | "neutral" | "negative" | null;
  summary: string;
  /** Creates an appointment linked to this call. */
  booked?: { customerName: string; service: string; inDays: number };
  followUpDone?: boolean;
};

const SAMPLE_CALLS: SampleCall[] = [
  {
    hoursAgo: 2,
    from: "+15551230101",
    status: "ended",
    durationSeconds: 214,
    sentiment: "positive",
    summary: "Caller booked a haircut for Saturday morning and asked about parking.",
    booked: { customerName: "Maya Johnson", service: "Haircut", inDays: 2 },
  },
  {
    hoursAgo: 5,
    from: "+15551230102",
    status: "ended",
    durationSeconds: 96,
    sentiment: "negative",
    summary: "Caller was upset their last appointment ran 40 minutes late and wants a manager to call back.",
  },
  {
    hoursAgo: 9,
    from: "+15551230103",
    status: "ended",
    durationSeconds: 142,
    sentiment: "neutral",
    summary: "Asked about prices for color treatment; said they'd check their calendar and call back.",
  },
  {
    hoursAgo: 20,
    from: "+15551230104",
    status: "error",
    durationSeconds: 12,
    sentiment: null,
    summary: "Call dropped shortly after the greeting.",
  },
  {
    hoursAgo: 26,
    from: "+15551230105",
    status: "ended",
    durationSeconds: 188,
    sentiment: "positive",
    summary: "Rescheduled an existing booking to Thursday afternoon.",
    booked: { customerName: "Daniel Kim", service: "Beard trim", inDays: 3 },
  },
  {
    hoursAgo: 31,
    from: "+15551230106",
    status: "ended",
    durationSeconds: 18,
    sentiment: "neutral",
    summary: "Wrong number.",
  },
  {
    hoursAgo: 44,
    from: "+15551230107",
    status: "ended",
    durationSeconds: 305,
    sentiment: "positive",
    summary: "Booked a full color and cut; asked for the stylist they saw last time.",
    booked: { customerName: "Sofia Martinez", service: "Color and cut", inDays: 5 },
  },
  {
    hoursAgo: 52,
    from: "+15551230108",
    status: "ended",
    durationSeconds: 77,
    sentiment: "negative",
    summary: "Complained about being charged twice; follow-up handled by the front desk.",
    followUpDone: true,
  },
  {
    hoursAgo: 70,
    from: "+15551230109",
    status: "ended",
    durationSeconds: 121,
    sentiment: "neutral",
    summary: "Asked about opening hours on public holidays.",
  },
  {
    hoursAgo: 95,
    from: "+15551230110",
    status: "ended",
    durationSeconds: 233,
    sentiment: "positive",
    summary: "Booked a kids' haircut for two children after school.",
    booked: { customerName: "Priya Patel", service: "Kids haircut x2", inDays: 4 },
  },
  {
    hoursAgo: 118,
    from: "+15551230103",
    status: "ended",
    durationSeconds: 64,
    sentiment: "neutral",
    summary: "Earlier call asking whether walk-ins are accepted.",
  },
  {
    hoursAgo: 140,
    from: "+15551230111",
    status: "error",
    durationSeconds: 7,
    sentiment: null,
    summary: "Connection failed before the agent answered.",
  },
  {
    hoursAgo: 150,
    from: "+15551230112",
    status: "ended",
    durationSeconds: 176,
    sentiment: "positive",
    summary: "Booked a consultation and asked for directions.",
    booked: { customerName: "Liam O'Brien", service: "Consultation", inDays: 6 },
  },
  // The week before, so the dashboard can compare "vs last week".
  {
    hoursAgo: 180,
    from: "+15551230113",
    status: "ended",
    durationSeconds: 140,
    sentiment: "positive",
    summary: "Booked a trim for the following week.",
    booked: { customerName: "Noah Williams", service: "Trim", inDays: 1 },
  },
  {
    hoursAgo: 210,
    from: "+15551230114",
    status: "ended",
    durationSeconds: 95,
    sentiment: "neutral",
    summary: "Asked whether gift cards can be bought over the phone.",
  },
  {
    hoursAgo: 250,
    from: "+15551230115",
    status: "ended",
    durationSeconds: 110,
    sentiment: "neutral",
    summary: "Asked about prices for a wash and blow-dry.",
  },
  {
    hoursAgo: 290,
    from: "+15551230116",
    status: "ended",
    durationSeconds: 160,
    sentiment: "positive",
    summary: "Booked a colour consultation.",
    booked: { customerName: "Emma Brown", service: "Colour consultation", inDays: 2 },
  },
  {
    hoursAgo: 320,
    from: "+15551230117",
    status: "ended",
    durationSeconds: 60,
    sentiment: "neutral",
    summary: "Checked whether the salon is open on Sunday.",
  },
];

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : null;
}

async function findOrganization(query: string) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(query);
  return prisma.organization.findFirst({
    where: isUuid ? { id: query } : { name: { equals: query, mode: "insensitive" } },
    select: { id: true, name: true, planSlug: true },
  });
}

async function removeSamples(organizationId: string) {
  const appts = await prisma.appointment.deleteMany({
    where: { organizationId, retellCallId: { startsWith: SAMPLE_PREFIX } },
  });
  const calls = await prisma.retellCall.deleteMany({
    where: { organizationId, callId: { startsWith: SAMPLE_PREFIX } },
  });
  return { calls: calls.count, appointments: appts.count };
}

async function main() {
  const orgQuery = argValue("org");
  if (!orgQuery) {
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true, planSlug: true } });
    console.log('Pass --org="<name or id>". Organizations:');
    for (const org of orgs) console.log(`  ${org.id}  ${org.name}  (${org.planSlug ?? "no plan"})`);
    process.exitCode = 1;
    return;
  }

  const org = await findOrganization(orgQuery);
  if (!org) throw new Error(`Organization not found: ${orgQuery}`);

  const removed = await removeSamples(org.id);
  if (process.argv.includes("--reset")) {
    console.log(`Removed ${removed.calls} sample calls and ${removed.appointments} sample appointments from ${org.name}.`);
    return;
  }

  const agentId =
    (await prisma.retellCall.findFirst({ where: { organizationId: org.id }, select: { agentId: true } }))?.agentId ??
    "sample_agent";
  const toNumber =
    (await prisma.retellPhoneNumber.findFirst({
      where: { organizationId: org.id },
      orderBy: { isPrimary: "desc" },
      select: { phoneNumber: true },
    }))?.phoneNumber ?? "+15550000000";

  const now = Date.now();
  let booked = 0;

  for (const [index, sample] of SAMPLE_CALLS.entries()) {
    const callId = `${SAMPLE_PREFIX}${index + 1}`;
    const createdAt = new Date(now - sample.hoursAgo * HOUR);

    await prisma.retellCall.create({
      data: {
        callId,
        organizationId: org.id,
        agentId,
        callStatus: sample.status,
        direction: "inbound",
        fromNumber: sample.from,
        toNumber,
        durationSeconds: sample.durationSeconds,
        cost: (sample.durationSeconds / 60) * 0.07,
        summary: sample.summary,
        sentiment: sample.sentiment,
        transcript: [
          { role: "agent", content: "Thanks for calling! How can I help you today?" },
          { role: "user", content: sample.summary },
        ],
        followUpDoneAt: sample.followUpDone ? new Date(createdAt.getTime() + 2 * HOUR) : null,
        createdAt,
        updatedAt: createdAt,
      },
    });

    if (sample.booked) {
      const start = new Date(now + sample.booked.inDays * 24 * HOUR);
      start.setUTCHours(15, 0, 0, 0);
      await prisma.appointment.create({
        data: {
          organizationId: org.id,
          customerName: sample.booked.customerName,
          startTime: start,
          endTime: new Date(start.getTime() + HOUR),
          status: "requested",
          source: "voice_retell",
          providerSyncStatus: "skipped_no_connection",
          serviceDescription: sample.booked.service,
          rawMessage: "Sample booking from seed:voice-calls",
          retellCallId: callId,
          createdAt,
        },
      });
      booked += 1;
    }
  }

  console.log(
    `Seeded ${SAMPLE_CALLS.length} sample calls (${booked} booked) for ${org.name}` +
      (removed.calls ? `, replacing ${removed.calls} previous samples.` : "."),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

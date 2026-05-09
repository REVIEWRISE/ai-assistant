import { AppointmentsTabs } from "@/components/appointments-tabs";
import { parseBookingFlowQaPayload, type BookingFlowQaItem } from "@/lib/booking-flow-qa";
import { prisma } from "@/lib/prisma";
import { getAppointmentAnalytics } from "@/lib/appointment-analytics";
import { listOrgCalendarRoutes } from "@/lib/booking-org-gate";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { retryAppointmentCalendarSync } from "./actions";

type CalendarProviderItem = {
  id: string;
  name: string;
  type: string;
  logoUrl?: string | null;
  status: string;
  synced: string;
  lastSync: string;
  syncScope: string;
  tone: string;
  connectHref: string;
};

type AppointmentOverviewRow = {
  id: string;
  customerName: string;
  startTime: string;
  endTime: string;
  displayStatus: string;
  source: string;
  serviceDescription: string | null;
  /** Calendar provider this booking was routed / synced through, if any. */
  calendarProviderName: string | null;
  /** Guided-flow questions and answers when saved from the embed chatbot. */
  bookingFlowQa: BookingFlowQaItem[] | null;
  /** Original guest / chat message when the booking was created. */
  rawMessage: string | null;
  providerSyncStatus: string;
  externalCalendarEventId: string | null;
  providerSyncError: string | null;
  routedProviderId: string | null;
  routedConnectionUserId: string | null;
};

function displayStatusForAppointment(a: {
  status: string;
  externalCalendarEventId: string | null;
  providerSyncStatus: string;
}): string {
  if (a.status === "cancelled") return "Cancelled";
  if (a.externalCalendarEventId || a.providerSyncStatus === "synced") return "Booked";
  if (a.status === "confirmed") return "Confirmed";
  return "Pending";
}

function mapAppointmentRow(a: {
  id: string;
  customerName: string;
  startTime: Date;
  endTime: Date;
  status: string;
  source: string;
  serviceDescription: string | null;
  externalCalendarEventId: string | null;
  providerSyncStatus: string;
  routedProvider: { name: string } | null;
  bookingFlowQa: unknown;
  rawMessage: string | null;
  routedProviderId: string | null;
  routedConnectionUserId: string | null;
  providerSyncError: string | null;
}): AppointmentOverviewRow {
  return {
    id: a.id,
    customerName: a.customerName,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    displayStatus: displayStatusForAppointment(a),
    source: a.source,
    serviceDescription: a.serviceDescription,
    calendarProviderName: a.routedProvider?.name ?? null,
    bookingFlowQa: parseBookingFlowQaPayload(a.bookingFlowQa),
    rawMessage: a.rawMessage?.trim() || null,
    providerSyncStatus: a.providerSyncStatus,
    externalCalendarEventId: a.externalCalendarEventId,
    providerSyncError: a.providerSyncError,
    routedProviderId: a.routedProviderId,
    routedConnectionUserId: a.routedConnectionUserId,
  };
}

const overviewFlashErrors: Record<string, string> = {
  calendar_sync_invalid: "Something was wrong with that calendar request.",
  calendar_sync_not_found: "That booking could not be found.",
  calendar_sync_already_done: "This booking is already on a calendar.",
  calendar_sync_no_connection: "No live calendar connection for this workspace. Connect one under Integrations.",
  calendar_sync_invalid_route: "That calendar connection is not available.",
  calendar_sync_failed: "The calendar provider rejected the event. Check the message below or try another calendar.",
};

export default async function AppointmentsOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const successFlag = typeof sp.success === "string" ? sp.success : undefined;
  const errorFlag = typeof sp.error === "string" ? sp.error : undefined;
  const errorDetail = typeof sp.detail === "string" ? decodeURIComponent(sp.detail) : undefined;
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;

  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: {
      userId: true,
      activeOrganization: {
        select: {
          id: true,
          name: true,
          knowledgeBase: { select: { status: true } },
        },
      },
    },
  });

  if (!session) redirect("/login");

  const activeOrganization = session.activeOrganization;
  if (!activeOrganization) redirect("/appointments/organization");

  const knowledgeBaseStatus = activeOrganization.knowledgeBase?.status ?? "empty";
  if (knowledgeBaseStatus !== "approved") {
    return (
      <div className="space-y-5">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm lg:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Knowledge Base Required
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
            Configure and approve your knowledge base to unlock Appointment Overview.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-amber-800">
            Appointment insights rely on approved business context. Import your website, files, or business notes and
            approve the draft first.
          </p>
          <a
            href="/appointments/knowledge-base"
            className="mt-4 inline-flex rounded-xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
          >
            Go to Knowledge Base
          </a>
        </section>
      </div>
    );
  }

  const providerRows = await prisma.provider.findMany({
    where: { type: "calendar", status: "enabled" },
    orderBy: { createdAt: "asc" },
    include: { connections: { where: { userId: session.userId }, take: 1 } },
  });

  const nowResult = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
  const nowMs = nowResult[0]?.now ? nowResult[0].now.getTime() : 0;
  const now = new Date(nowMs);
  const in24h = new Date(nowMs + 24 * 60 * 60 * 1000);
  const in7d = new Date(nowMs + 7 * 24 * 60 * 60 * 1000);

  const appointmentSelect = {
    id: true,
    customerName: true,
    startTime: true,
    endTime: true,
    status: true,
    source: true,
    serviceDescription: true,
    bookingFlowQa: true,
    rawMessage: true,
    externalCalendarEventId: true,
    providerSyncStatus: true,
    providerSyncError: true,
    routedProviderId: true,
    routedConnectionUserId: true,
    routedProvider: { select: { name: true } },
  } as const;

  const [upcomingNext24h, upcomingNext7d, upcomingAppointments, recentPastAppointments] = await Promise.all([
    prisma.appointment.count({
      where: {
        organizationId: activeOrganization.id,
        startTime: { gte: now, lte: in24h },
      },
    }),
    prisma.appointment.count({
      where: {
        organizationId: activeOrganization.id,
        startTime: { gte: now, lte: in7d },
      },
    }),
    prisma.appointment.findMany({
      where: {
        organizationId: activeOrganization.id,
        startTime: { gte: now },
      },
      orderBy: { startTime: "asc" },
      take: 40,
      select: appointmentSelect,
    }),
    prisma.appointment.findMany({
      where: {
        organizationId: activeOrganization.id,
        startTime: { lt: now },
      },
      orderBy: { startTime: "desc" },
      take: 25,
      select: appointmentSelect,
    }),
  ]);

  const bookedAppointments = {
    upcoming: upcomingAppointments.map(mapAppointmentRow),
    recentPast: recentPastAppointments.map(mapAppointmentRow),
  };

  const [calendarRouteOptions, appointmentAnalytics] = await Promise.all([
    listOrgCalendarRoutes(activeOrganization.id),
    getAppointmentAnalytics(activeOrganization.id, now),
  ]);

  const calendarProviders: CalendarProviderItem[] = providerRows.map((provider: typeof providerRows[number]) => {
    const connection = provider.connections[0];
    const tokenData = (connection?.tokenData ?? null) as { expires_at?: string | number } | null;
    const expiresAtValue = tokenData?.expires_at;
    const expiresAt =
      typeof expiresAtValue === "string" || typeof expiresAtValue === "number"
        ? new Date(expiresAtValue).getTime()
        : null;
    const isExpired = expiresAt ? nowMs > expiresAt : false;
    const isConnected = Boolean(connection?.connected && !isExpired);

    return {
      id: provider.id,
      name: provider.name,
      type: "Calendar",
      logoUrl: provider.logoUrl,
      status: isExpired ? "Expired" : isConnected ? "Connected" : "Not connected",
      synced: isExpired ? "Token expired" : isConnected ? "API connected" : "0 synced",
      lastSync: "—",
      syncScope: provider.apiUrl ? "API configured" : "Connect provider API URL",
      tone: isExpired
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : isConnected
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-700",
      connectHref: `/appointments/providers/connect/${provider.id}`,
    };
  });

  const connectedProviders = calendarProviders.filter((provider) => provider.status === "Connected").length;
  const providerLoad = providerRows.map((provider: typeof providerRows[number]) => {
    const connection = provider.connections[0];
    const tokenData = (connection?.tokenData ?? null) as { expires_at?: string | number } | null;
    const expiresAtValue = tokenData?.expires_at;
    const expiresAt =
      typeof expiresAtValue === "string" || typeof expiresAtValue === "number"
        ? new Date(expiresAtValue).getTime()
        : null;
    const isExpired = expiresAt ? nowMs > expiresAt : false;
    const isConnected = Boolean(connection?.connected && !isExpired);
    return {
      provider: provider.name,
      requests: "0",
      note: isConnected ? "Connected and enabled" : "Enabled, not connected",
    };
  });

  return (
    <div className="space-y-5">
      {successFlag === "calendar_synced" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Booking posted to the selected calendar successfully.
        </div>
      ) : null}
      {errorFlag ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="font-semibold">{overviewFlashErrors[errorFlag] ?? "Calendar action failed."}</p>
          {errorFlag === "calendar_sync_failed" && errorDetail ? (
            <p className="mt-1 text-xs text-rose-800/90">{errorDetail}</p>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Appointment Agent</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
              Schedule optimization and real-time booking automation.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              AI is handling inbound booking requests, proposing time slots, and sending reminders automatically.
            </p>
            <p className="mt-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
              Active organization: {activeOrganization.name}
            </p>
          </div>
          <div className="basis-full w-full rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
                <p className="text-slate-300">Connected Providers</p>
                <p className="text-lg font-semibold text-white">{connectedProviders}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
                <p className="text-slate-300">Upcoming (24h)</p>
                <p className="text-lg font-semibold text-white">{upcomingNext24h}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
                <p className="text-slate-300">Upcoming (7d)</p>
                <p className="text-lg font-semibold text-white">{upcomingNext7d}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AppointmentsTabs
        bookedAppointments={bookedAppointments}
        calendarProviders={calendarProviders}
        providerLoad={providerLoad}
        calendarRouteOptions={calendarRouteOptions}
        retryCalendarSync={retryAppointmentCalendarSync}
        appointmentAnalytics={appointmentAnalytics}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { AppointmentsTabs } from "@/components/appointments-tabs";
import { parseBookingFlowQaPayload, type BookingFlowQaItem } from "@/lib/booking-flow-qa";
import { requireActiveOrganization } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getAppointmentAnalytics } from "@/lib/appointment-analytics";
import { calendarConnectionDisplay, refreshCalendarConnectionsForUser } from "@/lib/calendar-oauth-connection";
import { listOrgCalendarRoutes } from "@/lib/booking-org-gate";
import { crmIntegrationIsDispatchReady, resolveCrmIntegrationConfig } from "@/lib/crm-integration";
import { retryAppointmentCalendarSync, retryAppointmentCrmSync } from "./actions";
import Link from "next/link";

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
  customerEmail: string | null;
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
  crmSyncStatus: string;
  crmSyncError: string | null;
  crmSyncAttempts: number;
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
  customerEmail: string | null;
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
  crmSyncStatus: string;
  crmSyncError: string | null;
  crmSyncAttempts: number;
}): AppointmentOverviewRow {
  return {
    id: a.id,
    customerName: a.customerName,
    customerEmail: a.customerEmail,
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
    crmSyncStatus: a.crmSyncStatus,
    crmSyncError: a.crmSyncError,
    crmSyncAttempts: a.crmSyncAttempts,
  };
}

const overviewFlashErrors: Record<string, string> = {
  calendar_sync_invalid: "Something was wrong with that calendar request.",
  calendar_sync_not_found: "That booking could not be found.",
  calendar_sync_already_done: "This booking is already on a calendar.",
  calendar_sync_no_connection: "No live calendar connection for this workspace. Connect one under Integrations.",
  calendar_sync_invalid_route: "That calendar connection is not available.",
  calendar_sync_failed: "The calendar provider rejected the event. Check the message below or try another calendar.",
  crm_sync_invalid: "Something was wrong with that CRM retry request.",
  crm_sync_not_found: "That booking could not be found.",
  crm_sync_already_done: "This booking was already sent to your CRM webhook.",
  crm_sync_not_configured: "No CRM webhook URL is configured. Add one under Configure chatbot → CRM sync.",
  crm_sync_failed: "The CRM webhook failed. Check the message below or retry.",
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
  const session = await requireActiveOrganization();
  const activeOrganization = session.activeOrganization;

  const knowledgeBaseStatus = activeOrganization.knowledgeBase?.status ?? "empty";
  if (knowledgeBaseStatus !== "approved") {
    return (
      <div className="mx-auto max-w-[92rem] space-y-4">
        <section className="rounded-[1.35rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-sm)]">
          <p className="text-sm font-semibold text-[var(--color-text)]">One setup step is blocking bookings</p>
          <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-[var(--color-text-muted)]">
            Import your website, review the generated business context, and approve it for the agent. You will return here automatically once it is ready.
          </p>
          <Link
            href="/appointments/knowledge-base"
            className="mt-4 inline-flex rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-fill-h)]"
          >
            Complete knowledge setup
          </Link>
        </section>
      </div>
    );
  }

  await refreshCalendarConnectionsForUser(session.userId);

  const providerRows = await prisma.provider.findMany({
    where: { type: "calendar", status: "enabled" },
    orderBy: { createdAt: "asc" },
    include: { connections: { where: { userId: session.userId }, take: 1 } },
  });

  const nowResult = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
  const nowMs = nowResult[0]?.now ? nowResult[0].now.getTime() : 0;
  const now = new Date(nowMs);

  const appointmentSelect = {
    id: true,
    customerName: true,
    customerEmail: true,
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
    crmSyncStatus: true,
    crmSyncError: true,
    crmSyncAttempts: true,
  } as const;

  const [upcomingAppointments, recentPastAppointments] = await Promise.all([
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

  const [calendarRouteOptions, appointmentAnalytics, chatbotSettings] = await Promise.all([
    listOrgCalendarRoutes(activeOrganization.id),
    getAppointmentAnalytics(activeOrganization.id, now),
    prisma.organizationChatbotSettings.findUnique({
      where: { organizationId: activeOrganization.id },
      select: { id: true, crmIntegration: true },
    }),
  ]);

  const crmWebhookConfigured = crmIntegrationIsDispatchReady(
    resolveCrmIntegrationConfig(chatbotSettings?.crmIntegration),
  );

  const calendarProviders: CalendarProviderItem[] = providerRows.map((provider: typeof providerRows[number]) => {
    const connection = provider.connections[0];
    const display = calendarConnectionDisplay(Boolean(connection?.connected), connection?.tokenData, nowMs);

    return {
      id: provider.id,
      name: provider.name,
      type: "Calendar",
      logoUrl: provider.logoUrl,
      status: display.status,
      synced: display.synced,
      lastSync: "—",
      syncScope: provider.apiUrl ? "API configured" : "Connect provider API URL",
      tone: display.tone,
      connectHref: `/appointments/providers/connect/${provider.id}`,
    };
  });

  if (typeof sp.tab !== "string") {
    // No tab chosen: open the first tab, Bookings.
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (typeof value === "string") params.set(key, value);
    }
    params.set("tab", "booked");
    redirect(`/appointments/overview?${params.toString()}`);
  }

  const providerLoad = providerRows.map((provider: typeof providerRows[number]) => {
    const connection = provider.connections[0];
    const display = calendarConnectionDisplay(Boolean(connection?.connected), connection?.tokenData, nowMs);
    const isConnected = display.status === "Connected";
    return {
      provider: provider.name,
      requests: "0",
      note: isConnected ? "Connected and enabled" : "Enabled, not connected",
    };
  });


  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      {successFlag === "calendar_synced" ? (
        <div className="vr-app-alert vr-app-alert-success">
          Booking posted to the selected calendar successfully.
        </div>
      ) : null}
      {successFlag === "crm_synced" ? (
        <div className="vr-app-alert vr-app-alert-success">
          Booking sent to your CRM webhook successfully.
        </div>
      ) : null}
      {errorFlag ? (
        <div className="vr-app-alert vr-app-alert-danger">
          <p className="font-semibold">{overviewFlashErrors[errorFlag] ?? "Calendar action failed."}</p>
          {(errorFlag === "calendar_sync_failed" || errorFlag === "crm_sync_failed") && errorDetail ? (
            <p className="mt-1 text-xs opacity-90">{errorDetail}</p>
          ) : null}
        </div>
      ) : null}

      <AppointmentsTabs
        bookedAppointments={bookedAppointments}
        calendarProviders={calendarProviders}
        providerLoad={providerLoad}
        calendarRouteOptions={calendarRouteOptions}
        retryCalendarSync={retryAppointmentCalendarSync}
        retryCrmSync={retryAppointmentCrmSync}
        crmWebhookConfigured={crmWebhookConfigured}
        appointmentAnalytics={appointmentAnalytics}
        testBookingHref={`/embed/chatbot?org=${activeOrganization.id}`}
      />
    </div>
  );
}

import { AppointmentsTabs } from "@/components/appointments-tabs";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { parseBookingFlowQaPayload, type BookingFlowQaItem } from "@/lib/booking-flow-qa";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getAppointmentAnalytics } from "@/lib/appointment-analytics";
import { calendarConnectionDisplay, refreshCalendarConnectionsForUser } from "@/lib/calendar-oauth-connection";
import { listOrgCalendarRoutes } from "@/lib/booking-org-gate";
import { redirect } from "next/navigation";
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
  const session = await requireSession();
  const activeOrganization = session.activeOrganization;
  if (!activeOrganization) redirect("/appointments/organization");

  const knowledgeBaseStatus = activeOrganization.knowledgeBase?.status ?? "empty";
  if (knowledgeBaseStatus !== "approved") {
    return (
      <div className="mx-auto max-w-[92rem] space-y-4">
        <AppointmentPageHeader
          title="Appointment operations"
          description="Approve your business knowledge before the agent can answer service questions and create reliable bookings."
          status="Knowledge setup required"
          statusTone="warning"
          actions={[{ href: "/appointments/knowledge-base", label: "Complete knowledge setup", primary: true }]}
          metrics={[
            { label: "Organization", value: activeOrganization.name },
            { label: "Knowledge status", value: knowledgeBaseStatus },
            { label: "Operations", value: "Locked", hint: "until approval" },
          ]}
        />
        <section className="rounded-[1.35rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-sm)]">
          <p className="text-sm font-semibold text-[var(--color-text)]">One setup step is blocking bookings</p>
          <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-[var(--color-text-muted)]">
            Import your website, review the generated business context, and approve it for the agent. You will return here automatically once it is ready.
          </p>
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
  const in24h = new Date(nowMs + 24 * 60 * 60 * 1000);
  const in7d = new Date(nowMs + 7 * 24 * 60 * 60 * 1000);

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

  const [upcomingNext24h, upcomingNext7d, phoneBookingsTotal, upcomingAppointments, recentPastAppointments] = await Promise.all([
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
    prisma.appointment.count({
      where: {
        organizationId: activeOrganization.id,
        source: "voice_retell",
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

  const connectedProviders = calendarProviders.filter((provider) => provider.status === "Connected").length;
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

  const hasBookings = upcomingAppointments.length > 0 || recentPastAppointments.length > 0;
  const setupSteps = [
    {
      label: "Business knowledge approved",
      complete: true,
      href: "/appointments/knowledge-base",
    },
    {
      label: "Calendar connected",
      complete: connectedProviders > 0,
      href: "/appointments/overview",
    },
    {
      label: "Booking assistant configured",
      complete: Boolean(chatbotSettings),
      href: "/appointments/chatbot",
    },
    {
      label: "Test booking completed",
      complete: hasBookings,
      href: `/embed/chatbot?org=${activeOrganization.id}`,
      external: true,
    },
  ];
  const completedSetupSteps = setupSteps.filter((step) => step.complete).length;
  const assistantReady = connectedProviders > 0 && Boolean(chatbotSettings);
  const presenceLabel = !assistantReady
    ? connectedProviders === 0
      ? "Calendar needed"
      : "Assistant setup needed"
    : upcomingNext24h > 0
      ? "Busy today"
      : "On duty";
  const identityLine = !assistantReady
    ? `${activeOrganization.name} · Ready to set up`
    : `${activeOrganization.name} · Your booking assistant`;
  const assistantInfo = !assistantReady
    ? connectedProviders === 0
      ? "Connect a calendar so this assistant can check availability and confirm bookings."
      : "Configure the booking assistant so callers and website visitors get a consistent experience."
    : upcomingNext24h > 0
      ? `${upcomingNext24h} booking${upcomingNext24h === 1 ? "" : "s"} in the next 24 hours — keep calendars and CRM delivery healthy.`
      : "Watching availability, bookings, and delivery for this workspace.";
  const waveformBars = [8, 14, 20, 12, 18, 10, 16];

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

      <AppointmentPageHeader
        variant="command"
        eyebrow="Appointment Agent"
        title={
          assistantReady
            ? `${activeOrganization.name} bookings`
            : "Your booking assistant"
        }
        description={
          assistantReady ? (
            <>
              Keep calendars, bookings, and delivery healthy for {activeOrganization.name} — the
              assistant that turns availability into confirmed appointments.
            </>
          ) : (
            <>
              Set up the booking assistant for {activeOrganization.name}. Connect a calendar and
              configure how visitors book with you.
            </>
          )
        }
        status={
          assistantReady
            ? upcomingNext24h > 0
              ? `${upcomingNext24h} upcoming today`
              : "Assistant ready"
            : connectedProviders > 0
              ? "Configure assistant"
              : "Calendar setup needed"
        }
        statusTone={assistantReady ? "success" : "warning"}
        actions={[
          {
            href: assistantReady ? "/appointments/chatbot" : connectedProviders > 0 ? "/appointments/chatbot" : "/appointments/organization",
            label: assistantReady ? "Configure assistant" : connectedProviders > 0 ? "Set up assistant" : "Connect calendar",
            primary: true,
          },
        ]}
        metrics={[
          { label: "Calendar providers", value: connectedProviders, hint: connectedProviders > 0 ? "Ready for availability checks" : "Connect a calendar" },
          { label: "Upcoming · 24h", value: upcomingNext24h, hint: upcomingNext24h > 0 ? "Needs attention today" : "No bookings today" },
          { label: "Upcoming · 7d", value: upcomingNext7d, hint: upcomingNext7d > 0 ? "Scheduled this week" : "Week is currently open" },
          { label: "Voice bookings", value: phoneBookingsTotal, hint: phoneBookingsTotal > 0 ? "Captured by Voice AI" : "No voice bookings yet" },
        ]}
      />

      <div className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="relative overflow-hidden bg-[linear-gradient(160deg,#0c0c0c_0%,#171717_48%,#222222_100%)] px-5 pb-5 pt-7 text-white sm:px-6 sm:pt-8">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.1),transparent_60%)]"
            aria-hidden
          />

          <div className="relative flex flex-col items-center text-center">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="flex h-12 items-end gap-[3px]" aria-hidden>
                {waveformBars.map((height, index) => (
                  <span
                    key={`wave-l-${index}`}
                    className={`w-[2.5px] rounded-full ${assistantReady ? "bg-white/45" : "bg-white/18"}`}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>

              <div className="relative">
                <span className="flex size-[4.75rem] items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.8)]">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                  </svg>
                </span>
                <span
                  className={`absolute bottom-1 right-1 size-3.5 rounded-full border-2 border-[#161616] ${
                    !assistantReady
                      ? "bg-neutral-500"
                      : upcomingNext24h > 0
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }`}
                  title={presenceLabel}
                  aria-label={presenceLabel}
                />
              </div>

              <div className="flex h-12 items-end gap-[3px]" aria-hidden>
                {[...waveformBars].reverse().map((height, index) => (
                  <span
                    key={`wave-r-${index}`}
                    className={`w-[2.5px] rounded-full ${assistantReady ? "bg-white/45" : "bg-white/18"}`}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </div>

            <h2 className="mt-4 text-[1.4rem] font-semibold tracking-[-0.025em] text-white sm:text-[1.55rem]">
              {activeOrganization.name} bookings
            </h2>
            <p className="mt-1.5 text-[13px] text-neutral-400">{identityLine}</p>
            <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-neutral-500">
              {assistantInfo}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  !assistantReady
                    ? "border-white/15 bg-white/10 text-neutral-300"
                    : upcomingNext24h > 0
                      ? "border-amber-400/30 bg-amber-400/15 text-amber-100"
                      : "border-emerald-400/30 bg-emerald-400/15 text-emerald-100"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    !assistantReady
                      ? "bg-neutral-400"
                      : upcomingNext24h > 0
                        ? "bg-amber-300"
                        : "bg-emerald-300"
                  }`}
                  aria-hidden
                />
                {presenceLabel}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/appointments/chatbot"
                className="rounded-xl bg-white px-3.5 py-2 text-[12px] font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                {Boolean(chatbotSettings) ? "Configure assistant" : "Set up assistant"}
              </Link>
              <Link
                href="/appointments/organization"
                className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-white/15"
              >
                Calendars
              </Link>
              <Link
                href="/appointments/knowledge-base"
                className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-white/15"
              >
                Knowledge
              </Link>
              <Link
                href="/appointments/chatbot"
                className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-white/15"
              >
                {crmWebhookConfigured ? "CRM settings" : "Connect CRM"}
              </Link>
            </div>
          </div>

          <div className="relative mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Calendars</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">
                {connectedProviders} connected
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Next 24h</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">{upcomingNext24h}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M8 2v4M16 2v4" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 10h18" />
                </svg>
              </span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Next 7d</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">{upcomingNext7d}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                </svg>
              </span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Voice</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">{phoneBookingsTotal}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 3v18" />
                  <path d="M5 8h14M5 16h14" />
                </svg>
              </span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">CRM</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">
                {crmWebhookConfigured ? "Connected" : "Not set"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {completedSetupSteps < setupSteps.length ? (
        <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Setup progress</p>
              <h2 className="mt-1 text-base font-semibold text-[var(--color-text)]">{completedSetupSteps} of {setupSteps.length} essentials complete</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Finish the remaining steps to make the booking workflow fully operational.</p>
            </div>
            <div className="h-2 w-40 overflow-hidden rounded-full bg-[var(--color-raised)]" aria-label={`${completedSetupSteps} of ${setupSteps.length} setup steps complete`}>
              <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${(completedSetupSteps / setupSteps.length) * 100}%` }} />
            </div>
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {setupSteps.map((step) => (
              <Link
                key={step.label}
                href={step.href}
                target={step.external ? "_blank" : undefined}
                rel={step.external ? "noreferrer" : undefined}
                className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-[11px] font-medium text-[var(--color-text)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_25%,var(--color-border))] hover:shadow-[var(--shadow-sm)]"
              >
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${step.complete ? "bg-emerald-500 text-white" : "border border-[var(--color-border-hover)] bg-[var(--color-surface)] text-[var(--color-text-subtle)]"}`} aria-hidden>
                  {step.complete ? "✓" : ""}
                </span>
                <span className="truncate">{step.label}</span>
              </Link>
            ))}
          </div>
        </section>
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

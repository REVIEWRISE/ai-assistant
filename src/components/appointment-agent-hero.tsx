import Link from "next/link";
import { AgentHeroCard } from "@/components/agent-hero-card";
import { prisma } from "@/lib/prisma";
import { calendarConnectionDisplay } from "@/lib/calendar-oauth-connection";
import { crmIntegrationIsDispatchReady, resolveCrmIntegrationConfig } from "@/lib/crm-integration";

/**
 * Shared Appointment Agent hero + setup checklist. Rendered once by `appointments/layout.tsx`
 * above the section tabs, so every tab keeps the same header (like Reviews and Voice).
 */
export async function AppointmentAgentHero({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  const now = new Date();
  const nowMs = now.getTime();
  const in24h = new Date(nowMs + 24 * 60 * 60 * 1000);
  const in7d = new Date(nowMs + 7 * 24 * 60 * 60 * 1000);

  const [activeOrganization, providerRows, upcomingNext24h, upcomingNext7d, phoneBookingsTotal, anyBooking] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          knowledgeBase: { select: { status: true } },
          chatbotSettings: { select: { id: true, crmIntegration: true } },
        },
      }),
      prisma.provider.findMany({
        where: { type: "calendar", status: "enabled" },
        select: { connections: { where: { userId }, take: 1, select: { connected: true, tokenData: true } } },
      }),
      prisma.appointment.count({ where: { organizationId, startTime: { gte: now, lte: in24h } } }),
      prisma.appointment.count({ where: { organizationId, startTime: { gte: now, lte: in7d } } }),
      prisma.appointment.count({ where: { organizationId, source: "voice_retell" } }),
      prisma.appointment.findFirst({ where: { organizationId }, select: { id: true } }),
    ]);

  if (!activeOrganization) return null;

  const chatbotSettings = activeOrganization.chatbotSettings;
  const crmWebhookConfigured = crmIntegrationIsDispatchReady(
    resolveCrmIntegrationConfig(chatbotSettings?.crmIntegration),
  );
  const connectedProviders = providerRows.filter((provider) => {
    const connection = provider.connections[0];
    return calendarConnectionDisplay(Boolean(connection?.connected), connection?.tokenData, nowMs).status === "Connected";
  }).length;

  const setupSteps = [
    {
      label: "Business knowledge approved",
      action: "Approve business knowledge",
      complete: activeOrganization.knowledgeBase?.status === "approved",
      href: "/appointments/knowledge-base",
    },
    {
      label: "Calendar connected",
      action: "Connect a calendar",
      complete: connectedProviders > 0,
      href: "/appointments/overview?tab=integrations",
    },
    {
      label: "Booking assistant configured",
      action: "Configure the booking assistant",
      complete: Boolean(chatbotSettings),
      href: "/appointments/chatbot",
    },
    {
      label: "Test booking completed",
      action: "Run a test booking",
      complete: Boolean(anyBooking),
      href: `/embed/chatbot?org=${activeOrganization.id}`,
      external: true,
    },
  ];
  const completedSetupSteps = setupSteps.filter((step) => step.complete).length;
  const nextStep = setupSteps.find((step) => !step.complete);
  const assistantReady = connectedProviders > 0 && Boolean(chatbotSettings);
  const presenceLabel = !assistantReady
    ? connectedProviders === 0
      ? "Calendar needed"
      : "Assistant setup needed"
    : upcomingNext24h > 0
      ? "Busy today"
      : "On duty";
  const assistantInfo = !assistantReady
    ? connectedProviders === 0
      ? "Connect a calendar so this assistant can check availability and confirm bookings."
      : "Configure the booking assistant so callers and website visitors get a consistent experience."
    : upcomingNext24h > 0
      ? `${upcomingNext24h} booking${upcomingNext24h === 1 ? "" : "s"} in the next 24 hours — keep calendars and CRM delivery healthy.`
      : "Watching availability, bookings, and delivery for this workspace.";
  const presenceTone = !assistantReady ? "neutral" : upcomingNext24h > 0 ? "warning" : "success";

  return (
    <AgentHeroCard
      eyebrow="Appointment Agent"
      title={assistantReady ? `${activeOrganization.name} bookings` : "Your booking assistant"}
      description={assistantInfo}
      status={{ label: presenceLabel, tone: presenceTone }}
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      }
      actions={[
        {
          label: connectedProviders === 0 ? "Connect calendar" : chatbotSettings ? "Configure assistant" : "Set up assistant",
          href: connectedProviders > 0 ? "/appointments/chatbot" : "/appointments/overview?tab=integrations",
        },
        // Shortcuts help during setup; once everything is done the tabs below cover them.
        ...(nextStep
          ? [
              ...(connectedProviders > 0 ? [{ label: "Calendars", href: "/appointments/overview?tab=integrations" }] : []),
              { label: "Knowledge", href: "/appointments/knowledge-base" },
              { label: crmWebhookConfigured ? "CRM settings" : "Connect CRM", href: "/appointments/chatbot" },
            ]
          : []),
      ]}
      stats={[
        { label: "Calendars", value: `${connectedProviders} connected` },
        { label: "Next 24h", value: upcomingNext24h },
        { label: "Next 7d", value: upcomingNext7d },
        { label: "Voice", value: phoneBookingsTotal },
        { label: "CRM", value: crmWebhookConfigured ? "Connected" : "Not set" },
      ]}
      footer={
        nextStep ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-white/85">
            <span className="flex items-center gap-1" aria-hidden>
              {setupSteps.map((step) => (
                <span key={step.label} className={`h-1.5 w-5 rounded-full ${step.complete ? "bg-white/80" : "bg-white/15"}`} />
              ))}
            </span>
            <span>
              {completedSetupSteps} of {setupSteps.length} set up
            </span>
            <span className="hidden text-white/50 sm:inline" aria-hidden>·</span>
            <Link
              href={nextStep.href}
              target={nextStep.external ? "_blank" : undefined}
              rel={nextStep.external ? "noreferrer" : undefined}
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Next: {nextStep.action} {nextStep.external ? "↗" : "→"}
            </Link>
          </div>
        ) : null
      }
    />
  );
}

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ChatbotToasts } from "@/components/chatbot-toasts";
import { ChatbotOrganizationsTable } from "@/components/chatbot-organizations-table";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { getAppOrigin } from "@/lib/app-origin";
import { requireSession } from "@/lib/auth-session";
import { resolveChatbotConfigData } from "@/lib/chatbot-config";
import { organizationChatbotSettingsSelect } from "@/lib/chatbot-settings-select";
import {
  generateChatbotFromKnowledge,
  generateVoiceBookingGreeting,
  saveChatbotConfig,
  saveCrmIntegration,
  saveVoiceBooking,
} from "./actions";

const organizationSelect = {
  id: true,
  name: true,
  createdAt: true,
  chatbotSettings: {
    select: organizationChatbotSettingsSelect,
  },
  knowledgeBase: {
    select: {
      parsedData: true,
    },
  },
} as const;

export default async function AppointmentChatbotPage() {
  const session = await requireSession();
  const isAdmin = await userHasAdminRole(session.userId);

  const organizations = isAdmin
    ? await prisma.organization.findMany({
        orderBy: { name: "asc" },
        select: organizationSelect,
      })
    : (
        await prisma.organizationMember.findMany({
          where: { userId: session.userId },
          orderBy: { createdAt: "asc" },
          select: { organization: { select: organizationSelect } },
        })
      ).map((member) => member.organization);

  if (organizations.length === 0) {
    redirect("/appointments/organization");
  }

  const activeId = session.activeOrganizationId;
  const totalOrganizations = organizations.length;
  const activeOrganization = activeId
    ? organizations.find((organization) => organization.id === activeId) ?? null
    : null;

  const rows = organizations.map((org) => {
    const config = resolveChatbotConfigData(org.chatbotSettings, org.knowledgeBase?.parsedData);
    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt.toISOString(),
      isActive: activeId === org.id,
      configured: Boolean(org.chatbotSettings),
      config,
    };
  });
  const embedBaseUrl = await getAppOrigin();
  const configuredAssistants = organizations.filter((organization) =>
    Boolean(organization.chatbotSettings),
  ).length;
  const voiceEnabled = rows.filter((row) => row.config.voiceBooking.enabled).length;
  const crmEnabled = rows.filter((row) => row.config.crmIntegration.enabled).length;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <AppointmentPageHeader
        variant="command"
        title="Booking assistants"
        description="Configure the website assistant, booking questions, voice experience, and CRM delivery for each organization."
        status={activeOrganization ? `Active: ${activeOrganization.name}` : "No active organization"}
        statusTone={activeOrganization ? "success" : "warning"}
        actions={[
          { href: "/appointments/organization", label: "Manage organizations" },
          ...(activeOrganization
            ? [
                {
                  href: `/embed/chatbot?org=${activeOrganization.id}`,
                  label: "Test active assistant",
                  primary: true,
                  external: true,
                },
              ]
            : []),
        ]}
        metrics={[
          { label: "Organizations", value: totalOrganizations },
          { label: "Assistants configured", value: `${configuredAssistants}/${totalOrganizations}` },
          { label: "Voice enabled", value: voiceEnabled },
          { label: "CRM connected", value: crmEnabled },
        ]}
      />

      <ChatbotToasts />

      <ChatbotOrganizationsTable
        embedBaseUrl={embedBaseUrl}
        rows={rows}
        onSaveChatbot={saveChatbotConfig}
        onSaveCrmIntegration={saveCrmIntegration}
        onSaveVoiceBooking={saveVoiceBooking}
        onGenerateChatbot={generateChatbotFromKnowledge}
        onGenerateVoiceGreeting={generateVoiceBookingGreeting}
      />
    </div>
  );
}

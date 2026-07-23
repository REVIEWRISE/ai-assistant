import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChatbotOrganizationsTable } from "@/components/chatbot-organizations-table";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { getAppOrigin } from "@/lib/app-origin";
import { resolveChatbotConfigData } from "@/lib/chatbot-config";
import { organizationChatbotSettingsSelect } from "@/lib/chatbot-settings-select";
import { generateChatbotFromKnowledge, generateVoiceBookingGreeting, saveChatbotConfig, saveCrmIntegration, saveVoiceBooking } from "./actions";

export default async function AppointmentChatbotPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: {
      activeOrganizationId: true,
      user: {
        select: {
          userRoles: {
            select: {
              role: { select: { name: true } },
            },
          },
          organizationMembers: {
            orderBy: { createdAt: "asc" },
            select: {
              organization: {
                select: {
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
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session) redirect("/login");

  const memberships = session.user?.organizationMembers ?? [];
  if (memberships.length === 0) {
    redirect("/appointments");
  }

  const activeId = session.activeOrganizationId;
  const isAdmin = session.user.userRoles.some((userRole) => userRole.role.name === "Admin");
  const organizations = memberships.map((m) => m.organization);
  const totalOrganizations = organizations.length;
  const activeOrganization = activeId
    ? organizations.find((o: { id: string }) => o.id === activeId)
    : null;

  const rows = memberships.map((m) => {
    const org = m.organization;
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

  const params = (await searchParams) ?? {};
  const embedBaseUrl = await getAppOrigin();
  const configuredAssistants = organizations.filter((organization) => Boolean(organization.chatbotSettings)).length;
  const voiceEnabled = rows.filter((row) => row.config.voiceBooking.enabled).length;
  const crmEnabled = rows.filter((row) => row.config.crmIntegration.enabled).length;

  const errorMessages: Record<string, string> = {
    chatbot_org_missing: "Missing organization for this save request.",
    chatbot_org_denied: "You do not have access to configure chatbot for that organization.",
    chatbot_generate_no_api_key: "Add OPENAI_API_KEY to generate the assistant from your knowledge base.",
    chatbot_generate_no_kb: "Import a knowledge base first (substantial text). Then try generating again.",
    chatbot_generate_failed: "Could not generate chatbot settings. Try again or edit manually.",
    chatbot_read_only: "Admins have view-only access to booking assistant settings.",
  };

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <AppointmentPageHeader
        variant="command"
        title="Booking assistants"
        description={
          isAdmin
            ? "Review website assistant, booking flow, voice, and CRM status for each organization. Configuration is reserved for users."
            : "Configure the website assistant, booking questions, voice experience, and CRM delivery for each organization."
        }
        status={isAdmin ? "Admin · View only" : activeOrganization ? `Active: ${activeOrganization.name}` : "No active organization"}
        statusTone={activeOrganization ? "success" : "warning"}
        actions={[
          { href: "/appointments/organization", label: "Manage organizations" },
          ...(activeOrganization
            ? [{ href: `/embed/chatbot?org=${activeOrganization.id}`, label: "Test active assistant", primary: true, external: true }]
            : []),
        ]}
        metrics={[
          { label: "Organizations", value: totalOrganizations },
          { label: "Assistants configured", value: `${configuredAssistants}/${totalOrganizations}` },
          { label: "Voice enabled", value: voiceEnabled },
          { label: "CRM connected", value: crmEnabled },
        ]}
      />

      {params.success === "saved" ? (
        <div className="vr-app-alert vr-app-alert-success">Chatbot settings saved.</div>
      ) : null}

      {params.success === "crm_saved" ? (
        <div className="vr-app-alert vr-app-alert-success">CRM integration saved.</div>
      ) : null}

      {params.success === "voice_saved" ? (
        <div className="vr-app-alert vr-app-alert-success">Voice booking settings saved.</div>
      ) : null}

      {params.error && errorMessages[params.error] ? (
        <div className="vr-app-alert vr-app-alert-danger">{errorMessages[params.error]}</div>
      ) : null}

      <ChatbotOrganizationsTable
        embedBaseUrl={embedBaseUrl}
        rows={rows}
        readOnly={isAdmin}
        onSaveChatbot={saveChatbotConfig}
        onSaveCrmIntegration={saveCrmIntegration}
        onSaveVoiceBooking={saveVoiceBooking}
        onGenerateChatbot={generateChatbotFromKnowledge}
        onGenerateVoiceGreeting={generateVoiceBookingGreeting}
      />
    </div>
  );
}

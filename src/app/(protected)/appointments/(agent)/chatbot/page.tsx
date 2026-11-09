import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ChatbotToasts } from "@/components/chatbot-toasts";
import { ChatbotOrganizationsTable } from "@/components/chatbot-organizations-table";
import { getAppOrigin } from "@/lib/app-origin";
import { requireActiveOrganization } from "@/lib/auth-session";
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
  const session = await requireActiveOrganization();

  const organization = await prisma.organization.findUnique({
    where: { id: session.activeOrganizationId },
    select: organizationSelect,
  });

  if (!organization) {
    redirect("/appointments/organization?error=organization_required");
  }

  const config = resolveChatbotConfigData(
    organization.chatbotSettings,
    organization.knowledgeBase?.parsedData,
  );
  const rows = [
    {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt.toISOString(),
      isActive: true,
      configured: Boolean(organization.chatbotSettings),
      config,
    },
  ];
  const embedBaseUrl = await getAppOrigin();

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">

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

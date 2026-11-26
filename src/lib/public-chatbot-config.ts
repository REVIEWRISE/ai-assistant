import { resolveChatbotConfigData } from "@/lib/chatbot-config";
import { prisma } from "@/lib/prisma";

/** Chatbot settings for the public booking surfaces (/embed/chatbot and /book/<slug>). */
export async function loadPublicChatbotConfig(organizationId: string) {
  const [chatbotSettingsRows, knowledgeBaseRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{ welcomeMessage: string; themeColor: string; iconColor: string; bookingFlow: unknown; voiceBooking: unknown; services: unknown }>
    >`select welcome_message as "welcomeMessage", theme_color as "themeColor", icon_color as "iconColor", booking_flow as "bookingFlow", voice_booking as "voiceBooking", services as "services" from organization_chatbot_settings where organization_id = ${organizationId}::uuid limit 1`,
    prisma.$queryRaw<
      Array<{ parsedData: unknown | null }>
    >`select parsed_data as "parsedData" from organization_knowledge_bases where organization_id = ${organizationId}::uuid limit 1`,
  ]);

  return resolveChatbotConfigData(chatbotSettingsRows[0], knowledgeBaseRows[0]?.parsedData);
}

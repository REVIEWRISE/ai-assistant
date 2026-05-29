import type { Prisma } from "@prisma/client";

/** Shared select for organization chatbot settings (keep in sync with schema). */
export const organizationChatbotSettingsSelect = {
  welcomeMessage: true,
  themeColor: true,
  iconColor: true,
  bookingFlow: true,
  services: true,
  crmIntegration: true,
} satisfies Prisma.OrganizationChatbotSettingsSelect;

export type OrganizationChatbotSettingsPayload = Prisma.OrganizationChatbotSettingsGetPayload<{
  select: typeof organizationChatbotSettingsSelect;
}>;

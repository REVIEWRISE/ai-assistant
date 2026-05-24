import type { Metadata } from "next";
import { FloatingBookingChatbot } from "@/components/floating-booking-chatbot";
import { resolveChatbotConfigData } from "@/lib/chatbot-config";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Booking assistant",
  robots: { index: false, follow: false },
};

export default async function EmbedChatbotPage({
  searchParams,
}: {
  searchParams?: Promise<{ org?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const organizationId = String(sp.org ?? "").trim();

  if (!organizationId) {
    return (
      <div className="flex min-h-[120px] items-center justify-center bg-[var(--color-surface)] p-4 text-center text-xs text-[var(--color-text-muted)]">
        Missing <code className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 text-[var(--color-text)]">org</code>{" "}
        query parameter.
      </div>
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
    },
  });

  const [chatbotSettingsRows, knowledgeBaseRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{ welcomeMessage: string; themeColor: string; iconColor: string; bookingFlow: unknown; services: unknown }>
    >`select welcome_message as "welcomeMessage", theme_color as "themeColor", icon_color as "iconColor", booking_flow as "bookingFlow", services as "services" from organization_chatbot_settings where organization_id = ${organizationId}::uuid limit 1`,
    prisma.$queryRaw<
      Array<{ parsedData: unknown | null }>
    >`select parsed_data as "parsedData" from organization_knowledge_bases where organization_id = ${organizationId}::uuid limit 1`,
  ]);

  if (!org) {
    return (
      <div className="flex min-h-[120px] items-center justify-center bg-[var(--color-surface)] p-4 text-center text-xs text-[var(--color-text-muted)]">
        Assistant unavailable.
      </div>
    );
  }

  const cfg = resolveChatbotConfigData(chatbotSettingsRows[0], knowledgeBaseRows[0]?.parsedData);

  return (
    <>
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          background: transparent !important;
        }
      `}</style>
      <div className="min-h-[100dvh] w-full bg-transparent">
        <FloatingBookingChatbot
          organizationId={organizationId}
          organizationName={org.name}
          welcomeMessage={cfg.welcomeMessage}
          themeColor={cfg.themeColor}
          iconColor={cfg.iconColor}
          bookingFlow={cfg.bookingFlow}
        />
      </div>
    </>
  );
}

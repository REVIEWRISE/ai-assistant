import type { Metadata } from "next";
import { FloatingBookingChatbot } from "@/components/floating-booking-chatbot";
import { prisma } from "@/lib/prisma";
import { loadPublicChatbotConfig } from "@/lib/public-chatbot-config";

export const metadata: Metadata = {
  title: "Booking assistant",
  robots: { index: false, follow: false },
};

export default async function EmbedChatbotPage({
  searchParams,
}: {
  searchParams?: Promise<{ org?: string; open?: string; layout?: string }>;
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

  if (!org) {
    return (
      <div className="flex min-h-[120px] items-center justify-center bg-[var(--color-surface)] p-4 text-center text-xs text-[var(--color-text-muted)]">
        Assistant unavailable.
      </div>
    );
  }

  const cfg = await loadPublicChatbotConfig(organizationId);

  return (
    <>
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          background: transparent !important;
        }
      `}</style>
      <div className={sp.layout === "fill" ? "box-border h-[100dvh] w-full bg-transparent p-4" : "min-h-[100dvh] w-full bg-transparent"}>
        <FloatingBookingChatbot
          organizationId={organizationId}
          organizationName={org.name}
          welcomeMessage={cfg.welcomeMessage}
          themeColor={cfg.themeColor}
          iconColor={cfg.iconColor}
          bookingFlow={cfg.bookingFlow}
          voiceBooking={cfg.voiceBooking}
          defaultOpen={sp.open === "1"}
          fill={sp.layout === "fill"}
        />
      </div>
    </>
  );
}

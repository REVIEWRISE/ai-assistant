import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { FloatingBookingChatbot } from "@/components/floating-booking-chatbot";
import { assertOrgFeatureAccess } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { loadPublicChatbotConfig } from "@/lib/public-chatbot-config";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ src?: string }>;
};

function findOrganization(slug: string) {
  return prisma.organization.findUnique({
    where: { bookingSlug: slug.toLowerCase() },
    select: { id: true, name: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const org = await findOrganization((await params).slug);
  const title = org ? `Book with ${org.name}` : "Booking";
  return {
    title,
    openGraph: { title, description: "Book an appointment online." },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function PublicBookingPage({ params, searchParams }: Props) {
  const org = await findOrganization((await params).slug);
  if (!org) notFound();

  const access = await assertOrgFeatureAccess(org.id, "web_chatbot");
  if (!access.ok) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
        Online booking is not available for {org.name} right now. Please contact them directly.
      </main>
    );
  }

  const cfg = await loadPublicChatbotConfig(org.id);
  const channel = (await searchParams)?.src === "qr" ? "qr" : "link";

  return (
    <main className="mx-auto box-border h-[100dvh] w-full max-w-[460px] p-2 sm:py-6">
      <FloatingBookingChatbot
        organizationId={org.id}
        organizationName={org.name}
        welcomeMessage={cfg.welcomeMessage}
        themeColor={cfg.themeColor}
        iconColor={cfg.iconColor}
        bookingFlow={cfg.bookingFlow}
        voiceBooking={cfg.voiceBooking}
        channel={channel}
        fill
      />
    </main>
  );
}

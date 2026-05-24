import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChatbotOrganizationsTable } from "@/components/chatbot-organizations-table";
import {
  AppPageHero,
  AppPageHeroStat,
  AppPageHeroStatGrid,
  AppPageHeroStatPanel,
} from "@/components/app-page-hero";
import { getAppOrigin } from "@/lib/app-origin";
import { resolveChatbotConfigData } from "@/lib/chatbot-config";
import { generateChatbotFromKnowledge, saveChatbotConfig } from "./actions";
import Link from "next/link";

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
          organizationMembers: {
            orderBy: { createdAt: "asc" },
            select: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  createdAt: true,
                  chatbotSettings: {
                    select: {
                      welcomeMessage: true,
                      themeColor: true,
                      iconColor: true,
                      bookingFlow: true,
                      services: true,
                    },
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
  const organizations = memberships.map((m) => m.organization);
  const totalOrganizations = organizations.length;
  const sortedByCreated = organizations
    .slice()
    .sort((a: { createdAt: Date }, b: { createdAt: Date }) => a.createdAt.getTime() - b.createdAt.getTime());
  const newestOrganization = sortedByCreated[sortedByCreated.length - 1];
  const newestLabel = newestOrganization
    ? new Date(newestOrganization.createdAt).toLocaleDateString()
    : "—";
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
      config,
    };
  });

  const params = (await searchParams) ?? {};
  const embedBaseUrl = await getAppOrigin();

  const errorMessages: Record<string, string> = {
    chatbot_org_missing: "Missing organization for this save request.",
    chatbot_org_denied: "You do not have access to configure chatbot for that organization.",
    chatbot_generate_no_api_key: "Add OPENAI_API_KEY to generate the assistant from your knowledge base.",
    chatbot_generate_no_kb: "Import a knowledge base first (substantial text). Then try generating again.",
    chatbot_generate_failed: "Could not generate chatbot settings. Try again or edit manually.",
  };

  return (
    <div className="space-y-5">
      <AppPageHero
        eyebrow="Configure chatbot"
        title={
          <>
            Configure booking assistant per{" "}
            <span className="vr-brand-gradient-text">organization</span>
          </>
        }
        description={
          <>
            Every organization you belong to is listed below with its own chatbot settings. Configure any row
            independently. Saving here does not change your active workspace. To switch which organization drives your
            session (and the signed-in marketing widget), use{" "}
            <Link
              href="/appointments/organization"
              className="font-semibold text-[color-mix(in_srgb,var(--color-primary)_78%,white)] underline decoration-[color-mix(in_srgb,var(--color-primary)_45%,transparent)] underline-offset-2 hover:text-white"
            >
              Appointment Agent → Organization
            </Link>
            .
          </>
        }
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="4">
            <AppPageHeroStat label="Total organizations" value={totalOrganizations} />
            <AppPageHeroStat label="Active session workspace" value={activeOrganization?.name ?? "—"} />
            <AppPageHeroStat label="Newest organization" value={newestOrganization?.name ?? "—"} />
            <AppPageHeroStat label="Last created" value={newestLabel} />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

      {params.success === "saved" ? (
        <div className="vr-app-alert vr-app-alert-success">Chatbot settings saved.</div>
      ) : null}

      {params.error && errorMessages[params.error] ? (
        <div className="vr-app-alert vr-app-alert-danger">{errorMessages[params.error]}</div>
      ) : null}

      <ChatbotOrganizationsTable
        embedBaseUrl={embedBaseUrl}
        rows={rows}
        onSaveChatbot={saveChatbotConfig}
        onGenerateChatbot={generateChatbotFromKnowledge}
      />
    </div>
  );
}

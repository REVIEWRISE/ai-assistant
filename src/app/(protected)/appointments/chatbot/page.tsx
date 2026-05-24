import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChatbotOrganizationsTable } from "@/components/chatbot-organizations-table";
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
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
          Configure chatbot
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          Configure booking assistant per organization
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Every organization you belong to is listed below with its own chatbot settings. Configure any row independently.
          Saving here does not change your active workspace. To switch which organization drives your session (and the
          signed-in marketing widget), use{" "}
          <Link href="/appointments/organization" className="font-semibold text-indigo-200 underline decoration-indigo-200/60 underline-offset-2 hover:text-white">
            Appointment Agent → Organization
          </Link>
          .
        </p>
        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Total organizations</p>
            <p className="text-lg font-semibold text-white">{totalOrganizations}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Active session workspace</p>
            <p className="text-lg font-semibold text-white">{activeOrganization?.name ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Newest organization</p>
            <p className="text-lg font-semibold text-white">{newestOrganization?.name ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <p className="text-slate-300">Last created</p>
            <p className="text-lg font-semibold text-white">{newestLabel}</p>
          </div>
        </div>
      </section>

      {params.success === "saved" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Chatbot settings saved.
        </div>
      ) : null}

      {params.error && errorMessages[params.error] ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessages[params.error]}
        </div>
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

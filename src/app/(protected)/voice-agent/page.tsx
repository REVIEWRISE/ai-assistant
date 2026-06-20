import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppPageHero, AppPageHeroStat, AppPageHeroStatGrid, AppPageHeroStatPanel } from "@/components/app-page-hero";
import { VoiceAgentPageAlerts } from "@/components/voice-agent-page-alerts";
import { VoiceAgentTabs } from "@/components/voice-agent-tabs";
import { userHasAdminRole } from "@/lib/allowed-menu-paths";
import { prisma } from "@/lib/prisma";
import { isRetellApiConfigured } from "@/lib/retell-api";
import {
  fetchRetellVoiceAgentConfig,
  fetchRetellVoiceCatalog,
  resolveVoiceAgentPhoneFromRetell,
} from "@/lib/retell-voice-sync";
import {
  buildRetellVoiceSelectOptions,
  formatVoiceAgentCallSummary,
  resolveVoiceAgentSettings,
} from "@/lib/retell-voice-agent";
import {
  generateVoiceAgentOpeningMessageAction,
  generateVoiceAgentSystemPromptAction,
  pullRetellVoiceAgentSettings,
  saveRetellVoiceAgentSettings,
  saveVoiceAgentPhoneSettings,
} from "./actions";

export default async function VoiceAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: {
      user: {
        select: {
          userRoles: { select: { role: { select: { name: true } } } },
        },
      },
      activeOrganization: {
        select: {
          id: true,
          name: true,
          knowledgeBase: {
            select: {
              status: true,
              sourceUrl: true,
              rawText: true,
              lastImportedAt: true,
            },
          },
          voiceAgentSettings: {
            select: {
              retellConfig: true,
              phoneConfig: true,
              knowledgeConfig: true,
            },
          },
        },
      },
    },
  });

  if (!session) redirect("/login");
  if (!session.activeOrganization) redirect("/appointments/organization");

  const isAdmin = userHasAdminRole(session.user.userRoles.map((ur) => ur.role));
  if (!isAdmin && params.tab === "phone") {
    redirect("/voice-agent");
  }

  const org = session.activeOrganization;
  const retellApiConfigured = isRetellApiConfigured();
  const retellVoices = retellApiConfigured ? await fetchRetellVoiceCatalog() : [];
  const localSettings = resolveVoiceAgentSettings(org.voiceAgentSettings, retellVoices);
  const voiceOptions = buildRetellVoiceSelectOptions(retellVoices, localSettings.retell.voiceId);

  let retellConfig = localSettings.retell;
  let retellRemoteStatus: string | null = null;

  if (retellApiConfigured && localSettings.retell.retellAgentId.trim()) {
    const imported = await fetchRetellVoiceAgentConfig(localSettings.retell);
    if (imported.ok) {
      retellConfig = imported.config;
      retellRemoteStatus = "Loaded from Retell";
    } else {
      retellRemoteStatus = imported.error;
    }
  } else if (!retellApiConfigured) {
    retellRemoteStatus = "Add RETELL_API_KEY to connect to Retell";
  }

  let phoneConfig = localSettings.phone;
  if (isAdmin && retellApiConfigured && phoneConfig.twilioPhoneNumber.trim()) {
    phoneConfig = await resolveVoiceAgentPhoneFromRetell(phoneConfig);
  }

  const kb = org.knowledgeBase;
  const kbStatus = kb?.status ?? "empty";
  const kbPreviewLength = kb?.rawText?.trim().length ?? 0;
  const kbPreviewText = kb?.rawText?.trim().slice(0, 4000) ?? "";

  return (
    <div className="space-y-5">
      <Suspense fallback={null}>
        <VoiceAgentPageAlerts />
      </Suspense>

      <AppPageHero
        eyebrow="Voice Support Agent"
        title={
          <>
            Configure your{" "}
            <span className="vr-brand-gradient-text">Retell AI phone agent</span>
          </>
        }
        description="Create a per-organization Retell voice agent here, or link an existing one. Saves push voice, prompts, and knowledge to Retell."
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="2">
            <AppPageHeroStat
              label="Retell"
              value={retellApiConfigured ? "Connected" : "No API key"}
            />
            {isAdmin ? (
              <AppPageHeroStat
                label="Support line"
                value={phoneConfig.twilioPhoneNumber.trim() || "Not set"}
              />
            ) : null}
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        <span className="font-semibold text-[var(--color-text)]">{org.name}</span>
        {isAdmin ? (
          <>
            {" · "}
            {formatVoiceAgentCallSummary(phoneConfig)}
          </>
        ) : null}
        {" · "}
        Knowledge: {kbStatus === "approved" ? "approved" : kbStatus}
        {retellRemoteStatus ? (
          <>
            {" · "}
            <span
              className={
                retellRemoteStatus === "Loaded from Retell"
                  ? "text-[var(--color-success)]"
                  : ""
              }
            >
              {retellRemoteStatus}
            </span>
          </>
        ) : null}
      </div>

      <VoiceAgentTabs
        organizationId={org.id}
        organizationName={org.name}
        canManagePhone={isAdmin}
        retellApiConfigured={retellApiConfigured}
        voiceOptions={voiceOptions}
        voiceCatalog={retellVoices}
        retellConfig={retellConfig}
        phoneConfig={phoneConfig}
        knowledgeConfig={localSettings.knowledge}
        knowledge={{
          status: kbStatus,
          sourceUrl: kb?.sourceUrl ?? null,
          previewLength: kbPreviewLength,
          previewText: kbPreviewText,
          lastImportedAt: kb?.lastImportedAt?.toISOString() ?? null,
        }}
        onSaveRetell={saveRetellVoiceAgentSettings}
        onSavePhone={saveVoiceAgentPhoneSettings}
        onPullFromRetell={pullRetellVoiceAgentSettings}
        onGenerateOpeningMessage={generateVoiceAgentOpeningMessageAction}
        onGenerateSystemPrompt={generateVoiceAgentSystemPromptAction}
      />
    </div>
  );
}

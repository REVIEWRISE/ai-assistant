import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppPageHero, AppPageHeroStat, AppPageHeroStatGrid, AppPageHeroStatPanel } from "@/components/app-page-hero";
import { VoiceAgentPageAlerts } from "@/components/voice-agent-page-alerts";
import { VoiceAgentTabs } from "@/components/voice-agent-tabs";
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

export const dynamic = "force-dynamic";

export default async function VoiceAgentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: {
      user: {
        select: { id: true },
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

  const org = session.activeOrganization;
  const retellApiConfigured = isRetellApiConfigured();
  const retellVoices = retellApiConfigured ? await fetchRetellVoiceCatalog() : [];
  const localSettings = resolveVoiceAgentSettings(org.voiceAgentSettings, retellVoices);
  const voiceOptions = buildRetellVoiceSelectOptions(retellVoices, localSettings.retell.voiceId);

  const retellConfig = localSettings.retell;
  let retellRemoteStatus: string | null = null;

  if (retellApiConfigured && localSettings.retell.retellAgentId.trim()) {
    const imported = await fetchRetellVoiceAgentConfig(localSettings.retell);
    if (imported.ok) {
      retellRemoteStatus = "Live in Retell — save & sync after editing opening message or prompts";
    } else {
      retellRemoteStatus = imported.error;
    }
  } else if (!retellApiConfigured) {
    retellRemoteStatus = "Add RETELL_API_KEY to connect to Retell";
  }

  let phoneConfig = localSettings.phone;
  if (retellApiConfigured && phoneConfig.twilioPhoneNumber.trim()) {
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
        description="Configure your Retell voice agent, support phone number, prompts, knowledge, and phone booking."
      >
        <AppPageHeroStatPanel>
          <AppPageHeroStatGrid columns="2">
            <AppPageHeroStat
              label="Retell"
              value={retellApiConfigured ? "Connected" : "No API key"}
            />
            <AppPageHeroStat
              label="Support line"
              value={phoneConfig.twilioPhoneNumber.trim() || "Not set"}
            />
          </AppPageHeroStatGrid>
        </AppPageHeroStatPanel>
      </AppPageHero>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        <span className="font-semibold text-[var(--color-text)]">{org.name}</span>
        {" · "}
        {formatVoiceAgentCallSummary(phoneConfig)}
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
        canManageAgent
        canManagePhone
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

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { VoiceAgentPageAlerts } from "@/components/voice-agent-page-alerts";
import { VoiceAgentTabs } from "@/components/voice-agent-tabs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-session";
import { isRetellApiConfigured } from "@/lib/retell-api";
import {
  fetchRetellVoiceAgentConfig,
  fetchRetellVoiceCatalog,
  resolveVoiceAgentPhoneFromRetell,
} from "@/lib/retell-voice-sync";
import {
  buildRetellVoiceSelectOptions,
  resolveVoiceAgentSettings,
} from "@/lib/retell-voice-agent";
import {
  generateVoiceAgentOpeningMessageAction,
  generateVoiceAgentSystemPromptAction,
  pullRetellVoiceAgentSettings,
  saveRetellVoiceAgentSettings,
  buyRetellPhoneNumberAction,
  assignRetellPhoneNumberAction,
  linkRetellPhoneNumberAction,
  setPrimaryRetellPhoneNumberAction,
  refreshRetellPhoneNumbersAction,
} from "./actions";
import { getOrgRetellPhoneNumberStats } from "@/lib/retell-phone-analytics";
import { isTwilioForwardingConfigured } from "@/lib/twilio-forwarding";
import {
  ensureLegacyPrimaryPhoneImported,
  listOrgRetellPhoneNumbers,
} from "@/lib/retell-phone-numbers";
import { getOrgVoiceMinutesUsage } from "@/lib/voice-minutes";

export const dynamic = "force-dynamic";

export default async function VoiceAgentPage() {
  const authSession = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: authSession.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  if (!user) redirect("/login");

  const session = {
    user,
    activeOrganizationId: authSession.activeOrganizationId,
  };

  let org = null;
  if (session.activeOrganizationId) {
    org = await prisma.organization.findFirst({
      where: { id: session.activeOrganizationId },
      include: {
        knowledgeBase: {
          select: { status: true, rawText: true, sourceUrl: true, lastImportedAt: true },
        },
        voiceAgentSettings: {
          select: { retellConfig: true, phoneConfig: true, knowledgeConfig: true },
        },
      },
    });
  }

  if (!org) {
    org = await prisma.organization.findFirst({
      where: {
        members: {
          some: { userId: session.user.id },
        },
      },
      include: {
        knowledgeBase: {
          select: { status: true, rawText: true, sourceUrl: true, lastImportedAt: true },
        },
        voiceAgentSettings: {
          select: { retellConfig: true, phoneConfig: true, knowledgeConfig: true },
        },
      },
    });
  }

  if (!org) redirect("/appointments/organization");

  const retellApiConfigured = isRetellApiConfigured();
  const twilioForwardingConfigured = isTwilioForwardingConfigured();
  const retellVoices = retellApiConfigured ? await fetchRetellVoiceCatalog() : [];
  const localSettings = resolveVoiceAgentSettings(org.voiceAgentSettings, retellVoices);
  const voiceOptions = buildRetellVoiceSelectOptions(retellVoices, localSettings.retell.voiceId);

  const retellConfig = localSettings.retell;
  let retellRemoteStatus: string | null = null;
  let remoteAgentMissing = false;

  if (retellApiConfigured && localSettings.retell.retellAgentId.trim()) {
    const imported = await fetchRetellVoiceAgentConfig(localSettings.retell);
    if (imported.ok) {
      retellRemoteStatus = "Live — save & sync after editing opening message or prompts";
    } else if (imported.status === 404) {
      remoteAgentMissing = true;
      retellRemoteStatus =
        "The saved voice agent no longer exists in Retell. Review the settings and select Save & recreate to create and relink it.";
    } else {
      retellRemoteStatus = `Could not verify the voice agent: ${imported.error}`;
    }
  } else if (!retellApiConfigured) {
    retellRemoteStatus = "Add API key to connect voice service";
  }

  let phoneConfig = localSettings.phone;
  if (retellApiConfigured && phoneConfig.twilioPhoneNumber.trim()) {
    phoneConfig = await resolveVoiceAgentPhoneFromRetell(phoneConfig);
  }

  if (retellApiConfigured && localSettings.retell.retellAgentId.trim()) {
    await ensureLegacyPrimaryPhoneImported({
      organizationId: org.id,
      legacyPhoneNumber: phoneConfig.twilioPhoneNumber,
      retellAgentId: localSettings.retell.retellAgentId,
    });
  }

  const phones = await listOrgRetellPhoneNumbers(org.id);
  const phoneStats = await getOrgRetellPhoneNumberStats(org.id);
  const primaryPhone = phones.find((phone) => phone.isPrimary);
  if (primaryPhone) {
    phoneConfig = { twilioPhoneNumber: primaryPhone.phoneNumber };
  }

  const kb = org.knowledgeBase;
  const kbStatus = kb?.status ?? "empty";
  const kbPreviewLength = kb?.rawText?.trim().length ?? 0;
  const kbPreviewText = kb?.rawText?.trim().slice(0, 4000) ?? "";

  const dbCalls = await prisma.retellCall.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
  });

  const calls = dbCalls.map((call) => ({
    id: call.id,
    callId: call.callId,
    agentId: call.agentId,
    callStatus: call.callStatus,
    direction: call.direction,
    fromNumber: call.fromNumber,
    toNumber: call.toNumber,
    durationSeconds: call.durationSeconds,
    recordingUrl: call.recordingUrl,
    summary: call.summary,
    sentiment: call.sentiment,
    transcript: call.transcript,
    createdAt: call.createdAt.toISOString(),
  }));
  const voiceMinutes = await getOrgVoiceMinutesUsage(org.id);

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        <VoiceAgentPageAlerts
          statusMessage={
            !voiceMinutes.voiceIncluded
              ? "Voice calling is included on Pro Voice only. Starter and Growth do not include the AI phone agent."
              : voiceMinutes.minutesExhausted
                ? `Included calling minutes are used up for this billing period (${voiceMinutes.usedMinutes}/${voiceMinutes.includedMinutes} min). New inbound calls will be ended until the period renews.`
                : retellRemoteStatus && !retellRemoteStatus.startsWith("Live")
                  ? retellRemoteStatus
                  : null
          }
        />
      </Suspense>

      <VoiceAgentTabs
        organizationId={org.id}
        organizationName={org.name}
        canManageAgent
        canManagePhone
        retellApiConfigured={retellApiConfigured}
        twilioForwardingConfigured={twilioForwardingConfigured}
        remoteAgentMissing={remoteAgentMissing}
        voiceOptions={voiceOptions}
        voiceCatalog={retellVoices}
        retellConfig={retellConfig}
        phoneConfig={phoneConfig}
        phones={phones}
        phoneStats={phoneStats}
        knowledgeConfig={localSettings.knowledge}
        knowledge={{
          status: kbStatus,
          sourceUrl: kb?.sourceUrl ?? null,
          previewLength: kbPreviewLength,
          previewText: kbPreviewText,
          lastImportedAt: kb?.lastImportedAt?.toISOString() ?? null,
        }}
        calls={calls}
        onSaveRetell={saveRetellVoiceAgentSettings}
        onBuyPhone={buyRetellPhoneNumberAction}
        onAssignPhone={assignRetellPhoneNumberAction}
        onLinkPhone={linkRetellPhoneNumberAction}
        onSetPrimaryPhone={setPrimaryRetellPhoneNumberAction}
        onRefreshPhones={refreshRetellPhoneNumbersAction}
        onPullFromRetell={pullRetellVoiceAgentSettings}
        onGenerateOpeningMessage={generateVoiceAgentOpeningMessageAction}
        onGenerateSystemPrompt={generateVoiceAgentSystemPromptAction}
      />
    </div>
  );
}

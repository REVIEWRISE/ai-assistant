import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
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
  resolveVoiceAgentSettings,
} from "@/lib/retell-voice-agent";
import {
  generateVoiceAgentOpeningMessageAction,
  generateVoiceAgentSystemPromptAction,
  pullRetellVoiceAgentSettings,
  saveRetellVoiceAgentSettings,
  buyRetellPhoneNumberAction,
  assignRetellPhoneNumberAction,
  setPrimaryRetellPhoneNumberAction,
  refreshRetellPhoneNumbersAction,
} from "./actions";
import { getOrgRetellPhoneNumberStats } from "@/lib/retell-phone-analytics";
import {
  ensureLegacyPrimaryPhoneImported,
  listOrgRetellPhoneNumbers,
} from "@/lib/retell-phone-numbers";

export const dynamic = "force-dynamic";

export default async function VoiceAgentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: {
      user: {
        select: {
          id: true,
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

  const org = session.activeOrganization;
  const retellApiConfigured = isRetellApiConfigured();
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
  const callsReceived = phoneStats.reduce((sum, phone) => sum + phone.callsReceived, 0);
  const phoneBookings = phoneStats.reduce((sum, phone) => sum + phone.bookingsCount, 0);
  const agentReady =
    Boolean(localSettings.retell.retellAgentId.trim()) && !remoteAgentMissing;
  const voiceStatus = !retellApiConfigured
    ? "Voice service setup required"
    : phones.length === 0
      ? "Phone line required"
      : remoteAgentMissing
        ? "Agent connection needs repair"
      : agentReady
        ? "Voice agent operational"
        : "Agent setup required";
  const voiceStatusTone: "success" | "warning" =
    retellApiConfigured && phones.length > 0 && agentReady ? "success" : "warning";

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        <VoiceAgentPageAlerts
          statusMessage={
            retellRemoteStatus && !retellRemoteStatus.startsWith("Live")
              ? retellRemoteStatus
              : null
          }
        />
      </Suspense>

      <AppointmentPageHeader
        variant="command"
        eyebrow="Voice Support"
        title="Voice operations"
        description={<>Configure and monitor the AI phone agent serving {org.name}.</>}
        status={voiceStatus}
        statusTone={voiceStatusTone}
        actions={[
          { href: "/voice-agent?tab=agent", label: "Configure agent" },
          { href: "/voice-agent?tab=phone", label: phones.length > 0 ? "Manage phone lines" : "Set up phone line", primary: true },
        ]}
        metrics={[
          { label: "Phone lines", value: phones.length, hint: primaryPhone ? "primary line active" : "no primary line" },
          { label: "Calls received", value: callsReceived, hint: "last 30 days" },
          { label: "Bookings by phone", value: phoneBookings, hint: "last 30 days" },
          {
            label: "Voice booking",
            value: localSettings.knowledge.enablePhoneBooking ? "On" : "Off",
            hint: localSettings.knowledge.enablePhoneBooking
              ? "Callers can book on this line"
              : "Hidden until enabled in Agent setup",
          },
        ]}
      />

      <VoiceAgentTabs
        organizationId={org.id}
        organizationName={org.name}
        canManageAgent
        canManagePhone
        retellApiConfigured={retellApiConfigured}
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
        onSetPrimaryPhone={setPrimaryRetellPhoneNumberAction}
        onRefreshPhones={refreshRetellPhoneNumbersAction}
        onPullFromRetell={pullRetellVoiceAgentSettings}
        onGenerateOpeningMessage={generateVoiceAgentOpeningMessageAction}
        onGenerateSystemPrompt={generateVoiceAgentSystemPromptAction}
      />
    </div>
  );
}

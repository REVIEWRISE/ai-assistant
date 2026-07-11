"use client";

import { VoiceAgentPhoneManager } from "@/components/voice-agent-phone-manager";
import { VoiceAgentPhoneSummary } from "@/components/voice-agent-phone-summary";
import type { RetellPhoneNumberStats } from "@/lib/retell-phone-analytics";
import type { OrgRetellPhoneNumber } from "@/lib/retell-phone-numbers";
import type { VoiceAgentPhoneConfig } from "@/lib/retell-voice-agent";

export function VoiceAgentPhoneSettings({
  organizationId,
  initialConfig,
  retellAgentId = "",
  retellApiConfigured,
  phones,
  phoneStats,
  onBuy,
  onLink,
  onAssign,
  onSetPrimary,
  onRefresh,
}: {
  organizationId: string;
  initialConfig: VoiceAgentPhoneConfig;
  retellAgentId?: string;
  retellApiConfigured: boolean;
  phones: OrgRetellPhoneNumber[];
  phoneStats: RetellPhoneNumberStats[];
  onBuy: (formData: FormData) => void | Promise<void>;
  onLink: (formData: FormData) => void | Promise<void>;
  onAssign: (formData: FormData) => void | Promise<void>;
  onSetPrimary: (formData: FormData) => void | Promise<void>;
  onRefresh: (formData: FormData) => void | Promise<void>;
}) {
  const primaryPhone =
    phones.find((phone) => phone.isPrimary)?.phoneNumber || initialConfig.twilioPhoneNumber;

  return (
    <section className="space-y-4">
      <VoiceAgentPhoneSummary
        phoneConfig={{ twilioPhoneNumber: primaryPhone }}
        retellAgentId={retellAgentId}
        canManagePhone
      />

      <VoiceAgentPhoneManager
        organizationId={organizationId}
        retellAgentId={retellAgentId}
        retellApiConfigured={retellApiConfigured}
        phones={phones}
        phoneStats={phoneStats}
        onBuy={onBuy}
        onLink={onLink}
        onAssign={onAssign}
        onSetPrimary={onSetPrimary}
        onRefresh={onRefresh}
      />
    </section>
  );
}

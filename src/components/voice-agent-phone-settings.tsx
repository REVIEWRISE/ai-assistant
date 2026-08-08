"use client";

import { VoiceAgentPhoneManager } from "@/components/voice-agent-phone-manager";
import type { RetellPhoneNumberStats } from "@/lib/retell-phone-analytics";
import type { OrgRetellPhoneNumber } from "@/lib/retell-phone-numbers";

export function VoiceAgentPhoneSettings({
  organizationId,
  retellAgentId = "",
  retellApiConfigured,
  phones,
  phoneStats,
  onBuy,
  onAssign,
  onSetPrimary,
  onRefresh,
}: {
  organizationId: string;
  retellAgentId?: string;
  retellApiConfigured: boolean;
  phones: OrgRetellPhoneNumber[];
  phoneStats: RetellPhoneNumberStats[];
  onBuy: (formData: FormData) => void | Promise<void>;
  onAssign: (formData: FormData) => void | Promise<void>;
  onSetPrimary: (formData: FormData) => void | Promise<void>;
  onRefresh: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <section className="space-y-4">
      <VoiceAgentPhoneManager
        organizationId={organizationId}
        retellAgentId={retellAgentId}
        retellApiConfigured={retellApiConfigured}
        phones={phones}
        phoneStats={phoneStats}
        onBuy={onBuy}
        onAssign={onAssign}
        onSetPrimary={onSetPrimary}
        onRefresh={onRefresh}
      />
    </section>
  );
}

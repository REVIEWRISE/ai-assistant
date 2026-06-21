"use client";

import { useEffect, useState } from "react";
import { VoiceAgentPhoneSummary } from "@/components/voice-agent-phone-summary";
import { Panel } from "@/components/ui";
import {
  defaultVoiceAgentPhoneConfig,
  type VoiceAgentPhoneConfig,
} from "@/lib/retell-voice-agent";

export function VoiceAgentPhoneSettings({
  organizationId,
  initialConfig,
  retellAgentId = "",
  onSave,
}: {
  organizationId: string;
  initialConfig: VoiceAgentPhoneConfig;
  retellAgentId?: string;
  onSave: (formData: FormData) => void | Promise<void>;
}) {
  const [config, setConfig] = useState<VoiceAgentPhoneConfig>(initialConfig);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  return (
    <Panel
      title="Phone & calling"
      subtitle="The number customers dial — business hours and policies come from your knowledge base"
    >
      <form action={onSave} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />

        <VoiceAgentPhoneSummary
          phoneConfig={config}
          retellAgentId={retellAgentId}
          canManagePhone
        />

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-[var(--color-text)]">Support phone number</span>
          <input
            name="twilio_phone_number"
            value={config.twilioPhoneNumber}
            onChange={(e) => setConfig((prev) => ({ ...prev, twilioPhoneNumber: e.target.value }))}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            placeholder="+15551234567"
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            E.164 format (e.g. +15551234567). Must be imported in Retell before saving.
          </span>
        </label>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-muted)] pt-4">
          <button
            type="button"
            onClick={() => setConfig(defaultVoiceAgentPhoneConfig())}
            className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
          >
            Reset to defaults
          </button>
          <button
            type="submit"
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
          >
            Save phone settings
          </button>
        </div>
      </form>
    </Panel>
  );
}

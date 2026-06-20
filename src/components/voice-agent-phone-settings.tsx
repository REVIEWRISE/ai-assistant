"use client";

import { useState } from "react";
import { Panel } from "@/components/ui";
import {
  defaultVoiceAgentPhoneConfig,
  formatVoiceAgentCallSummary,
  type VoiceAgentPhoneConfig,
} from "@/lib/retell-voice-agent";

export function VoiceAgentPhoneSettings({
  organizationId,
  initialConfig,
  onSave,
}: {
  organizationId: string;
  initialConfig: VoiceAgentPhoneConfig;
  onSave: (formData: FormData) => void | Promise<void>;
}) {
  const [config, setConfig] = useState<VoiceAgentPhoneConfig>(initialConfig);
  const callSummary = formatVoiceAgentCallSummary(config);

  return (
    <Panel
      title="Phone & calling"
      subtitle="The number customers dial — business hours and policies come from your knowledge base"
    >
      <form action={onSave} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            How customers call
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{callSummary}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            E.164 format. The number must already exist in Retell Phone Numbers. Saving links it to your
            organization&apos;s agent when one is created.
          </p>
        </div>

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

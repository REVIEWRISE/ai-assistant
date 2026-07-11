import Link from "next/link";
import {
  formatVoiceAgentCallSummary,
  type VoiceAgentPhoneConfig,
} from "@/lib/retell-voice-agent";

export function VoiceAgentPhoneSummary({
  phoneConfig,
  retellAgentId,
  canManagePhone = false,
}: {
  phoneConfig: VoiceAgentPhoneConfig;
  retellAgentId?: string;
  canManagePhone?: boolean;
}) {
  const number = phoneConfig.twilioPhoneNumber.trim();
  const callSummary = formatVoiceAgentCallSummary(phoneConfig);
  const agentId = retellAgentId?.trim() ?? "";

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        Support phone number
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{callSummary}</p>
      {!number ? (
        <p className="mt-1 text-xs text-amber-900">
          No number configured yet — inbound calls will not reach this agent until one is set.
        </p>
      ) : null}
      {agentId && number ? (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Saving phone settings links this number to voice agent{" "}
          <span className="font-mono text-[var(--color-text)]">{agentId}</span>.
        </p>
      ) : null}
      {canManagePhone ? (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Buy or link numbers on this tab. Each line can route to a voice agent and is tracked in the table below.
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Edit the number on the{" "}
          <Link href="/voice-agent?tab=phone" className="font-semibold text-[var(--color-primary)] hover:underline">
            Phone &amp; Calling
          </Link>{" "}
          tab. Use the full number with country code (e.g. +15551234567).
        </p>
      )}
    </div>
  );
}

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
      {number ? (
        <p className="mt-1 font-mono text-sm text-[var(--color-text)]">{number}</p>
      ) : (
        <p className="mt-1 text-xs text-amber-900">
          No number configured yet — inbound calls will not reach this agent until one is set.
        </p>
      )}
      {agentId && number ? (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Saving phone settings links this number to Retell agent{" "}
          <span className="font-mono text-[var(--color-text)]">{agentId}</span>.
        </p>
      ) : null}
      {canManagePhone ? (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Edit the number below. It must already exist in your Retell Phone Numbers account (E.164 format).
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Edit the number on the{" "}
          <Link href="/voice-agent?tab=phone" className="font-semibold text-[var(--color-primary)] hover:underline">
            Phone &amp; Calling
          </Link>{" "}
          tab. It must already exist in your Retell Phone Numbers account (E.164 format).
        </p>
      )}
    </div>
  );
}

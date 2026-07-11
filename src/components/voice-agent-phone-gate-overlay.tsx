"use client";

type VoiceAgentPhoneGateOverlayProps = {
  onConfigurePhone: () => void;
};

export function VoiceAgentPhoneGateOverlay({ onConfigurePhone }: VoiceAgentPhoneGateOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-start justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-bg)_28%,transparent)] p-4 pt-8 backdrop-blur-[6px] backdrop-saturate-150 sm:pt-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-agent-phone-gate-title"
    >
      <div className="max-w-md rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] p-6 text-center shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          Step 1
        </p>
        <h3
          id="voice-agent-phone-gate-title"
          className="mt-2 text-lg font-semibold text-[var(--color-text)]"
        >
          Add a support phone number first
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
          You can preview the agent settings below. To edit them, add a support phone number on the Phone
          &amp; Calling tab first.
        </p>
        <button
          type="button"
          onClick={onConfigurePhone}
          className="mt-5 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
        >
          Configure phone number
        </button>
      </div>
    </div>
  );
}

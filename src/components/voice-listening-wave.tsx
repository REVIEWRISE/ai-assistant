type VoiceListeningWaveProps = {
  active?: boolean;
  label?: string;
  barCount?: number;
  compact?: boolean;
  barClassName?: string;
  className?: string;
};

export function VoiceListeningWave({
  active = true,
  label = "Listening",
  barCount = 5,
  compact = false,
  barClassName = "bg-[var(--chat-accent)]",
  className = "",
}: VoiceListeningWaveProps) {
  if (!active) return null;

  return (
    <div
      className={`flex items-center gap-2.5 ${compact ? "" : "rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_6%,var(--color-surface))] px-3 py-2 shadow-[var(--shadow-sm)]"} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {!compact ? (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-danger)] opacity-60" aria-hidden />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-danger)]" aria-hidden />
        </span>
      ) : null}
      {!compact ? (
        <span className="text-xs font-semibold text-[var(--color-text)]">{label}</span>
      ) : null}
      <div
        className={`flex items-end justify-center ${compact ? "h-5 gap-[2px]" : "h-6 gap-[3px]"}`}
        aria-hidden
      >
        {Array.from({ length: barCount }, (_, index) => (
          <span
            key={index}
            className={`voice-wave-bar rounded-full ${barClassName} ${compact ? "w-[2px]" : "w-[3px]"}`}
            style={{ animationDelay: `${index * 0.11}s` }}
          />
        ))}
      </div>
    </div>
  );
}

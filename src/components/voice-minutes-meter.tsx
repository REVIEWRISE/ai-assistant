export type VoiceMinutesMeterData = {
  /** False when the plan has expired or was never chosen; calls are refused. */
  billingActive: boolean;
  voiceIncluded: boolean;
  includedMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  /** ISO string — end of the current billing period (exclusive). */
  periodEnd: string;
};

const LOW_REMAINING_RATIO = 0.2;

function formatRenewal(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Tooltip text for the calling-minutes stat. */
export function voiceMinutesTitle(usage: VoiceMinutesMeterData): string {
  if (!usage.voiceIncluded) return "Calling minutes are included on Pro Voice only.";
  return `Plan includes ${usage.includedMinutes} calling minutes per billing period. ${usage.remainingMinutes} min left, resets ${formatRenewal(usage.periodEnd)}.`;
}

/** "X / 300 min" with a slim bar, styled for the dark agent hero card stats row. */
export function VoiceMinutesStatValue({ usage }: { usage: VoiceMinutesMeterData }) {
  if (!usage.voiceIncluded) {
    return <span className="text-white/70">Not on plan</span>;
  }

  const included = usage.includedMinutes;
  const used = Math.min(usage.usedMinutes, included);
  const percent = included > 0 ? Math.round((used / included) * 100) : 0;
  const exhausted = included > 0 && usage.usedMinutes >= included;
  const low = !exhausted && included > 0 && usage.remainingMinutes <= included * LOW_REMAINING_RATIO;
  const barClass = exhausted ? "bg-rose-400" : low ? "bg-amber-300" : "bg-white";

  return (
    <span className="block">
      <span className="tabular-nums">
        {usage.usedMinutes}
        <span className="text-sm font-medium text-white/55"> / {included} min</span>
      </span>
      <span
        className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/15"
        role="progressbar"
        aria-label="Included calling minutes used"
        aria-valuemin={0}
        aria-valuemax={included}
        aria-valuenow={used}
      >
        <span className={`block h-full rounded-full ${barClass}`} style={{ width: `${percent}%` }} />
      </span>
    </span>
  );
}

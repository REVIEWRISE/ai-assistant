import { prisma } from "@/lib/prisma";
import { getPlanEntitlement, isPlanSlug } from "@/lib/pricing-plans";

export type VoiceMinutesUsage = {
  organizationId: string;
  /** Plan includes the AI voice agent feature (Pro Voice). */
  voiceIncluded: boolean;
  includedMinutes: number;
  usedSeconds: number;
  usedMinutes: number;
  remainingMinutes: number;
  periodStart: Date;
  periodEnd: Date;
  /** True when a minute cap applies (Pro Voice). */
  enforced: boolean;
  /** True when included minutes for this period are exhausted. */
  minutesExhausted: boolean;
  /**
   * True when inbound calling must be refused:
   * plan has no voice, or Pro Voice minutes are used up.
   */
  callsBlocked: boolean;
  blockReason: "plan_excludes_voice" | "minutes_exhausted" | null;
};

type BillingInterval = "monthly" | "yearly";

function addBillingPeriod(from: Date, interval: BillingInterval): Date {
  const next = new Date(from.getTime());
  if (interval === "yearly") {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

function subtractBillingPeriod(from: Date, interval: BillingInterval): Date {
  const prev = new Date(from.getTime());
  if (interval === "yearly") {
    prev.setUTCFullYear(prev.getUTCFullYear() - 1);
  } else {
    prev.setUTCMonth(prev.getUTCMonth() - 1);
  }
  return prev;
}

function calendarMonthWindow(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/** Current billing window for voice usage, falling back to the UTC calendar month. */
export function resolveVoiceMinutesPeriod(args: {
  billingInterval: BillingInterval | null;
  currentPeriodEndsAt: Date | null;
  paidAt: Date | null;
  trialStartsAt: Date | null;
  now?: Date;
}): { start: Date; end: Date } {
  const now = args.now ?? new Date();
  const interval = args.billingInterval ?? "monthly";

  if (args.currentPeriodEndsAt) {
    let periodEnd = new Date(args.currentPeriodEndsAt.getTime());
    let periodStart = subtractBillingPeriod(periodEnd, interval);

    while (now >= periodEnd) {
      periodStart = periodEnd;
      periodEnd = addBillingPeriod(periodStart, interval);
    }

    while (now < periodStart) {
      periodEnd = periodStart;
      periodStart = subtractBillingPeriod(periodEnd, interval);
    }

    return { start: periodStart, end: periodEnd };
  }

  const anchor = args.paidAt ?? args.trialStartsAt;
  if (anchor) {
    let periodStart = new Date(anchor.getTime());
    let periodEnd = addBillingPeriod(periodStart, interval);
    while (now >= periodEnd) {
      periodStart = periodEnd;
      periodEnd = addBillingPeriod(periodStart, interval);
    }
    return { start: periodStart, end: periodEnd };
  }

  return calendarMonthWindow(now);
}

export async function getOrgVoiceMinutesUsage(
  organizationId: string,
): Promise<VoiceMinutesUsage> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      planSlug: true,
      billingInterval: true,
      currentPeriodEndsAt: true,
      paidAt: true,
      trialStartsAt: true,
    },
  });

  const planSlug = org?.planSlug && isPlanSlug(org.planSlug) ? org.planSlug : null;
  const voiceEntitlement = planSlug
    ? getPlanEntitlement(planSlug, "ai_voice_agent")
    : false;
  const voiceIncluded = voiceEntitlement === true;

  const includedRaw = planSlug
    ? getPlanEntitlement(planSlug, "included_calling_minutes")
    : 0;
  const includedMinutes =
    voiceIncluded && typeof includedRaw === "number" ? Math.max(0, includedRaw) : 0;
  // Pro Voice has a finite allowance; Starter/Growth have no voice at all.
  const enforced = voiceIncluded && includedMinutes > 0;

  const billingInterval =
    org?.billingInterval === "yearly" || org?.billingInterval === "monthly"
      ? org.billingInterval
      : null;

  const { start, end } = resolveVoiceMinutesPeriod({
    billingInterval,
    currentPeriodEndsAt: org?.currentPeriodEndsAt ?? null,
    paidAt: org?.paidAt ?? null,
    trialStartsAt: org?.trialStartsAt ?? null,
  });

  const agg = await prisma.retellCall.aggregate({
    where: {
      organizationId,
      createdAt: { gte: start, lt: end },
    },
    _sum: { durationSeconds: true },
  });

  const usedSeconds = Math.max(0, agg._sum.durationSeconds ?? 0);
  const usedMinutes = Math.ceil(usedSeconds / 60);
  const remainingMinutes = enforced ? Math.max(0, includedMinutes - usedMinutes) : 0;
  const minutesExhausted = enforced && usedMinutes >= includedMinutes;

  let blockReason: VoiceMinutesUsage["blockReason"] = null;
  if (!voiceIncluded) blockReason = "plan_excludes_voice";
  else if (minutesExhausted) blockReason = "minutes_exhausted";

  return {
    organizationId,
    voiceIncluded,
    includedMinutes,
    usedSeconds,
    usedMinutes,
    remainingMinutes,
    periodStart: start,
    periodEnd: end,
    enforced,
    minutesExhausted,
    callsBlocked: blockReason != null,
    blockReason,
  };
}

export const VOICE_PLAN_EXCLUDES_MESSAGE =
  "Voice calling is not included on this plan. Upgrade to Pro Voice to enable the AI phone agent.";

export const VOICE_MINUTES_EXCEEDED_MESSAGE =
  "We've reached this workspace's included calling minutes for the current billing period. Please try again after your plan renews, or contact support to upgrade.";

export function voiceCallBlockMessage(
  usage: Pick<VoiceMinutesUsage, "blockReason">,
): string {
  if (usage.blockReason === "plan_excludes_voice") return VOICE_PLAN_EXCLUDES_MESSAGE;
  return VOICE_MINUTES_EXCEEDED_MESSAGE;
}

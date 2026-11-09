import Link from "next/link";
import type { ReactNode } from "react";

export type AgentHeroTone = "neutral" | "success" | "warning";

export type AgentHeroAction = {
  label: string;
  /** Navigates with a link. Use `onClick` instead for in-page actions (client parents only). */
  href?: string;
  onClick?: () => void;
  external?: boolean;
};

export type AgentHeroStat = { label: string; value: ReactNode; title?: string };

const DOT_CLASS: Record<AgentHeroTone, string> = {
  neutral: "bg-white/60",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
};

const PILL_CLASS: Record<AgentHeroTone, string> = {
  neutral: "border-white/15 bg-white/10 text-white/85",
  success: "border-emerald-400/30 bg-emerald-400/15 text-emerald-100",
  warning: "border-amber-400/30 bg-amber-400/15 text-amber-100",
};

const PRIMARY_BUTTON =
  "rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#1d3a96] transition hover:bg-[#e4edff]";
const SECONDARY_BUTTON =
  "rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15";

function HeroAction({ action, primary }: { action: AgentHeroAction; primary: boolean }) {
  const className = primary ? PRIMARY_BUTTON : SECONDARY_BUTTON;
  if (action.href) {
    return (
      <Link
        href={action.href}
        target={action.external ? "_blank" : undefined}
        rel={action.external ? "noreferrer" : undefined}
        className={className}
      >
        {action.label}
        {action.external ? " ↗" : ""}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

/**
 * Compact agent header shared by Appointment Agent, Review Response and Voice Support:
 * identity + status + actions on one row, stats (and an optional footer) on a slim second row.
 */
export function AgentHeroCard({
  eyebrow,
  title,
  description,
  icon,
  status,
  badges,
  actions = [],
  stats,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  icon: ReactNode;
  status: { label: string; tone: AgentHeroTone };
  badges?: ReactNode;
  actions?: AgentHeroAction[];
  stats: AgentHeroStat[];
  footer?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] vr-app-blue text-white shadow-[var(--shadow-md)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
      {/* Soft brand glow + hairline highlight give the card depth without adding height. */}
      <div
        className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-primary)_32%,transparent),transparent_70%)] blur-2xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)]" aria-hidden />

      <div className="relative px-5 pb-5 pt-5 sm:px-7 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 flex-[1_1_20rem] items-start gap-4">
            <div className="relative shrink-0">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] text-white shadow-[0_12px_32px_-16px_rgba(0,0,0,0.9)] [&_svg]:size-7">
                {icon}
              </span>
              <span
                className={`absolute -bottom-1 -right-1 size-4 rounded-full border-[3px] border-[#1d3a96] ${DOT_CLASS[status.tone]}`}
                title={status.label}
                aria-hidden
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-white/85">{eyebrow}</p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${PILL_CLASS[status.tone]}`}
                >
                  <span className={`size-1.5 rounded-full ${DOT_CLASS[status.tone]}`} aria-hidden />
                  {status.label}
                </span>
                {badges}
              </div>
              <h1 className="mt-1.5 break-words text-xl sm:truncate font-semibold tracking-[-0.025em] text-white sm:text-2xl">{title}</h1>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/85">{description}</p>
            </div>
          </div>

          {actions.length ? (
            <div className="flex flex-wrap items-center gap-2 sm:pt-1">
              {actions.map((action, index) => (
                <HeroAction key={action.label} action={action} primary={index === 0} />
              ))}
            </div>
          ) : null}
        </div>

        <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-white/10">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0 px-4 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{stat.label}</dt>
              <dd className="mt-1 truncate text-base font-semibold tracking-[-0.01em] text-white" title={stat.title}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </section>
  );
}

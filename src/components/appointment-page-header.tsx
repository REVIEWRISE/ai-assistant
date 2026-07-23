import Link from "next/link";
import type { ReactNode } from "react";

type AppointmentPageMetric = {
  label: string;
  value: ReactNode;
  hint?: string;
};

type AppointmentPageAction = {
  href: string;
  label: string;
  primary?: boolean;
  external?: boolean;
};

export function AppointmentPageHeader({
  eyebrow = "Appointment Agent",
  title,
  description,
  status,
  statusTone = "neutral",
  metrics = [],
  actions = [],
  variant = "default",
}: {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  status?: string;
  statusTone?: "success" | "warning" | "neutral";
  metrics?: AppointmentPageMetric[];
  actions?: AppointmentPageAction[];
  variant?: "default" | "command";
}) {
  const command = variant === "command";
  const statusClass =
    command && statusTone === "success"
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
      : command && statusTone === "warning"
        ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
        : command
          ? "border-white/10 bg-white/[0.06] text-slate-300"
          : statusTone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : statusTone === "warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]";
  const dotClass =
    statusTone === "success"
      ? "bg-emerald-500"
      : statusTone === "warning"
        ? "bg-amber-500"
        : "bg-[var(--color-text-subtle)]";

  return (
    <section
      className={
        command
          ? "relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(125deg,#09101f_0%,#111a30_52%,#233b5b_100%)] text-white shadow-[var(--shadow-lg)]"
          : "overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
      }
    >
      {command ? (
        <>
          <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-indigo-500/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-sky-400/10 blur-3xl" aria-hidden />
        </>
      ) : null}

      <div className={`relative flex flex-wrap items-center justify-between gap-5 ${command ? "px-5 pb-5 pt-6 lg:px-7 lg:pt-7" : "px-4 py-4 lg:px-5"}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${command ? "text-indigo-300" : "text-[var(--color-primary-h)]"}`}>
              {eyebrow}
            </p>
            {status ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
                <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden />
                {status}
              </span>
            ) : null}
          </div>
          <h1 className={`mt-2 font-semibold tracking-[-0.025em] ${command ? "text-2xl text-white lg:text-[2rem]" : "text-xl text-[var(--color-text)]"}`}>{title}</h1>
          <div className={`mt-2 max-w-3xl text-sm leading-6 ${command ? "text-slate-300" : "text-[var(--color-text-muted)]"}`}>
            {description}
          </div>
        </div>

        {actions.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noreferrer" : undefined}
                className={
                  action.primary
                    ? `rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${command ? "bg-indigo-500 text-white shadow-[0_10px_24px_-14px_rgba(99,102,241,0.9)] hover:bg-indigo-400" : "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-h)]"}`
                    : `rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${command ? "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]" : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-raised)]"}`
                }
              >
                {action.label}
                {action.external ? " ↗" : ""}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {metrics.length ? (
        <div className={`relative grid ${command ? "gap-2 px-5 pb-5 lg:px-7 lg:pb-7" : "border-t border-[var(--color-border)] bg-[var(--color-bg)]"} sm:grid-cols-2 ${metrics.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={
                command
                  ? "min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3 backdrop-blur-sm"
                  : `min-w-0 px-4 py-3 ${index < metrics.length - 1 ? "border-b border-[var(--color-border)] sm:border-r lg:border-b-0" : ""}`
              }
            >
              <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${command ? "text-slate-400" : "text-[var(--color-text-muted)]"}`}>
                {metric.label}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className={`truncate text-lg font-semibold tabular-nums ${command ? "text-white" : "text-[var(--color-text)]"}`}>{metric.value}</p>
                {metric.hint ? (
                  <p className={`truncate text-[10px] ${command ? "text-slate-400" : "text-[var(--color-text-muted)]"}`}>{metric.hint}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

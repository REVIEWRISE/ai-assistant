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
}: {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  status?: string;
  statusTone?: "success" | "warning" | "neutral";
  metrics?: AppointmentPageMetric[];
  actions?: AppointmentPageAction[];
}) {
  const statusClass =
    statusTone === "success"
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
    <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              {eyebrow}
            </p>
            {status ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
                <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden />
                {status}
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h1>
          <div className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--color-text-muted)] lg:text-sm">
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
                    ? "rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
                    : "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
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
        <div className={`grid border-t border-[var(--color-border)] bg-[var(--color-bg)] sm:grid-cols-2 ${metrics.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`min-w-0 px-4 py-3 ${index < metrics.length - 1 ? "border-b border-[var(--color-border)] sm:border-r lg:border-b-0" : ""}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                {metric.label}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="truncate text-lg font-semibold text-[var(--color-text)] tabular-nums">{metric.value}</p>
                {metric.hint ? (
                  <p className="truncate text-[10px] text-[var(--color-text-muted)]">{metric.hint}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

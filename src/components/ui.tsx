import type { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: string;
  delta: string;
};

export function KpiCard({ label, value, delta }: KpiCardProps) {
  return (
    <div className="vr-app-panel rounded-2xl p-4 lg:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-[var(--color-text)]">{value}</p>
      <p className="mt-1 text-sm font-medium text-[var(--color-success)]">{delta}</p>
    </div>
  );
}

type PanelProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Panel({ title, subtitle, action, children }: PanelProps) {
  return (
    <section className="vr-app-panel p-4 lg:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-h)]">
      {children}
    </span>
  );
}

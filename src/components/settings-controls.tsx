"use client";

import type { ReactNode } from "react";

/** Accessible on/off switch used by settings rows. */
export function SettingsSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-hover)]"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

/** One setting: title + description on the left, control on the right, optional detail underneath. */
export function SettingsRow({
  title,
  description,
  control,
  children,
}: {
  title: string;
  description: ReactNode;
  control: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="px-5 py-4 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
          <div className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">{description}</div>
        </div>
        <div className="pt-0.5">{control}</div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

/** Card header used by the Automation settings cards. */
export function SettingsCardHeader({
  step,
  title,
  description,
  aside,
}: {
  step: string;
  title: string;
  description: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4 lg:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-h)]">
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-[-0.01em] text-[var(--color-text)]">{title}</h3>
          <div className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">{description}</div>
        </div>
      </div>
      {aside}
    </div>
  );
}

/** Save bar: shows unsaved state, a reset link, and a save button that is only active when something changed. */
export function SettingsSaveBar({
  dirty,
  readOnly,
  saveLabel,
  onReset,
}: {
  dirty: boolean;
  readOnly: boolean;
  saveLabel: string;
  onReset: () => void;
}) {
  if (readOnly) {
    return (
      <div className="flex justify-end border-t border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-3 lg:px-6">
        <span className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
          View-only access
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-3 lg:px-6">
      <p className={`text-xs ${dirty ? "font-semibold text-[var(--color-warning)]" : "text-[var(--color-text-muted)]"}`}>
        {dirty ? "Unsaved changes" : "All changes saved"}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
        >
          Reset to defaults
        </button>
        <button
          type="submit"
          disabled={!dirty}
          className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-fill-h)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

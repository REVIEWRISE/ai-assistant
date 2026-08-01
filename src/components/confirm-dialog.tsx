"use client";

import { createPortal, useFormStatus } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  onCancel: () => void;
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Array<{ name: string; value: string }>;
  tone?: "danger" | "default";
};

function ConfirmActions({
  confirmLabel,
  pendingLabel,
  onCancel,
  tone,
}: {
  confirmLabel: string;
  pendingLabel: string;
  onCancel: () => void;
  tone: "danger" | "default";
}) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:cursor-wait disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
          tone === "danger"
            ? "bg-[var(--color-danger)] text-[var(--color-danger-fg)] hover:opacity-90"
            : "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-h)]"
        }`}
      >
        {pending ? (
          <>
            <span
              className={`size-3.5 animate-spin rounded-full border-2 border-r-transparent ${
                tone === "danger"
                  ? "border-[var(--color-danger-fg)]"
                  : "border-[var(--color-primary-fg)]"
              }`}
              aria-hidden
            />
            {pendingLabel}
          </>
        ) : (
          confirmLabel
        )}
      </button>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  onCancel,
  action,
  hiddenFields,
  tone = "danger",
}: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              Confirm action
            </p>
            <h2
              id="confirm-dialog-title"
              className="mt-1 text-lg font-semibold text-[var(--color-text)]"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <form action={action} className="space-y-4 p-5">
          {hiddenFields.map((field) => (
            <input key={field.name} type="hidden" name={field.name} value={field.value} />
          ))}
          <ConfirmActions
            confirmLabel={confirmLabel}
            pendingLabel={pendingLabel ?? "Working…"}
            onCancel={onCancel}
            tone={tone}
          />
        </form>
      </div>
    </div>,
    document.body,
  );
}

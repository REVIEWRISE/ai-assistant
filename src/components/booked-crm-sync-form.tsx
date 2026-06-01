"use client";

import { useFormStatus } from "react-dom";

type BookedCrmSyncFormProps = {
  appointmentId: string;
  crmSyncStatus: string;
  crmSyncError: string | null;
  crmSyncAttempts: number;
  action: (formData: FormData) => void | Promise<void>;
};

function RetryButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Retrying…" : "Retry CRM sync"}
    </button>
  );
}

export function BookedCrmSyncForm({
  appointmentId,
  crmSyncStatus,
  crmSyncError,
  crmSyncAttempts,
  action,
}: BookedCrmSyncFormProps) {
  if (crmSyncStatus === "synced") {
    return (
      <p className="mt-2 text-xs font-medium text-[color-mix(in_srgb,var(--color-success)_85%,var(--color-text))]">
        CRM webhook delivered
        {crmSyncAttempts > 1 ? ` (after ${crmSyncAttempts} attempts)` : ""}.
      </p>
    );
  }

  if (crmSyncStatus === "skipped_no_integration") {
    return (
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
        No CRM webhook configured for this organization. Add one under Configure chatbot → CRM sync.
      </p>
    );
  }

  if (crmSyncStatus === "not_applicable") {
    return null;
  }

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <div className="flex flex-wrap items-center gap-2">
        <RetryButton />
        <span className="text-[11px] text-[var(--color-text-muted)]">
          Re-sends the booking payload to your CRM webhook.
        </span>
      </div>
      {crmSyncError ? (
        <p className="text-xs text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))]" title={crmSyncError}>
          Last error: {crmSyncError.length > 160 ? `${crmSyncError.slice(0, 160)}…` : crmSyncError}
        </p>
      ) : crmSyncStatus === "failed" ? (
        <p className="text-xs text-[var(--color-text-muted)]">Delivery failed after automatic retries.</p>
      ) : null}
    </form>
  );
}

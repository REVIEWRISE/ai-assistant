"use client";

import { useFormStatus } from "react-dom";

type KnowledgeImportSourcesProps = {
  organizationId: string;
  organizationName: string;
  onImportFromWebsite: (formData: FormData) => void | Promise<void>;
};

function SubmitButton({ idleLabel, pendingLabel }: { idleLabel: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 w-full rounded-xl vr-btn-primary px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function ImportWebsiteProgress() {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div className="mt-3" role="status" aria-live="polite" aria-label="Import in progress">
      <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">
        Scraping pages and building your draft… This can take a minute for larger sites.
      </p>
      <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-raised)]">
        <div className="kb-import-progress-thumb absolute left-0 top-0 h-full" />
      </div>
    </div>
  );
}

function WebsiteImportFields({ organizationId }: { organizationId: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <input type="hidden" name="organization_id" value={organizationId} />
      <p className="text-xs text-[var(--color-text-muted)]">
        Scrape public website content to generate a draft knowledge base.
      </p>
      <input
        type="url"
        name="website_url"
        placeholder="https://yourbusiness.com"
        disabled={pending}
        className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface)] disabled:text-[var(--color-text-muted)]"
      />
      <ImportWebsiteProgress />
      <SubmitButton idleLabel="Import Website" pendingLabel="Importing website…" />
    </>
  );
}

export function KnowledgeImportSources({
  organizationId,
  organizationName,
  onImportFromWebsite,
}: KnowledgeImportSourcesProps) {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <p className="text-sm font-semibold text-[var(--color-text)]">Website URL</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Target organization:{" "}
          <span className="font-semibold text-[var(--color-text)]">{organizationName}</span>
        </p>

        <form action={onImportFromWebsite} className="mt-3">
          <WebsiteImportFields organizationId={organizationId} />
        </form>
      </div>
    </div>
  );
}

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
      className="shrink-0 rounded-xl vr-btn-primary px-4 py-2.5 text-sm font-semibold shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-primary)_85%,transparent)] disabled:cursor-not-allowed disabled:opacity-70"
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
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          name="website_url"
          placeholder="https://yourbusiness.com"
          disabled={pending}
          className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--color-raised)] disabled:text-[var(--color-text-muted)]"
        />
        <SubmitButton idleLabel="Import website" pendingLabel="Importing…" />
      </div>
      <ImportWebsiteProgress />
    </>
  );
}

export function KnowledgeImportSources({
  organizationId,
  organizationName,
  onImportFromWebsite,
}: KnowledgeImportSourcesProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-[var(--shadow-sm)]">
        <form action={onImportFromWebsite}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Website URL · {organizationName}
          </p>
          <WebsiteImportFields organizationId={organizationId} />
        </form>
    </div>
  );
}

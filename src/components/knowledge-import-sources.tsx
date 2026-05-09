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
      className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
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
      <p className="mb-2 text-xs font-medium text-slate-600">
        Scraping pages and building your draft… This can take a minute for larger sites.
      </p>
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-200">
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
      <p className="text-xs text-slate-500">
        Scrape public website content to generate a draft knowledge base.
      </p>
      <input
        type="url"
        name="website_url"
        placeholder="https://yourbusiness.com"
        disabled={pending}
        className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 transition focus:ring disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
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
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Website URL</p>
        <p className="mt-1 text-xs text-slate-500">
          Target organization:{" "}
          <span className="font-semibold text-slate-700">{organizationName}</span>
        </p>

        <form action={onImportFromWebsite} className="mt-3">
          <WebsiteImportFields organizationId={organizationId} />
        </form>
      </div>
    </div>
  );
}

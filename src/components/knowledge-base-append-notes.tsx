"use client";

import { useFormStatus } from "react-dom";

type KnowledgeBaseAppendNotesProps = {
  organizationId: string;
  onAppendNotes: (formData: FormData) => void | Promise<void>;
};

function AppendSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Merging…" : "Add to knowledge base"}
    </button>
  );
}

export function KnowledgeBaseAppendNotes({ organizationId, onAppendNotes }: KnowledgeBaseAppendNotesProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">Manual context</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">Add on top of imported content</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Notes are appended after your existing scrape or file. The combined text is capped at 20,000 characters. After
        adding material, the draft returns to pending approval if it was previously approved.
      </p>
      <form action={onAppendNotes} className="mt-3">
        <input type="hidden" name="organization_id" value={organizationId} />
        <textarea
          name="additional_notes"
          rows={5}
          placeholder="Extra policies, seasonal hours, services not on the site, internal booking rules…"
          className="w-full min-h-[120px] resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
        />
        <AppendSubmitButton />
      </form>
    </div>
  );
}

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
      className="mt-3 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Merging…" : "Add to knowledge base"}
    </button>
  );
}

export function KnowledgeBaseAppendNotes({ organizationId, onAppendNotes }: KnowledgeBaseAppendNotesProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Add on top of imported content</p>
      <p className="mt-1 text-xs text-slate-600">
        Notes are appended after your existing scrape or file. The combined text is capped at 20,000 characters. After
        adding material, the draft returns to pending approval if it was previously approved.
      </p>
      <form action={onAppendNotes} className="mt-3">
        <input type="hidden" name="organization_id" value={organizationId} />
        <textarea
          name="additional_notes"
          rows={5}
          placeholder="Extra policies, seasonal hours, services not on the site, internal booking rules…"
          className="w-full min-h-[120px] resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 transition focus:ring"
        />
        <AppendSubmitButton />
      </form>
    </div>
  );
}

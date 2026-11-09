"use client";

import { useTransition } from "react";
import { setVoiceFollowUpDone } from "@/app/(protected)/dashboard/actions";
import { toast } from "@/lib/toast";

export function DashboardVoiceFollowUpDone({ callRecordId }: { callRecordId: string }) {
  const [pending, startTransition] = useTransition();

  function save(done: boolean) {
    startTransition(async () => {
      const result = await setVoiceFollowUpDone(callRecordId, done);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (done) {
        toast.success("Follow-up marked as done", {
          id: `voice-follow-up-${callRecordId}`,
          duration: 8000,
          action: { label: "Undo", onClick: () => undo() },
        });
      }
    });
  }

  function undo() {
    // This row has left the list by now, so the undo can't rely on its transition.
    void setVoiceFollowUpDone(callRecordId, false).then((result) => {
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={() => save(true)}
      disabled={pending}
      className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-h)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : "Mark as done"}
    </button>
  );
}

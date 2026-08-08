"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveRefundRequest,
  rejectRefundRequest,
} from "@/app/(protected)/billing-admin/refunds/actions";
import { labelForRefundReason } from "@/lib/refund-reasons";
import { toast } from "@/lib/toast";

export type AdminRefundRequestRow = {
  id: string;
  status: string;
  reason: string;
  notes: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  organization: { id: string; name: string };
  requestedBy: { id: string; fullName: string; email: string };
  reviewedBy: { id: string; fullName: string } | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: string): string {
  if (status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-900 [[data-theme=dark]_&]:border-amber-500/30 [[data-theme=dark]_&]:bg-amber-500/15 [[data-theme=dark]_&]:text-amber-200";
  }
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 [[data-theme=dark]_&]:border-emerald-500/30 [[data-theme=dark]_&]:bg-emerald-500/15 [[data-theme=dark]_&]:text-emerald-200";
  }
  return "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]";
}

export function BillingRefundsManager({ requests }: { requests: AdminRefundRequestRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const selected = useMemo(
    () => requests.find((row) => row.id === selectedId) ?? null,
    [requests, selectedId],
  );

  const visible = useMemo(() => {
    if (filter === "pending") return requests.filter((row) => row.status === "pending");
    return requests;
  }, [filter, requests]);

  function closeSheet() {
    setSelectedId(null);
    setAdminNote("");
  }

  function onApprove() {
    if (!selected) return;
    startTransition(async () => {
      const result = await approveRefundRequest({
        refundRequestId: selected.id,
        adminNote,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Refund approved and submitted to Billing.");
      closeSheet();
      router.refresh();
    });
  }

  function onReject() {
    if (!selected) return;
    startTransition(async () => {
      const result = await rejectRefundRequest({
        refundRequestId: selected.id,
        adminNote,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Refund request rejected.");
      closeSheet();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          {(
            [
              { id: "pending" as const, label: "Pending" },
              { id: "all" as const, label: "All" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === tab.id
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          {visible.length} request{visible.length === 1 ? "" : "s"}
        </p>
      </div>

      <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        {visible.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
            {filter === "pending" ? "No refund requests waiting for review." : "No refund requests yet."}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {visible.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(row.id);
                    setAdminNote(row.adminNote ?? "");
                  }}
                  className="flex w-full flex-col gap-2 px-5 py-4 text-left transition hover:bg-[var(--color-bg)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {row.organization.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                      {row.requestedBy.fullName} · {labelForRefundReason(row.reason)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusBadge(row.status)}`}>
                      {row.status}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">{formatDate(row.createdAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-[120] flex justify-end bg-[var(--color-overlay)]">
          <button type="button" className="absolute inset-0" aria-label="Close" onClick={closeSheet} />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
            <header className="border-b border-[var(--color-border)] px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Refund review
              </p>
              <h2 className="mt-1.5 text-lg font-semibold text-[var(--color-text)]">
                {selected.organization.name}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Requested by {selected.requestedBy.fullName} ({selected.requestedBy.email})
              </p>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Reason
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                  {labelForRefundReason(selected.reason)}
                </p>
              </div>
              {selected.notes ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    Customer notes
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-text)]">{selected.notes}</p>
                </div>
              ) : null}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Submitted
                </p>
                <p className="mt-1 text-sm text-[var(--color-text)]">{formatDate(selected.createdAt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Status
                </p>
                <p className="mt-1 text-sm capitalize text-[var(--color-text)]">{selected.status}</p>
              </div>

              {selected.status === "pending" ? (
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-[var(--color-text)]">Admin note (optional)</span>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    disabled={pending}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                    placeholder="Internal note for the decision"
                  />
                </label>
              ) : (
                <>
                  {selected.adminNote ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        Admin note
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text)]">{selected.adminNote}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      Reviewed
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text)]">
                      {selected.reviewedBy?.fullName ?? "Admin"} · {formatDate(selected.reviewedAt)}
                    </p>
                  </div>
                </>
              )}
            </div>

            <footer className="border-t border-[var(--color-border)] px-5 py-4">
              {selected.status === "pending" ? (
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onReject}
                    className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50"
                  >
                    {pending ? "Working…" : "Reject"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onApprove}
                    className="flex-1 rounded-xl bg-[var(--color-primary)] px-3 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
                  >
                    {pending ? "Working…" : "Approve refund"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={closeSheet}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text)]"
                >
                  Close
                </button>
              )}
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}

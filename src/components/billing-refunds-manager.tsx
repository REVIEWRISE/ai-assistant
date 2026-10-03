"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { fetchOrganizationCredits } from "@/app/(protected)/billing-admin/refunds/actions";
import { DataTablePagination } from "@/components/data-table";
import {
  cleanRefundReason,
  extractRefundTypeFromReason,
  formatCents,
  labelForRefundReason,
  labelForRefundType,
  type BillingOrganizationCreditsResult,
} from "@/lib/refund-reasons";

export type AdminRefundRequestRow = {
  id: string;
  status: string;
  reason: string;
  notes: string;
  amountCents: number | null;
  currency: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  organization: { id: string; name: string };
  requestedBy: { id: string; fullName: string; email: string };
  reviewedBy: { id: string; fullName: string } | null;
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

function normalizeStatus(status: string): Exclude<StatusFilter, "all"> {
  const value = status.toLowerCase();
  if (value === "approved" || value === "rejected") return value;
  return "pending";
}

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

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initialsFor(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function statusTone(status: string): {
  label: string;
  className: string;
  dot: string;
} {
  switch (normalizeStatus(status)) {
    case "approved":
      return {
        label: "Approved",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-800 [[data-theme=dark]_&]:border-emerald-500/30 [[data-theme=dark]_&]:bg-emerald-500/15 [[data-theme=dark]_&]:text-emerald-200",
        dot: "bg-emerald-600 [[data-theme=dark]_&]:bg-emerald-400",
      };
    case "rejected":
      return {
        label: "Rejected",
        className:
          "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]",
        dot: "bg-[var(--color-text-muted)]",
      };
    default:
      return {
        label: "Pending Review",
        className:
          "border-amber-200 bg-amber-50 text-amber-900 [[data-theme=dark]_&]:border-amber-500/30 [[data-theme=dark]_&]:bg-amber-500/15 [[data-theme=dark]_&]:text-amber-200",
        dot: "bg-amber-600 [[data-theme=dark]_&]:bg-amber-400",
      };
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-3 last:border-0">
      <p className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</p>
      <p className="max-w-[65%] text-right text-sm font-medium text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function RefundReviewSheet({
  request,
  onClose,
}: {
  request: AdminRefundRequestRow;
  onClose: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const [orgCredits, setOrgCredits] = useState<BillingOrganizationCreditsResult | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(true);

  const tone = statusTone(request.status);
  const orgInitials = initialsFor(request.organization.name);
  const refundType = extractRefundTypeFromReason(request.reason, request.amountCents);
  const cleanReason = cleanRefundReason(request.reason);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    fetchOrganizationCredits(request.organization.id)
      .then((credits) => {
        if (active) {
          setOrgCredits(credits);
          setLoadingCredits(false);
        }
      })
      .catch(() => {
        if (active) {
          setOrgCredits(null);
          setLoadingCredits(false);
        }
      });
    return () => {
      active = false;
    };
  }, [request.organization.id]);

  return (
    <div
      className={`fixed inset-0 z-[120] flex justify-end transition-colors duration-200 ${
        entered ? "bg-[var(--color-overlay)]" : "bg-transparent"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-review-title"
        className={`relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] transition-transform duration-300 ease-out sm:max-w-lg ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="relative shrink-0 overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#0c0c0c_0%,#161616_55%,#222222_100%)] px-5 pb-5 pt-5 text-white">
          <div
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 left-10 size-40 rounded-full bg-white/5 blur-3xl"
            aria-hidden
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-semibold tracking-wide text-white backdrop-blur-sm">
                {orgInitials}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Refund Request Details
                </p>
                <h3
                  id="refund-review-title"
                  className="mt-1 truncate text-xl font-semibold tracking-tight text-white"
                >
                  {request.organization.name}
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.className}`}
                  >
                    <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
                    {tone.label}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    {labelForRefundType(refundType)}
                  </span>
                  {request.amountCents != null && request.amountCents > 0 ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                      {formatCents(request.amountCents, request.currency)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-lg leading-none text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* Billing Service Notice */}
          <section className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-start gap-3">
              <span className="text-base" aria-hidden>
                ℹ️
              </span>
              <div>
                <p className="text-xs font-semibold text-sky-950 [[data-theme=dark]_&]:text-sky-200">
                  Billing Service Managed
                </p>
                <p className="mt-1 text-xs leading-relaxed text-sky-900/90 [[data-theme=dark]_&]:text-sky-300">
                  Financial refunds, card payouts, and subscription adjustments are processed directly in the external <strong>Billing Service</strong>. This dashboard provides visibility into customer-submitted requests.
                </p>
              </div>
            </div>
          </section>

          {/* Organization Store Credits Balance Card */}
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Store Credit Balance
                </p>
                <p className="mt-1 text-lg font-bold text-[var(--color-text)]">
                  {loadingCredits
                    ? "Checking…"
                    : formatCents(orgCredits?.totalBalanceCents ?? 0)}
                </p>
              </div>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">
                {orgCredits?.credits?.length ?? 0} active credits
              </span>
            </div>
          </section>

          {/* Request Details */}
          <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Request Details
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[var(--color-border)]">
              <div className="bg-[var(--color-surface)] px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Type & Reason
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">
                  {labelForRefundReason(cleanReason)}
                </p>
              </div>
              <div className="bg-[var(--color-surface)] px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Amount
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">
                  {request.amountCents != null && request.amountCents > 0
                    ? formatCents(request.amountCents, request.currency)
                    : "Full Payment"}
                </p>
              </div>
              <div className="col-span-2 bg-[var(--color-surface)] px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Requested by
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">
                  {request.requestedBy.fullName}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                  {request.requestedBy.email} · {formatShortDate(request.createdAt)}
                </p>
              </div>
            </div>
          </section>

          {/* Customer Message */}
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Customer Message
            </p>
            {request.notes.trim() ? (
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">{request.notes}</p>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">No customer notes provided.</p>
            )}
          </section>

          {/* Status & Review Audit (if reviewed) */}
          {request.reviewedAt || request.adminNote ? (
            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Status History
              </p>
              <div className="mt-1">
                <DetailRow
                  label="Reviewed by"
                  value={request.reviewedBy?.fullName ?? "Admin"}
                />
                <DetailRow label="Reviewed at" value={formatDate(request.reviewedAt)} />
                <DetailRow
                  label="Admin note"
                  value={request.adminNote?.trim() || "—"}
                />
              </div>
            </section>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
          >
            Close
          </button>
        </footer>
      </aside>
    </div>
  );
}

export function BillingRefundsManager({ requests }: { requests: AdminRefundRequestRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const next = {
      all: requests.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const row of requests) {
      next[normalizeStatus(row.status)] += 1;
    }
    return next;
  }, [requests]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((row) => {
      const status = normalizeStatus(row.status);
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      return (
        row.organization.name.toLowerCase().includes(q) ||
        row.requestedBy.fullName.toLowerCase().includes(q) ||
        row.requestedBy.email.toLowerCase().includes(q) ||
        labelForRefundReason(row.reason).toLowerCase().includes(q) ||
        row.notes.toLowerCase().includes(q)
      );
    });
  }, [requests, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const safePage = Math.min(currentPage, totalPages);

  const rows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, safePage, perPage]);

  const selected = requests.find((row) => row.id === selectedId) ?? null;

  return (
    <div>
      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--color-border)] px-4 py-4 lg:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Queue
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Refund requests</h2>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
              {filteredRows.length}
              {filteredRows.length !== requests.length ? ` of ${requests.length}` : ""} shown
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
            View customer refund requests and tracking details. Payouts and refunds are handled directly in the Billing service.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">
          <div
            className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
            role="tablist"
            aria-label="Filter by refund status"
          >
            {FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setFilter(item.id);
                    setCurrentPage(1);
                  }}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[var(--color-bg)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 text-[10px] tabular-nums opacity-70">{counts[item.id]}</span>
                </button>
              );
            })}
          </div>

          <label className="relative block min-w-0 sm:w-72">
            <span className="sr-only">Search refund requests</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search workspace, requester…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-3 pr-3 text-sm text-[var(--color-text)] outline-none ring-[var(--color-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2"
            />
          </label>
        </div>

        <div className="overflow-x-auto bg-[var(--color-bg)]">
          <table className="w-full min-w-[50rem] border-collapse text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-raised)] text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Workspace</th>
                <th className="px-4 py-3 font-semibold">Requester</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Amount / Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    {requests.length === 0
                      ? "No refund requests yet."
                      : filter === "pending"
                        ? "No refund requests waiting for review."
                        : "No refund requests match this filter."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const tone = statusTone(row.status);
                  const refundType = extractRefundTypeFromReason(row.reason, row.amountCents);
                  const cleanReason = cleanRefundReason(row.reason);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className="cursor-pointer border-b border-[var(--color-border)] align-middle transition hover:bg-[var(--color-surface)] last:border-0"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-semibold text-[var(--color-text-muted)]">
                            {initialsFor(row.organization.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[var(--color-text)]">
                              {row.organization.name}
                            </p>
                            {row.notes.trim() ? (
                              <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                                {row.notes}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                No customer notes
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[var(--color-text)]">
                          {row.requestedBy.fullName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                          {row.requestedBy.email}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[var(--color-text)]">
                          {labelForRefundReason(cleanReason)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-[var(--color-text)]">
                            {row.amountCents != null && row.amountCents > 0
                              ? formatCents(row.amountCents, row.currency)
                              : refundType === "full"
                                ? "Full Refund"
                                : labelForRefundType(refundType)}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {labelForRefundType(refundType)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.className}`}
                        >
                          <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
                          {tone.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[var(--color-text)]">
                          {formatShortDate(row.createdAt)}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                          {new Date(row.createdAt).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(row.id);
                          }}
                          aria-label={`View refund details for ${row.organization.name}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] hover:shadow-sm"
                        >
                          <span>View details</span>
                          <span className="text-[10px]">➔</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          totalItems={filteredRows.length}
          currentPage={safePage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={setCurrentPage}
          onPerPageChange={(size) => {
            setPerPage(size);
            setCurrentPage(1);
          }}
          itemLabel="requests"
        />
      </section>

      {selected
        ? createPortal(
            <RefundReviewSheet
              key={selected.id}
              request={selected}
              onClose={() => setSelectedId(null)}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

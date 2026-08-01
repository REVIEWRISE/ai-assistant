"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { DataTablePagination } from "@/components/data-table";
import { PLAN_SLUGS, getPlanBySlug, type PlanSlug } from "@/lib/pricing-plans";

export type BillingOrganizationRow = {
  id: string;
  name: string;
  planSlug: string | null;
  billingStatus: string | null;
  billingInterval: string | null;
  trialEndsAt: string | null;
  paidAt: string | null;
  currentPeriodEndsAt: string | null;
  createdAt: string;
  memberCount: number;
};

type StatusFilter = "all" | "needs_plan" | "trialing" | "active" | "expired";

type BillingOrganizationsManagerProps = {
  organizations: BillingOrganizationRow[];
};

function normalizeStatus(status: string | null): StatusFilter {
  const value = (status || "needs_plan").toLowerCase();
  if (value === "trialing" || value === "active" || value === "expired") return value;
  return "needs_plan";
}

function planLabel(slug: string | null): string {
  if (!slug) return "No plan";
  if ((PLAN_SLUGS as readonly string[]).includes(slug)) {
    return getPlanBySlug(slug as PlanSlug).name;
  }
  return slug.replace(/_/g, " ");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusTone(status: StatusFilter): {
  label: string;
  className: string;
  dot: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-800 [[data-theme=dark]_&]:border-emerald-500/30 [[data-theme=dark]_&]:bg-emerald-500/15 [[data-theme=dark]_&]:text-emerald-200",
        dot: "bg-emerald-600 [[data-theme=dark]_&]:bg-emerald-400",
      };
    case "trialing":
      return {
        label: "Trialing",
        className:
          "border-sky-200 bg-sky-50 text-sky-800 [[data-theme=dark]_&]:border-sky-500/30 [[data-theme=dark]_&]:bg-sky-500/15 [[data-theme=dark]_&]:text-sky-200",
        dot: "bg-neutral-600 [[data-theme=dark]_&]:bg-neutral-300",
      };
    case "expired":
      return {
        label: "Expired",
        className:
          "border-red-200 bg-red-50 text-red-800 [[data-theme=dark]_&]:border-red-500/30 [[data-theme=dark]_&]:bg-red-500/15 [[data-theme=dark]_&]:text-red-200",
        dot: "bg-red-600 [[data-theme=dark]_&]:bg-red-400",
      };
    default:
      return {
        label: "Needs plan",
        className:
          "border-amber-200 bg-amber-50 text-amber-900 [[data-theme=dark]_&]:border-amber-500/30 [[data-theme=dark]_&]:bg-amber-500/15 [[data-theme=dark]_&]:text-amber-200",
        dot: "bg-amber-600 [[data-theme=dark]_&]:bg-amber-400",
      };
  }
}

function timelineCopy(org: BillingOrganizationRow): { primary: string; secondary: string } {
  const status = normalizeStatus(org.billingStatus);
  if (org.paidAt) {
    return {
      primary: `Paid ${formatDate(org.paidAt)}`,
      secondary: org.currentPeriodEndsAt
        ? `Period ends ${formatDate(org.currentPeriodEndsAt)}`
        : `Created ${formatDate(org.createdAt)}`,
    };
  }
  if (status === "trialing" && org.trialEndsAt) {
    return {
      primary: `Trial ends ${formatDate(org.trialEndsAt)}`,
      secondary: `Created ${formatDate(org.createdAt)}`,
    };
  }
  if (status === "expired" && org.trialEndsAt) {
    return {
      primary: `Trial ended ${formatDate(org.trialEndsAt)}`,
      secondary: "Not paid",
    };
  }
  return {
    primary: "Not paid",
    secondary: `Created ${formatDate(org.createdAt)}`,
  };
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "needs_plan", label: "Needs plan" },
  { id: "trialing", label: "Trialing" },
  { id: "active", label: "Active" },
  { id: "expired", label: "Expired" },
];

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-3 last:border-0">
      <p className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</p>
      <p className="max-w-[60%] text-right text-sm font-medium text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function OrganizationBillingSheet({
  organization,
  onClose,
}: {
  organization: BillingOrganizationRow;
  onClose: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const status = normalizeStatus(organization.billingStatus);
  const tone = statusTone(status);
  const timeline = timelineCopy(organization);
  const initials = organization.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const intervalLabel = organization.billingInterval
    ? organization.billingInterval.charAt(0).toUpperCase() + organization.billingInterval.slice(1)
    : "—";

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

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-200 ${
        entered
          ? "bg-[var(--color-overlay)]"
          : "bg-transparent"
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
        aria-labelledby="org-billing-title"
        className={`relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] transition-transform duration-300 ease-out sm:max-w-lg ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="relative shrink-0 overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#0c0c0c_0%,#161616_55%,#222222_100%)] px-5 pb-5 pt-5 text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 left-10 size-40 rounded-full bg-white/5 blur-3xl" aria-hidden />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-semibold tracking-wide text-white backdrop-blur-sm">
                {initials || "WS"}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Workspace billing
                </p>
                <h3
                  id="org-billing-title"
                  className="mt-1 truncate text-xl font-semibold tracking-tight text-white"
                >
                  {organization.name}
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.className}`}
                  >
                    <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
                    {tone.label}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    {planLabel(organization.planSlug)}
                  </span>
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
          <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Subscription
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[var(--color-border)]">
              <div className="bg-[var(--color-surface)] px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Plan
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">
                  {planLabel(organization.planSlug)}
                </p>
              </div>
              <div className="bg-[var(--color-surface)] px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Interval
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">{intervalLabel}</p>
              </div>
              <div className="bg-[var(--color-surface)] px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Status
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">{tone.label}</p>
              </div>
              <div className="bg-[var(--color-surface)] px-4 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Members
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">
                  {organization.memberCount}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Timeline
            </p>
            <p
              className={`mt-3 text-base font-semibold ${
                organization.paidAt
                  ? "text-emerald-800 [[data-theme=dark]_&]:text-emerald-300"
                  : "text-[var(--color-text)]"
              }`}
            >
              {timeline.primary}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{timeline.secondary}</p>

            <div className="mt-4 space-y-0 border-t border-[var(--color-border)]">
              <DetailRow label="Trial ends" value={formatDate(organization.trialEndsAt)} />
              <DetailRow label="Paid at" value={formatDate(organization.paidAt)} />
              <DetailRow
                label="Period ends"
                value={formatDate(organization.currentPeriodEndsAt)}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Workspace
            </p>
            <div className="mt-1">
              <DetailRow label="Created" value={formatDate(organization.createdAt)} />
              <DetailRow
                label="Members"
                value={`${organization.memberCount} member${organization.memberCount === 1 ? "" : "s"}`}
              />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

export function BillingOrganizationsManager({
  organizations,
}: BillingOrganizationsManagerProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [viewOrgId, setViewOrgId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const next = {
      all: organizations.length,
      needs_plan: 0,
      trialing: 0,
      active: 0,
      expired: 0,
    };
    for (const org of organizations) {
      next[normalizeStatus(org.billingStatus)] += 1;
    }
    return next;
  }, [organizations]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return organizations.filter((org) => {
      const status = normalizeStatus(org.billingStatus);
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      return (
        org.name.toLowerCase().includes(q) ||
        (org.planSlug ?? "").toLowerCase().includes(q)
      );
    });
  }, [organizations, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const safePage = Math.min(currentPage, totalPages);

  const rows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, safePage, perPage]);

  const viewOrg = organizations.find((org) => org.id === viewOrgId) ?? null;

  return (
    <div>
      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--color-border)] px-4 py-4 lg:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Directory
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Workspace subscriptions</h2>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
              {filteredRows.length}
              {filteredRows.length !== organizations.length ? ` of ${organizations.length}` : ""} shown
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
            Filter by billing status and open a workspace to review plan, trial, and payment timeline. Plan changes
            come from customer checkout.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">
          <div
            className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
            role="tablist"
            aria-label="Filter by billing status"
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
            <span className="sr-only">Search workspaces</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search workspaces…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-3 pr-3 text-sm text-[var(--color-text)] outline-none ring-[var(--color-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2"
            />
          </label>
        </div>

        <div className="overflow-x-auto bg-[var(--color-bg)]">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-raised)] text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Workspace</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Billing timeline</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    No workspaces match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((org) => {
                  const status = normalizeStatus(org.billingStatus);
                  const tone = statusTone(status);
                  const timeline = timelineCopy(org);

                  return (
                    <tr
                      key={org.id}
                      className="border-b border-[var(--color-border)] align-middle last:border-0"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[var(--color-text)]">{org.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                          {org.memberCount} member{org.memberCount === 1 ? "" : "s"} ·{" "}
                          {formatDate(org.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[var(--color-text)]">{planLabel(org.planSlug)}</p>
                        <p className="mt-0.5 text-xs capitalize text-[var(--color-text-muted)]">
                          {org.billingInterval ?? "—"}
                        </p>
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
                        <p
                          className={`text-sm font-medium ${
                            org.paidAt
                              ? "text-emerald-800 [[data-theme=dark]_&]:text-emerald-300"
                              : "text-[var(--color-text)]"
                          }`}
                        >
                          {timeline.primary}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{timeline.secondary}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setViewOrgId(org.id)}
                          aria-label={`View billing for ${org.name}`}
                          title="View billing"
                          className="inline-flex size-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                        >
                          <EyeIcon className="size-4" />
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
          itemLabel="workspaces"
        />
      </section>

      {viewOrg
        ? createPortal(
            <OrganizationBillingSheet
              organization={viewOrg}
              onClose={() => setViewOrgId(null)}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

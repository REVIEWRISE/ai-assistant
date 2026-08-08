"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CustomSelect } from "@/components/custom-select";
import {
  DataTable,
  DataTableBody,
  DataTableEmptyState,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/data-table";
import { formatAuditAction } from "@/lib/audit-action-labels";

const PLATFORM_AUDIT_ORG_ID = "00000000-0000-0000-0000-000000000000";

export type AuditEventRow = {
  id: string;
  action: string;
  organizationId: string;
  organizationName: string | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  metadata: unknown;
  createdAt: string | Date;
};

type OrganizationOption = {
  id: string;
  name: string;
};

type AuditEventsManagerProps = {
  events: AuditEventRow[];
  organizations: OrganizationOption[];
  totalInDatabase: number;
};

function formatWhen(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function organizationLabel(organizationId: string, name: string | null) {
  if (organizationId === PLATFORM_AUDIT_ORG_ID) return "Platform";
  return name?.trim() || "Unknown workspace";
}

function actionTone(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("fail") || normalized.includes("delete") || normalized.includes("revoke")) {
    return "bg-[var(--color-danger-soft)] text-[var(--color-danger)]";
  }
  if (normalized.includes("success") || normalized.includes("create") || normalized.includes("connect")) {
    return "vr-app-status-success";
  }
  return "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]";
}

function actionSeverity(action: string): {
  label: string;
  className: string;
  dot: string;
  iconBg: string;
} {
  const normalized = action.toLowerCase();
  if (normalized.includes("fail") || normalized.includes("delete") || normalized.includes("revoke")) {
    return {
      label: "Attention",
      className: "border-red-400/40 bg-red-500/15 text-red-100",
      dot: "bg-red-300",
      iconBg: "border-red-400/30 bg-red-500/20 text-red-100",
    };
  }
  if (
    normalized.includes("success") ||
    normalized.includes("create") ||
    normalized.includes("connect") ||
    normalized.includes("register")
  ) {
    return {
      label: "Success",
      className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
      dot: "bg-emerald-300",
      iconBg: "border-emerald-400/30 bg-emerald-500/20 text-emerald-100",
    };
  }
  return {
    label: "Info",
    className: "border-white/15 bg-white/10 text-slate-200",
    dot: "bg-slate-300",
    iconBg: "border-white/15 bg-white/10 text-white",
  };
}

function actorInitials(name: string | null, email: string | null) {
  const source = (name || email || "SY").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function metadataPreview(metadata: unknown) {
  if (metadata == null) return "—";
  if (typeof metadata === "object" && !Array.isArray(metadata) && Object.keys(metadata as object).length === 0) {
    return "No details";
  }
  try {
    const text = JSON.stringify(metadata);
    return text.length > 64 ? `${text.slice(0, 64)}…` : text;
  } catch {
    return "—";
  }
}

function metadataEntries(metadata: unknown): Array<{ key: string; value: string }> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const entries = Object.entries(metadata as Record<string, unknown>);
  if (entries.length === 0) return [];
  return entries.map(([key, value]) => ({
    key,
    value:
      value == null
        ? "—"
        : typeof value === "string" || typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value),
  }));
}

function prettyMetadata(metadata: unknown) {
  try {
    return JSON.stringify(metadata ?? {}, null, 2);
  } catch {
    return String(metadata);
  }
}

function AuditEventSheet({
  event,
  onClose,
}: {
  event: AuditEventRow;
  onClose: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const severity = actionSeverity(event.action);
  const actorLabel = event.actorName || event.actorEmail || "System";
  const workspace = organizationLabel(event.organizationId, event.organizationName);
  const details = metadataEntries(event.metadata);
  const hasDetails = details !== null && details.length > 0;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    setShowRawJson(false);
  }, [event.id]);

  useEffect(() => {
    function onKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-200 ${
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
        aria-labelledby="audit-event-title"
        className={`relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] transition-transform duration-300 ease-out sm:max-w-lg ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="relative shrink-0 overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#0c0c0c_0%,#161616_55%,#222222_100%)] px-5 pb-5 pt-5 text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 left-10 size-40 rounded-full bg-white/5 blur-3xl" aria-hidden />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-sm ${severity.iconBg}`}
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Audit event
                </p>
                <h3
                  id="audit-event-title"
                  className="mt-1 text-xl font-semibold tracking-tight text-white"
                >
                  {formatAuditAction(event.action)}
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severity.className}`}
                  >
                    <span className={`size-1.5 rounded-full ${severity.dot}`} aria-hidden />
                    {severity.label}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    {formatWhen(event.createdAt)}
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
                Who & where
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-semibold text-[var(--color-primary-h)]">
                  {actorInitials(event.actorName, event.actorEmail)}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Actor
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{actorLabel}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                    {event.actorEmail || (event.actorId ? "User account" : "Automated / system")}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-[var(--color-border)]">
                <div className="bg-[var(--color-surface)] px-4 py-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Workspace
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">{workspace}</p>
                </div>
                <div className="bg-[var(--color-surface)] px-4 py-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    When
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--color-text)]">
                    {formatWhen(event.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Event details
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {hasDetails
                    ? `${details.length} field${details.length === 1 ? "" : "s"} recorded`
                    : "No extra details were stored"}
                </p>
              </div>
              {hasDetails || (details !== null && details.length === 0) ? (
                <button
                  type="button"
                  onClick={() => setShowRawJson((current) => !current)}
                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                >
                  {showRawJson ? "Formatted" : "Raw JSON"}
                </button>
              ) : null}
            </div>

            {showRawJson || details === null ? (
              <pre className="max-h-[22rem] overflow-auto bg-[var(--color-bg)] p-4 font-mono text-[11px] leading-relaxed text-[var(--color-text)]">
                {prettyMetadata(event.metadata)}
              </pre>
            ) : hasDetails ? (
              <dl className="divide-y divide-[var(--color-border)]">
                {details.map((entry) => (
                  <div key={entry.key} className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                      {entry.key.replace(/[_-]+/g, " ")}
                    </dt>
                    <dd className="break-words text-sm font-medium text-[var(--color-text)]">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-semibold text-[var(--color-text)]">Nothing else to show</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  This event only recorded the action itself.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Technical reference
            </p>
            <p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-[var(--color-text)]">
              {event.action}
            </p>
            <p className="mt-1.5 break-all font-mono text-[10px] text-[var(--color-text-muted)]">
              id · {event.id}
            </p>
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export function AuditEventsManager({
  events,
  organizations,
  totalInDatabase,
}: AuditEventsManagerProps) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<AuditEventRow | null>(null);

  const actionOptions = useMemo(() => {
    const unique = [...new Set(events.map((event) => event.action))].sort((a, b) =>
      formatAuditAction(a).localeCompare(formatAuditAction(b)),
    );
    return [
      { value: "all", label: "All actions" },
      ...unique.map((action) => ({ value: action, label: formatAuditAction(action) })),
    ];
  }, [events]);

  const organizationOptions = useMemo(() => {
    const fromEvents = new Map<string, string>();
    for (const event of events) {
      fromEvents.set(event.organizationId, organizationLabel(event.organizationId, event.organizationName));
    }
    for (const org of organizations) {
      if (!fromEvents.has(org.id)) fromEvents.set(org.id, org.name);
    }
    return [
      { value: "all", label: "All workspaces" },
      ...[...fromEvents.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => ({ value: id, label: name })),
    ];
  }, [events, organizations]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      if (actionFilter !== "all" && event.action !== actionFilter) return false;
      if (organizationFilter !== "all" && event.organizationId !== organizationFilter) {
        return false;
      }
      if (!needle) return true;
      const haystack = [
        event.action,
        formatAuditAction(event.action),
        organizationLabel(event.organizationId, event.organizationName),
        event.actorName,
        event.actorEmail,
        metadataPreview(event.metadata),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [events, query, actionFilter, organizationFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, currentPage, perPage]);

  useEffect(() => {
    setPage(1);
  }, [query, actionFilter, organizationFilter, perPage]);

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 lg:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
            Security trail
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-text)]">
            Audit events
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-text-muted)]">
            Showing the {events.length.toLocaleString()} most recent events
            {totalInDatabase > events.length
              ? ` of ${totalInDatabase.toLocaleString()} stored`
              : ""}
            . Admin access only.
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:px-6">
        <label className="block">
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Action, actor, workspace, or metadata"
            className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">Action</span>
          <CustomSelect
            value={actionFilter}
            onChange={setActionFilter}
            options={actionOptions}
            aria-label="Filter by action"
          />
        </label>
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">Workspace</span>
          <CustomSelect
            value={organizationFilter}
            onChange={setOrganizationFilter}
            options={organizationOptions}
            aria-label="Filter by workspace"
          />
        </label>
      </div>

      <DataTable className="rounded-none border-x-0 border-b-0">
        <DataTableHeader className="hidden grid-cols-[minmax(160px,1fr)_minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(140px,0.9fr)_88px] lg:grid lg:px-5">
          <div>When</div>
          <div>Action</div>
          <div>Actor</div>
          <div>Workspace</div>
          <div className="text-right">Details</div>
        </DataTableHeader>
        <DataTableBody>
          {paged.length === 0 ? (
            <DataTableEmptyState
              title={events.length === 0 ? "No audit events yet" : "No matching events"}
              description={
                events.length === 0
                  ? "Login, admin, and system actions will appear here as they happen."
                  : "Try a different search, action, or workspace filter."
              }
            />
          ) : null}
          {paged.map((event) => {
            const orgName = organizationLabel(event.organizationId, event.organizationName);
            const actorLabel = event.actorName || event.actorEmail || "System";
            return (
              <DataTableRow
                key={event.id}
                className="group items-start lg:grid-cols-[minmax(160px,1fr)_minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(140px,0.9fr)_88px] lg:px-5"
              >
                <div className="text-xs font-semibold text-[var(--color-text-muted)] lg:text-sm">
                  <span className="lg:hidden text-[10px] uppercase tracking-[0.14em]">When · </span>
                  {formatWhen(event.createdAt)}
                </div>
                <div className="min-w-0">
                  <span
                    className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[11px] font-semibold ${actionTone(event.action)}`}
                  >
                    <span className="truncate">{formatAuditAction(event.action)}</span>
                  </span>
                  <p className="mt-1 truncate text-[10px] text-[var(--color-text-muted)]" title={event.action}>
                    {event.action}
                  </p>
                  <p className="mt-1.5 truncate text-[11px] text-[var(--color-text-muted)] lg:hidden">
                    {metadataPreview(event.metadata)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">{actorLabel}</p>
                  {event.actorEmail ? (
                    <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                      {event.actorEmail}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">No actor</p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">{orgName}</p>
                </div>
                <div className="flex items-center lg:justify-end">
                  <button
                    type="button"
                    onClick={() => setSelected(event)}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                    aria-label={`View ${formatAuditAction(event.action)}`}
                    title="View details"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </DataTableRow>
            );
          })}
        </DataTableBody>
        <DataTablePagination
          totalItems={filtered.length}
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          itemLabel="events"
        />
      </DataTable>

      {selected ? <AuditEventSheet event={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

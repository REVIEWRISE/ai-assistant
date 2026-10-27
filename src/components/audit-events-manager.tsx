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
import {
  formatAuditAction,
  isBillingAuditAction,
  listKnownAuditActions,
} from "@/lib/audit-action-labels";
import { toast } from "@/lib/toast";
import * as XLSX from "xlsx";

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
  /** Distinct action codes from the full audit table (not just the loaded page). */
  actionCatalog?: string[];
};

type Severity = {
  label: string;
  pill: string;
  sheetPill: string;
  sheetIcon: string;
  sheetDot: string;
};

function formatWhen(value: string | Date, compact = false) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  if (compact) {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function organizationLabel(organizationId: string, name: string | null, metadata: unknown) {
  if (organizationId === PLATFORM_AUDIT_ORG_ID) return "Platform";
  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : null;
  if (meta?.scope === "platform") return name?.trim() ? `Platform · ${name.trim()}` : "Platform";
  return name?.trim() || "Unknown workspace";
}

function actionSeverity(action: string): Severity {
  const normalized = action.toLowerCase();
  if (
    normalized.includes("fail") ||
    normalized.includes("delete") ||
    normalized.includes("revoke") ||
    normalized.includes("blocked") ||
    normalized.includes("reject")
  ) {
    return {
      label: "Attention",
      pill: "border-red-200 bg-red-50 text-red-800 [[data-theme=dark]_&]:border-red-500/30 [[data-theme=dark]_&]:bg-red-500/15 [[data-theme=dark]_&]:text-red-200",
      sheetPill: "border-red-400/40 bg-red-500/15 text-red-100",
      sheetIcon: "border-red-400/30 bg-red-500/20 text-red-100",
      sheetDot: "bg-red-300",
    };
  }
  if (
    normalized.includes("success") ||
    normalized.includes("create") ||
    normalized.includes("connect") ||
    normalized.includes("register") ||
    normalized.includes("approved") ||
    normalized.includes("activated") ||
    normalized.includes("restored")
  ) {
    return {
      label: "Success",
      pill: "border-emerald-200 bg-emerald-50 text-emerald-800 [[data-theme=dark]_&]:border-emerald-500/30 [[data-theme=dark]_&]:bg-emerald-500/15 [[data-theme=dark]_&]:text-emerald-200",
      sheetPill: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
      sheetIcon: "border-emerald-400/30 bg-emerald-500/20 text-emerald-100",
      sheetDot: "bg-emerald-300",
    };
  }
  if (normalized.startsWith("billing")) {
    return {
      label: "Billing",
      pill: "border-violet-200 bg-violet-50 text-violet-800 [[data-theme=dark]_&]:border-violet-500/30 [[data-theme=dark]_&]:bg-violet-500/15 [[data-theme=dark]_&]:text-violet-200",
      sheetPill: "border-violet-400/40 bg-violet-500/15 text-violet-100",
      sheetIcon: "border-violet-400/30 bg-violet-500/20 text-violet-100",
      sheetDot: "bg-violet-300",
    };
  }
  return {
    label: "Info",
    pill: "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]",
    sheetPill: "border-white/15 bg-white/10 text-slate-200",
    sheetIcon: "border-white/15 bg-white/10 text-white",
    sheetDot: "bg-slate-300",
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
  if (
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    Object.keys(metadata as object).length === 0
  ) {
    return "No details";
  }
  try {
    const text = JSON.stringify(metadata);
    return text.length > 64 ? `${text.slice(0, 64)}…` : text;
  } catch {
    return "—";
  }
}

function formatMetaValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function metadataEntries(metadata: unknown): Array<{ key: string; value: string }> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const entries = Object.entries(metadata as Record<string, unknown>);
  if (entries.length === 0) return [];
  return entries.map(([key, value]) => ({
    key,
    value: formatMetaValue(value),
  }));
}

function prettyMetadata(metadata: unknown) {
  try {
    return JSON.stringify(metadata ?? {}, null, 2);
  } catch {
    return String(metadata);
  }
}

function formatExportWhen(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function parseDateInputStart(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateInputEnd(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventTime(value: string | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime();
}

function downloadAuditExcel(rows: AuditEventRow[]) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const sheetRows = rows.map((event) => ({
    When: formatExportWhen(event.createdAt),
    Action: formatAuditAction(event.action),
    "Action code": event.action,
    "Actor name": event.actorName ?? "",
    "Actor email": event.actorEmail ?? "",
    Workspace: organizationLabel(event.organizationId, event.organizationName, event.metadata),
    "Organization ID": event.organizationId,
    "Event ID": event.id,
    Metadata: prettyMetadata(event.metadata),
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  worksheet["!cols"] = [
    { wch: 24 },
    { wch: 36 },
    { wch: 40 },
    { wch: 22 },
    { wch: 28 },
    { wch: 24 },
    { wch: 36 },
    { wch: 36 },
    { wch: 48 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Audit log");
  XLSX.writeFile(workbook, `audit-log-${stamp}.xlsx`);
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
  const workspace = organizationLabel(
    event.organizationId,
    event.organizationName,
    event.metadata,
  );
  const details = metadataEntries(event.metadata);
  const hasDetails = details !== null && details.length > 0;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

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
        entered ? "bg-[var(--color-overlay)] backdrop-blur-[2px]" : "bg-transparent"
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
        className={`relative flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] shadow-[-24px_0_60px_-28px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out sm:max-w-lg ${
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
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-sm ${severity.sheetIcon}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
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
                <p className="mt-1 text-xs text-neutral-400">{formatWhen(event.createdAt)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severity.sheetPill}`}
                  >
                    <span className={`size-1.5 rounded-full ${severity.sheetDot}`} aria-hidden />
                    {severity.label}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    {workspace}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-sm text-slate-200 transition hover:bg-white/15 hover:text-white"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-semibold text-[var(--color-primary-h)]">
                {actorInitials(event.actorName, event.actorEmail)}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Actor
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">
                  {actorLabel}
                </p>
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
                  {formatWhen(event.createdAt, true)}
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
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
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
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
                  <div
                    key={entry.key}
                    className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-3"
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                      {entry.key.replace(/[_-]+/g, " ")}
                    </dt>
                    <dd className="break-words text-sm font-medium text-[var(--color-text)]">
                      {entry.value}
                    </dd>
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

        <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
          >
            Close
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

export function AuditEventsManager({
  events,
  organizations,
  totalInDatabase,
  actionCatalog = [],
}: AuditEventsManagerProps) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<AuditEventRow | null>(null);

  const actionOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const action of events.map((event) => event.action)) {
      if (action.trim()) unique.add(action);
    }
    for (const action of actionCatalog) {
      if (action.trim()) unique.add(action);
    }
    // Always keep known billing / billing-admin actions in the filter, even if
    // none of those events are in the currently loaded window.
    for (const action of listKnownAuditActions()) {
      if (isBillingAuditAction(action)) unique.add(action);
    }

    const sorted = [...unique].sort((a, b) =>
      formatAuditAction(a).localeCompare(formatAuditAction(b)),
    );
    return [
      { value: "all", label: "All actions" },
      ...sorted.map((action) => ({ value: action, label: formatAuditAction(action) })),
    ];
  }, [events, actionCatalog]);

  const organizationOptions = useMemo(() => {
    const fromEvents = new Map<string, string>();
    for (const event of events) {
      fromEvents.set(
        event.organizationId,
        organizationLabel(event.organizationId, event.organizationName, event.metadata),
      );
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
        organizationLabel(event.organizationId, event.organizationName, event.metadata),
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

  const exportRows = useMemo(() => {
    const fromDate = parseDateInputStart(dateFrom);
    const toDate = parseDateInputEnd(dateTo);
    if (!fromDate && !toDate) return filtered;
    return filtered.filter((event) => {
      const time = eventTime(event.createdAt);
      if (Number.isNaN(time)) return false;
      if (fromDate && time < fromDate.getTime()) return false;
      if (toDate && time > toDate.getTime()) return false;
      return true;
    });
  }, [filtered, dateFrom, dateTo]);

  const filtersActive =
    query.trim().length > 0 || actionFilter !== "all" || organizationFilter !== "all";

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, currentPage, perPage]);

  function clearFilters() {
    setQuery("");
    setActionFilter("all");
    setOrganizationFilter("all");
    setPage(1);
  }

  function exportFiltered() {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast.error("From date must be on or before To date.");
      return;
    }
    if (!dateFrom && !dateTo) {
      toast.error("Choose a from and/or to date before exporting.");
      return;
    }
    if (exportRows.length === 0) {
      toast.error("No events in that date range.");
      return;
    }
    downloadAuditExcel(exportRows);
    toast.success(
      `Exported ${exportRows.length.toLocaleString()} event${exportRows.length === 1 ? "" : "s"} (${dateFrom || "…"} → ${dateTo || "…"}).`,
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
      <div className="border-b border-[var(--color-border)] px-4 py-4 lg:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Security trail
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Audit events</h2>
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
                {filtered.length.toLocaleString()}
                {filtered.length !== events.length
                  ? ` of ${events.length.toLocaleString()}`
                  : ""}{" "}
                shown
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
              Latest {events.length.toLocaleString()} events
              {totalInDatabase > events.length
                ? ` of ${totalInDatabase.toLocaleString()} stored`
                : ""}
              . Use the date range only when exporting to Excel.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[22rem]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Export date range
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Export from date</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  aria-label="Export from date"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]"
                />
              </label>
              <span className="text-xs text-[var(--color-text-muted)]">to</span>
              <label className="min-w-0 flex-1">
                <span className="sr-only">Export to date</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  aria-label="Export to date"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]"
                />
              </label>
              <button
                type="button"
                onClick={exportFiltered}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M12 3v12" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 lg:px-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="block min-w-0">
            <span className="sr-only">Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search action, actor, workspace…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]"
            />
          </label>
          <CustomSelect
            value={actionFilter}
            onChange={(value) => {
              setActionFilter(value);
              setPage(1);
            }}
            options={actionOptions}
            aria-label="Filter by action"
          />
          <CustomSelect
            value={organizationFilter}
            onChange={(value) => {
              setOrganizationFilter(value);
              setPage(1);
            }}
            options={organizationOptions}
            aria-label="Filter by workspace"
          />
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
            >
              Clear
            </button>
          ) : (
            <div className="hidden lg:block" aria-hidden />
          )}
        </div>
      </div>

      <DataTable className="rounded-none border-x-0 border-b-0">
        <DataTableHeader className="hidden grid-cols-[minmax(150px,0.95fr)_minmax(200px,1.35fr)_minmax(170px,1.1fr)_minmax(140px,0.95fr)_72px] lg:grid lg:px-5">
          <div>When</div>
          <div>Action</div>
          <div>Actor</div>
          <div>Workspace</div>
          <div className="text-right">View</div>
        </DataTableHeader>
        <DataTableBody>
          {paged.length === 0 ? (
            <DataTableEmptyState
              title={events.length === 0 ? "No audit events yet" : "No matching events"}
              description={
                events.length === 0
                  ? "Sign-ins, billing changes, and admin actions will appear here as they happen."
                  : "Try a different search, action, or workspace filter."
              }
              action={
                filtersActive ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                  >
                    Clear filters
                  </button>
                ) : null
              }
            />
          ) : null}
          {paged.map((event) => {
            const orgName = organizationLabel(
              event.organizationId,
              event.organizationName,
              event.metadata,
            );
            const actorLabel = event.actorName || event.actorEmail || "System";
            const actionLabel = formatAuditAction(event.action);
            const severity = actionSeverity(event.action);

            return (
              <DataTableRow
                key={event.id}
                className="gap-0 p-0 hover:bg-transparent lg:grid-cols-[minmax(150px,0.95fr)_minmax(200px,1.35fr)_minmax(170px,1.1fr)_minmax(140px,0.95fr)_72px] lg:items-center lg:gap-3 lg:px-5 lg:py-3.5 lg:hover:bg-[var(--color-surface)]"
              >
                <button
                  type="button"
                  onClick={() => setSelected(event)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--color-raised)] active:bg-[var(--color-raised)] lg:hidden"
                  aria-label={`View ${actionLabel}`}
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-semibold text-[var(--color-primary-h)]">
                    {actorInitials(event.actorName, event.actorEmail)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{actionLabel}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {formatWhen(event.createdAt, true)}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                      <span className="font-medium text-[var(--color-text)]">{actorLabel}</span>
                      <span className="mx-1.5 text-[var(--color-text-subtle)]">·</span>
                      <span>{orgName}</span>
                    </p>
                  </div>
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center text-[var(--color-text-muted)]">
                    <EyeIcon className="size-4" />
                  </span>
                </button>

                <div className="hidden text-sm text-[var(--color-text-muted)] lg:block">
                  <p className="font-semibold text-[var(--color-text)]">
                    {formatWhen(event.createdAt, true)}
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums">
                    {new Date(event.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="hidden min-w-0 lg:block">
                  <span
                    className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severity.pill}`}
                  >
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${
                        severity.label === "Attention"
                          ? "bg-red-500"
                          : severity.label === "Success"
                            ? "bg-emerald-500"
                            : severity.label === "Billing"
                              ? "bg-violet-500"
                              : "bg-[var(--color-text-muted)]"
                      }`}
                      aria-hidden
                    />
                    <span className="truncate">{actionLabel}</span>
                  </span>
                  <p
                    className="mt-1.5 truncate font-mono text-[10px] text-[var(--color-text-muted)]"
                    title={event.action}
                  >
                    {event.action}
                  </p>
                </div>
                <div className="hidden min-w-0 items-center gap-2.5 lg:flex">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[10px] font-semibold text-[var(--color-primary-h)]">
                    {actorInitials(event.actorName, event.actorEmail)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {actorLabel}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                      {event.actorEmail || "System"}
                    </p>
                  </div>
                </div>
                <div className="hidden min-w-0 lg:block">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">{orgName}</p>
                </div>
                <div className="hidden items-center justify-end lg:flex">
                  <button
                    type="button"
                    onClick={() => setSelected(event)}
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                    aria-label={`View ${actionLabel}`}
                    title="View details"
                  >
                    <EyeIcon className="size-4" />
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
          onPerPageChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          itemLabel="events"
        />
      </DataTable>

      {selected ? (
        <AuditEventSheet
          key={selected.id}
          event={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}

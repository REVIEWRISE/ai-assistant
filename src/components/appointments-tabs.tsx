"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppointmentAnalytics } from "@/lib/appointment-analytics";
import {
  appointmentSourceBadgeClass,
  appointmentSourceLabel,
  BOOKED_SOURCE_FILTER_OPTIONS,
  bookingSourceSupportsCrmSync,
  filterAppointmentsBySource,
  type BookedSourceFilter,
} from "@/lib/appointment-source";
import type { BookingFlowQaItem } from "@/lib/booking-flow-qa";
import { BookedCrmSyncForm } from "@/components/booked-crm-sync-form";
import { CalendarServiceManager } from "@/components/calendar-service-manager";
import { Panel } from "@/components/ui";

type BookedAppointmentRow = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  startTime: string;
  endTime: string;
  displayStatus: string;
  source: string;
  serviceDescription: string | null;
  /** Guided chatbot Q&A captured when the booking was saved (embed flow). */
  bookingFlowQa: BookingFlowQaItem[] | null;
  calendarProviderName: string | null;
  rawMessage: string | null;
  providerSyncStatus: string;
  externalCalendarEventId: string | null;
  providerSyncError: string | null;
  routedProviderId: string | null;
  routedConnectionUserId: string | null;
  crmSyncStatus: string;
  crmSyncError: string | null;
  crmSyncAttempts: number;
};

type CalendarRouteOption = {
  providerId: string;
  connectionUserId: string;
  providerName: string;
};

type CalendarProviderItem = {
  id: string;
  name: string;
  type: string;
  logoUrl?: string | null;
  status: string;
  synced: string;
  lastSync: string;
  syncScope: string;
  tone: string;
  connectHref: string;
};

type ProviderLoadItem = {
  provider: string;
  requests: string;
  note: string;
};

type TabKey = "integrations" | "booked" | "analytics";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "integrations", label: "Integrations" },
  { key: "booked", label: "Booked" },
  { key: "analytics", label: "Analytics" },
];

type AppointmentsTabsProps = {
  bookedAppointments: {
    upcoming: BookedAppointmentRow[];
    recentPast: BookedAppointmentRow[];
  };
  calendarProviders: CalendarProviderItem[];
  providerLoad: ProviderLoadItem[];
  calendarRouteOptions: CalendarRouteOption[];
  retryCalendarSync: (formData: FormData) => void | Promise<void>;
  retryCrmSync: (formData: FormData) => void | Promise<void>;
  crmWebhookConfigured: boolean;
  appointmentAnalytics: AppointmentAnalytics;
};

function dateKeyLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthGridStart(base: Date): Date {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return start;
}

function monthGridDays(base: Date): Date[] {
  const start = monthGridStart(base);
  return Array.from({ length: 42 }, (_, idx) => {
    const d = new Date(start);
    d.setDate(start.getDate() + idx);
    return d;
  });
}

/** Sunday-first week containing `date` (local calendar). */
function weekDaysContaining(date: Date): Date[] {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(local);
  start.setDate(local.getDate() - local.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function addCalendarDays(date: Date, delta: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + delta);
  return d;
}

type CalendarPeriodMode = "month" | "week" | "day";

/** Human-readable week range (Sun–Sat) that contains `date`, in local time. */
function formatWeekRangeContaining(date: Date): string {
  const week = weekDaysContaining(date);
  const a = week[0];
  const b = week[6];
  const sameY = a.getFullYear() === b.getFullYear();
  const sameM = sameY && a.getMonth() === b.getMonth();
  if (sameM) {
    return `${a.toLocaleDateString(undefined, { month: "long", day: "numeric" })} – ${b.getDate()}, ${a.getFullYear()}`;
  }
  if (sameY) {
    return `${a.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${b.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return `${a.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${b.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

/** Label for a period mode from an anchor date (month name, week range, or weekday + date). */
function currentPeriodJumpButtonLabel(mode: CalendarPeriodMode, anchorDate: Date): string {
  if (mode === "month") {
    return anchorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  if (mode === "week") {
    return formatWeekRangeContaining(anchorDate);
  }
  return anchorDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function calendarNavJumpToTodayTitle(mode: CalendarPeriodMode, focus: Date): string {
  const todayLabel = currentPeriodJumpButtonLabel(mode, new Date());
  const viewingLabel = currentPeriodJumpButtonLabel(mode, focus);
  return viewingLabel === todayLabel
    ? `Viewing today (${todayLabel}). Click to recenter on the current date.`
    : `Viewing ${viewingLabel}. Click to jump to today (${todayLabel}).`;
}

function calendarNavJumpToTodayAriaLabel(mode: CalendarPeriodMode, focus: Date): string {
  const todayLabel = currentPeriodJumpButtonLabel(mode, new Date());
  const viewingLabel = currentPeriodJumpButtonLabel(mode, focus);
  return `Jump to today, ${todayLabel}. Currently viewing ${viewingLabel}.`;
}

function formatAppointmentSlot(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "—";
  const datePart = s.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const t1 = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const t2 = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${t1} – ${t2}`;
}

function statusDotClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "booked" || s === "confirmed") return "bg-[var(--color-success)]";
  if (s === "pending" || s === "requested") return "bg-[var(--color-warning)]";
  if (s === "cancelled") return "bg-[var(--color-text-subtle)]";
  return "bg-[var(--color-text-subtle)]";
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "booked" || s === "confirmed") return "vr-app-status-success";
  if (s === "pending" || s === "requested") return "vr-app-status-warning";
  if (s === "cancelled") return "vr-app-status-muted";
  return "vr-app-status-muted";
}

/** Guest name or contact from synthetic chatbot booking lines (`name is …`, usually last). */
function parseGuestLabelFromRawMessage(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const needle = "name is ";
  const idx = t.toLowerCase().lastIndexOf(needle);
  if (idx >= 0) {
    const tail = t.slice(idx + needle.length).trim();
    if (tail.length >= 2 && tail.length <= 200) return tail;
  }

  const nameMatch = t.match(
    /\b(?:i'?m|i\s+am|this\s+is)\s+([A-Za-z0-9][A-Za-z0-9'.@+-]*(?:\s+[A-Za-z0-9][A-Za-z0-9'.@+-]*){0,4})\b/i,
  );
  const parsed = nameMatch?.[1]?.trim();
  if (parsed && parsed.length >= 2 && parsed.length <= 200) return parsed;

  return null;
}

function AppointmentSourceBadge({ source }: { source: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${appointmentSourceBadgeClass(source)}`}
    >
      {appointmentSourceLabel(source)}
    </span>
  );
}

function BookedSourceFilterSwitch({
  value,
  onChange,
  counts,
}: {
  value: BookedSourceFilter;
  onChange: (value: BookedSourceFilter) => void;
  counts: { all: number; chatbot_embed: number; voice_retell: number };
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {BOOKED_SOURCE_FILTER_OPTIONS.map((option) => {
        const count =
          option.key === "all"
            ? counts.all
            : option.key === "chatbot_embed"
              ? counts.chatbot_embed
              : counts.voice_retell;
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            }`}
          >
            {option.label}
            <span className={active ? "opacity-90" : "text-[var(--color-text-muted)]"}> ({count})</span>
          </button>
        );
      })}
    </div>
  );
}

function displayBookedCustomerName(row: BookedAppointmentRow): string {
  const explicit = row.customerName?.trim();
  if (explicit && explicit.toLowerCase() !== "website guest") return explicit;

  const raw = row.rawMessage?.trim() ?? "";
  if (raw) {
    const fromRaw = parseGuestLabelFromRawMessage(raw);
    if (fromRaw) return fromRaw;
  }

  return explicit || "Website guest";
}

/**
 * Calendar day cells: show the guest when we have one; otherwise a neutral label.
 */
function calendarCellTitle(row: BookedAppointmentRow): string {
  const guest = displayBookedCustomerName(row);
  if (guest && guest !== "Website guest") return guest;
  return "Booking";
}

function listSectionLabel(isoStart: string): string {
  const d = new Date(isoStart);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeListDayHint(dateKey: string): string | null {
  const todayKey = dateKeyLocal(new Date().toISOString());
  if (dateKey === todayKey) return "Today";
  const t = new Date();
  const tomorrow = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
  const tomorrowKey = dateKeyLocal(tomorrow.toISOString());
  if (dateKey === tomorrowKey) return "Tomorrow";
  const yesterday = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
  const yesterdayKey = dateKeyLocal(yesterday.toISOString());
  if (dateKey === yesterdayKey) return "Yesterday";
  return null;
}

function dateKeyDisplayParts(dateKey: string): {
  dayNum: number;
  monthShort: string;
  weekdayShort: string;
  titleLong: string;
} | null {
  const seg = dateKey.split("-");
  if (seg.length !== 3) return null;
  const y = Number.parseInt(seg[0], 10);
  const m = Number.parseInt(seg[1], 10);
  const d = Number.parseInt(seg[2], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    dayNum: d,
    monthShort: dt.toLocaleDateString(undefined, { month: "short" }),
    weekdayShort: dt.toLocaleDateString(undefined, { weekday: "short" }),
    titleLong: dt.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

function formatListTime(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ListDetailsChevron({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type BookedViewMode = "calendar" | "list";

function CalendarViewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.695 13.7h.009M15.695 16.7h.009M11.995 13.7h.01M11.995 16.7h.01M8.294 13.7h.01M8.294 16.7h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListViewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 7h11M9 12h11M9 17h11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="5" cy="7" r="1.5" fill="currentColor" />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="5" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

function BookedViewModeSwitch({
  value,
  onChange,
}: {
  value: BookedViewMode;
  onChange: (mode: BookedViewMode) => void;
}) {
  const options: Array<{
    mode: BookedViewMode;
    label: string;
    hint: string;
    icon: typeof CalendarViewIcon;
  }> = [
    {
      mode: "calendar",
      label: "Calendar",
      hint: "Month, week, or day",
      icon: CalendarViewIcon,
    },
    {
      mode: "list",
      label: "List",
      hint: "By date",
      icon: ListViewIcon,
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)] via-[var(--color-bg)] to-[var(--color-surface)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="shrink-0 sm:max-w-[9.5rem] sm:border-r sm:border-[var(--color-border)] sm:pr-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">View</p>
          <p className="mt-0.5 text-xs font-medium leading-snug text-[var(--color-text-muted)]">Layout for booked times</p>
        </div>
        <div
          className="grid min-w-0 flex-1 grid-cols-2 gap-2"
          role="radiogroup"
          aria-label="Booked appointments layout"
        >
          {options.map(({ mode, label, hint, icon: Icon }) => {
            const selected = value === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(mode)}
                className={`group relative flex flex-col items-stretch rounded-xl px-3 py-2.5 text-left transition-all duration-200 sm:flex-row sm:items-center sm:gap-3 sm:py-2.5 sm:pl-3 sm:pr-3.5 ${
                  selected
                    ? "bg-[var(--color-bg)] shadow-[0_1px_3px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.06)] ring-1 ring-[var(--color-border)]"
                    : "hover:bg-[var(--color-bg)]/70"
                } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]`}
              >
                <span
                  className={`mb-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors sm:mb-0 ${
                    selected
                      ? "border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-text-subtle)] group-hover:border-[var(--color-border-hover)] group-hover:bg-[var(--color-bg)] group-hover:text-[var(--color-text-muted)]"
                  }`}
                >
                  <Icon className="shrink-0" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`text-sm font-semibold tracking-tight ${selected ? "text-[var(--color-text)]" : "text-[var(--color-text)] group-hover:text-[var(--color-text)]"}`}
                  >
                    {label}
                  </span>
                  <span
                    className={`mt-0.5 block text-[11px] font-medium leading-snug ${
                      selected ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-muted)]"
                    }`}
                  >
                    {hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarPeriodModeSwitch({
  value,
  onChange,
}: {
  value: CalendarPeriodMode;
  onChange: (mode: CalendarPeriodMode) => void;
}) {
  const options: Array<{ key: CalendarPeriodMode; label: string; hint: string }> = [
    { key: "month", label: "Month", hint: "Full month grid" },
    { key: "week", label: "Week", hint: "7-day strip" },
    { key: "day", label: "Day", hint: "Single day" },
  ];

  return (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
      role="radiogroup"
      aria-label="Calendar time range"
    >
      <div className="grid grid-cols-3 gap-1">
        {options.map(({ key, label, hint }) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              title={hint}
              onClick={() => onChange(key)}
              className={`rounded-lg px-2 py-2 text-center transition sm:px-3 ${
                selected
                  ? "bg-[var(--color-primary)] font-semibold text-[var(--color-primary-fg)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)]"
                  : "text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-h)] sm:text-sm"
              } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]`}
            >
              <span className="block truncate">{label}</span>
              <span
                className={`mt-0.5 hidden text-[10px] font-normal leading-tight sm:block ${
                  selected ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-subtle)]"
                }`}
              >
                {hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookedAppointmentsPanel({
  upcoming,
  recentPast,
  crmWebhookConfigured,
  retryCrmSync,
}: {
  upcoming: BookedAppointmentRow[];
  recentPast: BookedAppointmentRow[];
  crmWebhookConfigured: boolean;
  retryCrmSync: (formData: FormData) => void | Promise<void>;
}) {
  const allRows = useMemo(
    () =>
      [...upcoming, ...recentPast].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
    [upcoming, recentPast],
  );
  const [sourceFilter, setSourceFilter] = useState<BookedSourceFilter>("all");
  const sourceCounts = useMemo(
    () => ({
      all: allRows.length,
      chatbot_embed: allRows.filter((row) => row.source === "chatbot_embed").length,
      voice_retell: allRows.filter((row) => row.source === "voice_retell").length,
    }),
    [allRows],
  );
  const filteredRows = useMemo(
    () => filterAppointmentsBySource(allRows, sourceFilter),
    [allRows, sourceFilter],
  );
  const total = filteredRows.length;
  const [bookedViewMode, setBookedViewMode] = useState<BookedViewMode>("calendar");
  const [calendarPeriodMode, setCalendarPeriodMode] = useState<CalendarPeriodMode>("month");
  const [calendarFocus, setCalendarFocus] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [openDateKey, setOpenDateKey] = useState<string | null>(null);
  const listSections = useMemo(() => {
    const sections: { dateKey: string; heading: string; rows: BookedAppointmentRow[] }[] = [];
    for (const row of filteredRows) {
      const key = dateKeyLocal(row.startTime);
      if (!key) continue;
      const last = sections[sections.length - 1];
      if (last && last.dateKey === key) {
        last.rows.push(row);
      } else {
        sections.push({
          dateKey: key,
          heading: listSectionLabel(row.startTime),
          rows: [row],
        });
      }
    }
    return sections;
  }, [filteredRows]);
  const rowsByDate = useMemo(() => {
    const grouped = new Map<string, BookedAppointmentRow[]>();
    for (const row of filteredRows) {
      const key = dateKeyLocal(row.startTime);
      if (!key) continue;
      const current = grouped.get(key) ?? [];
      current.push(row);
      grouped.set(key, current);
    }
    return grouped;
  }, [filteredRows]);

  const monthBase = useMemo(
    () => new Date(calendarFocus.getFullYear(), calendarFocus.getMonth(), 1),
    [calendarFocus],
  );
  const gridDays = useMemo(() => monthGridDays(monthBase), [monthBase]);
  const visibleMonth = monthBase.getMonth();
  const weekDays = useMemo(() => weekDaysContaining(calendarFocus), [calendarFocus]);
  const firstBookedKeyInRange = useMemo(() => {
    if (calendarPeriodMode === "month") {
      for (const d of gridDays) {
        if (d.getMonth() !== visibleMonth) continue;
        const key = dateKeyLocal(d.toISOString());
        if (rowsByDate.has(key)) return key;
      }
      return null;
    }
    if (calendarPeriodMode === "week") {
      for (const d of weekDays) {
        const key = dateKeyLocal(d.toISOString());
        if (rowsByDate.has(key)) return key;
      }
      return null;
    }
    const key = dateKeyLocal(calendarFocus.toISOString());
    return rowsByDate.has(key) ? key : null;
  }, [calendarPeriodMode, gridDays, visibleMonth, weekDays, rowsByDate, calendarFocus]);
  const activeDateKey = selectedDateKey ?? firstBookedKeyInRange;
  const modalRows = openDateKey ? rowsByDate.get(openDateKey) ?? [] : [];
  if (allRows.length === 0) {
    return (
      <Panel
        title="Booked appointments"
        subtitle="Reservations from your chatbot, phone agent, and other sources appear here once guests pick a time."
      >
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
          No appointments yet. When visitors book through your embedded chatbot or Retell phone agent, they will appear here.
        </div>
      </Panel>
    );
  }

  if (total === 0) {
    return (
      <Panel
        title="Booked appointments"
        subtitle="Filter by source to review chatbot and phone bookings separately."
      >
        <div className="space-y-4">
          <BookedSourceFilterSwitch value={sourceFilter} onChange={setSourceFilter} counts={sourceCounts} />
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No {appointmentSourceLabel(sourceFilter).toLowerCase()} bookings yet.
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Booked appointments"
      subtitle="Month, week, or day calendar—or switch to the list. Filter by chatbot vs phone (Voice AI)."
    >
      <div className="space-y-4">
        <BookedSourceFilterSwitch value={sourceFilter} onChange={setSourceFilter} counts={sourceCounts} />
        <BookedViewModeSwitch value={bookedViewMode} onChange={setBookedViewMode} />

        {bookedViewMode === "calendar" ? (
          <>
            <CalendarPeriodModeSwitch value={calendarPeriodMode} onChange={setCalendarPeriodMode} />

            <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] to-[var(--color-surface)] px-3 py-2.5 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setSelectedDateKey(null);
                  if (calendarPeriodMode === "month") {
                    setCalendarFocus((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                  } else if (calendarPeriodMode === "week") {
                    setCalendarFocus((prev) => addCalendarDays(prev, -7));
                  } else {
                    setCalendarFocus((prev) => addCalendarDays(prev, -1));
                  }
                }}
                className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] shadow-sm hover:bg-[var(--color-raised)]"
              >
                ← Prev
              </button>
              <button
                type="button"
                title={calendarNavJumpToTodayTitle(calendarPeriodMode, calendarFocus)}
                aria-label={calendarNavJumpToTodayAriaLabel(calendarPeriodMode, calendarFocus)}
                onClick={() => {
                  setCalendarFocus(new Date());
                  setSelectedDateKey(null);
                }}
                className="min-w-0 max-w-[46%] flex-1 truncate rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-center text-xs font-semibold text-[var(--color-text)] shadow-sm hover:bg-[var(--color-raised)] sm:max-w-none sm:flex-none sm:px-3"
              >
                {currentPeriodJumpButtonLabel(calendarPeriodMode, calendarFocus)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDateKey(null);
                  if (calendarPeriodMode === "month") {
                    setCalendarFocus((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                  } else if (calendarPeriodMode === "week") {
                    setCalendarFocus((prev) => addCalendarDays(prev, 7));
                  } else {
                    setCalendarFocus((prev) => addCalendarDays(prev, 1));
                  }
                }}
                className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] shadow-sm hover:bg-[var(--color-raised)]"
              >
                Next →
              </button>
            </div>

            {calendarPeriodMode === "month" ? (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-1">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-1.5">
                  {gridDays.map((day) => {
                    const key = dateKeyLocal(day.toISOString());
                    const dayRows = rowsByDate.get(key) ?? [];
                    const inMonth = day.getMonth() === visibleMonth;
                    const isSelected = key === activeDateKey;
                    const todayKey = dateKeyLocal(new Date().toISOString());
                    const isToday = key === todayKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedDateKey(key);
                          setCalendarFocus(day);
                          if (dayRows.length > 0) {
                            setOpenDateKey(key);
                          }
                        }}
                        className={`min-h-[7.25rem] rounded-xl border px-2 py-1.5 text-left transition ${
                          isSelected
                            ? "border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[var(--color-primary-soft)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
                            : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface)]"
                        } ${inMonth ? "text-[var(--color-text)]" : "text-[var(--color-text-subtle)]/80"}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-semibold ${isToday ? "text-[var(--color-success)]" : ""}`}>{day.getDate()}</p>
                          {dayRows.length > 0 ? (
                            <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary-fg)]">
                              {dayRows.length}
                            </span>
                          ) : null}
                        </div>
                        {dayRows.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            <p className="line-clamp-1 text-[11px] font-medium text-[var(--color-text)]">
                              {calendarCellTitle(dayRows[0])}
                            </p>
                            {dayRows[0].bookingFlowQa && dayRows[0].bookingFlowQa.length > 0 ? (
                              <p className="line-clamp-1 text-[9px] leading-snug text-[var(--color-text-muted)]">
                                <span className="font-semibold text-[var(--color-text)]">{dayRows[0].bookingFlowQa[0].question}</span>
                                <span className="text-[var(--color-text-subtle)]"> → </span>
                                <span>{dayRows[0].bookingFlowQa[0].answer}</span>
                                {dayRows[0].bookingFlowQa.length > 1 ? <span className="text-[var(--color-text-subtle)]"> ...</span> : null}
                              </p>
                            ) : null}
                            <div className="flex items-center gap-1">
                              {dayRows.slice(0, 3).map((row) => (
                                <span key={row.id} className={`h-1.5 w-1.5 rounded-full ${statusDotClass(row.displayStatus)}`} />
                              ))}
                              {dayRows.length > 3 ? <span className="text-[10px] text-[var(--color-text-muted)]">+{dayRows.length - 3}</span> : null}
                            </div>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {calendarPeriodMode === "week" ? (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-1">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto pb-1">
                  <div className="grid min-w-[36rem] grid-cols-7 gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-1.5 sm:min-w-0">
                    {weekDays.map((day) => {
                      const key = dateKeyLocal(day.toISOString());
                      const dayRows = rowsByDate.get(key) ?? [];
                      const isSelected = key === activeDateKey;
                      const todayKey = dateKeyLocal(new Date().toISOString());
                      const isToday = key === todayKey;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedDateKey(key);
                            setCalendarFocus(day);
                            if (dayRows.length > 0) {
                              setOpenDateKey(key);
                            }
                          }}
                          className={`min-h-[9.5rem] rounded-xl border px-1.5 py-1.5 text-left transition sm:px-2 ${
                            isSelected
                              ? "border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[var(--color-primary-soft)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
                              : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface)]"
                          } text-[var(--color-text)]`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-[11px] font-bold tabular-nums ${isToday ? "text-[var(--color-success)]" : "text-[var(--color-text)]"}`}>
                              {day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </p>
                            {dayRows.length > 0 ? (
                              <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-1 py-0.5 text-[9px] font-semibold text-[var(--color-primary-fg)]">
                                {dayRows.length}
                              </span>
                            ) : null}
                          </div>
                          {dayRows.length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {dayRows.slice(0, 5).map((row) => (
                                <div key={row.id} className="rounded-md bg-[var(--color-surface)]/90 px-1 py-0.5">
                                  <p className="truncate text-[9px] font-semibold tabular-nums text-[var(--color-text)]">
                                    {formatListTime(row.startTime)}
                                  </p>
                                  <p className="truncate text-[9px] font-medium text-[var(--color-text-muted)]">{calendarCellTitle(row)}</p>
                                </div>
                              ))}
                              {dayRows.length > 5 ? (
                                <p className="text-[9px] font-semibold text-[var(--color-text-muted)]">+{dayRows.length - 5} more</p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-3 text-[10px] font-medium text-[var(--color-text-subtle)]">—</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}

            {calendarPeriodMode === "day" ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-3 sm:p-4">
                {(() => {
                  const dayKey = dateKeyLocal(calendarFocus.toISOString());
                  const dayRowsSorted = [...(rowsByDate.get(dayKey) ?? [])].sort(
                    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
                  );
                  const parts = dateKeyDisplayParts(dayKey);
                  const relative = relativeListDayHint(dayKey);
                  const todayKey = dateKeyLocal(new Date().toISOString());
                  const isToday = dayKey === todayKey;
                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] pb-3">
                        {parts ? (
                          <div
                            className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-center shadow-sm ${
                              isToday
                                ? "border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-gradient-to-b from-[var(--color-success-soft)] to-[var(--color-bg)] text-[var(--color-success)]"
                                : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
                            }`}
                          >
                            <span className="text-[9px] font-bold uppercase leading-none text-[var(--color-text-muted)]">{parts.monthShort}</span>
                            <span className="text-lg font-bold tabular-nums leading-tight">{parts.dayNum}</span>
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--color-text)] sm:text-base">{parts?.titleLong ?? dayKey}</p>
                          {relative ? (
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                isToday ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
                              }`}
                            >
                              {relative}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {dayRowsSorted.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                          No bookings on this date. Use Prev / Next, or jump to today (
                          {currentPeriodJumpButtonLabel(calendarPeriodMode, new Date())}).
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {dayRowsSorted.map((row) => (
                            <li key={row.id}>
                              <button
                                type="button"
                                aria-label={`Open booking details for ${displayBookedCustomerName(row)}`}
                                onClick={() => {
                                  setSelectedDateKey(dayKey);
                                  setOpenDateKey(dayKey);
                                }}
                                className="flex w-full gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 text-left shadow-sm transition hover:border-[var(--color-border-hover)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                              >
                                <div className="flex w-[4.5rem] shrink-0 flex-col items-end justify-center border-r border-[var(--color-border-muted)] pr-3 text-right">
                                  <span className="text-xs font-bold tabular-nums text-[var(--color-text)]">
                                    {formatListTime(row.startTime)}
                                  </span>
                                  <span className="text-[10px] font-semibold tabular-nums text-[var(--color-text-subtle)]">
                                    {formatListTime(row.endTime)}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <p className="font-semibold text-[var(--color-text)]">{displayBookedCustomerName(row)}</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <AppointmentSourceBadge source={row.source} />
                                      <span
                                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(row.displayStatus)}`}
                                      >
                                        {row.displayStatus}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : null}

            {activeDateKey ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                {calendarPeriodMode === "day" ? "Focus date" : "Selected date"}:{" "}
                <span className="font-semibold text-[var(--color-text)]">
                  {new Date(activeDateKey).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {" · "}
                {(rowsByDate.get(activeDateKey)?.length ?? 0)} booking
                {(rowsByDate.get(activeDateKey)?.length ?? 0) === 1 ? "" : "s"}
              </p>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">
                {calendarPeriodMode === "month"
                  ? "No bookings to highlight in this month—pick a date on the grid or switch range."
                  : calendarPeriodMode === "week"
                    ? "No bookings this week—move to another week or try Month view."
                    : `No bookings on this day—use Prev / Next or jump to ${currentPeriodJumpButtonLabel("day", new Date())}.`}
              </p>
            )}
          </>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)] via-[var(--color-bg)] to-[var(--color-surface)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="max-h-[min(70vh,42rem)] overflow-y-auto">
              <div className="divide-y divide-[var(--color-border-muted)]">
                {listSections.map((section) => {
                  const parts = dateKeyDisplayParts(section.dateKey);
                  const relative = relativeListDayHint(section.dateKey);
                  const isToday = relative === "Today";
                  return (
                    <div key={section.dateKey} className="bg-[var(--color-bg)]/40 px-3 py-4 sm:px-4">
                      <div className="sticky top-0 z-[1] -mx-3 mb-3 border-b border-[var(--color-border)] bg-gradient-to-b from-[color-mix(in_srgb,var(--color-bg)_98%,transparent)] to-[color-mix(in_srgb,var(--color-bg)_90%,transparent)] px-3 py-3 backdrop-blur-md sm:-mx-4 sm:px-4">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                          {parts ? (
                            <div
                              className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border text-center shadow-sm ${
                                isToday
                                  ? "border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-gradient-to-b from-[var(--color-success-soft)] to-[var(--color-bg)] text-[var(--color-success)]"
                                  : "border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg)] text-[var(--color-text)]"
                              }`}
                            >
                              <span className="text-[10px] font-bold uppercase leading-none tracking-wide text-[var(--color-text-muted)]">
                                {parts.monthShort}
                              </span>
                              <span className="text-xl font-bold tabular-nums leading-tight">{parts.dayNum}</span>
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                                {parts.weekdayShort}
                              </span>
                            </div>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold leading-snug text-[var(--color-text)] sm:text-base">
                                {parts?.titleLong ?? section.heading}
                              </h4>
                              {relative ? (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                    isToday
                                      ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                                      : "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
                                  }`}
                                >
                                  {relative}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">
                              {section.rows.length} booking{section.rows.length === 1 ? "" : "s"} scheduled
                            </p>
                          </div>
                        </div>
                      </div>

                      <ul className="space-y-2.5">
                        {section.rows.map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              aria-label={`Open booking details for ${displayBookedCustomerName(row)}`}
                              onClick={() => {
                                setOpenDateKey(section.dateKey);
                                setSelectedDateKey(section.dateKey);
                              }}
                              className="group flex w-full gap-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/90 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:gap-1"
                            >
                              <div
                                className={`flex w-[4.75rem] shrink-0 flex-col justify-center gap-0.5 border-r border-[var(--color-border-muted)] bg-[var(--color-surface)]/80 px-3 py-3.5 text-right sm:w-[5.25rem] ${
                                  row.displayStatus.toLowerCase() === "cancelled"
                                    ? "opacity-75"
                                    : ""
                                }`}
                              >
                                <span className="text-xs font-bold tabular-nums text-[var(--color-text)]">
                                  {formatListTime(row.startTime)}
                                </span>
                                <span className="text-[10px] font-semibold tabular-nums text-[var(--color-text-subtle)]">
                                  {formatListTime(row.endTime)}
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-1 items-center gap-2 py-3 pl-3 pr-2 sm:gap-3 sm:py-3.5 sm:pl-4 sm:pr-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <p className="font-semibold leading-snug text-[var(--color-text)]">
                                      {displayBookedCustomerName(row)}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <AppointmentSourceBadge source={row.source} />
                                      <span
                                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(row.displayStatus)}`}
                                      >
                                        {row.displayStatus}
                                      </span>
                                    </div>
                                  </div>
                                  {row.bookingFlowQa && row.bookingFlowQa.length > 0 ? (
                                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[var(--color-text-muted)]">
                                      <span className="font-semibold text-[var(--color-text-muted)]">
                                        {row.bookingFlowQa[0].question}
                                      </span>
                                      <span className="text-[var(--color-text-subtle)]"> · </span>
                                      <span>{row.bookingFlowQa[0].answer}</span>
                                      {row.bookingFlowQa.length > 1 ? (
                                        <span className="text-[var(--color-text-subtle)]"> (+{row.bookingFlowQa.length - 1} more)</span>
                                      ) : null}
                                    </p>
                                  ) : null}
                                </div>
                                <div
                                  className="flex shrink-0 items-center pr-1 sm:pr-2"
                                  aria-hidden
                                >
                                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-text-subtle)] transition group-hover:border-[var(--color-border-hover)] group-hover:bg-[var(--color-bg)] group-hover:text-[var(--color-text-muted)]">
                                    <ListDetailsChevron className="shrink-0" />
                                  </span>
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {openDateKey && typeof document !== "undefined"
        ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] p-4"
          onClick={() => setOpenDateKey(null)}
          role="presentation"
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--color-bg)] p-4 shadow-2xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Booked appointment details"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Booked details
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[var(--color-text)]">
                  {new Date(openDateKey).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {modalRows.length} booking{modalRows.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenDateKey(null)}
                aria-label="Close modal"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-raised)]"
              >
                <span aria-hidden className="text-base leading-none">
                  ×
                </span>
              </button>
            </div>

            {modalRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-4 text-sm text-[var(--color-text-muted)]">
                No bookings on this date.
              </div>
            ) : (
              <div className="space-y-2">
                {modalRows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[var(--color-text)]">{displayBookedCustomerName(row)}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <AppointmentSourceBadge source={row.source} />
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(row.displayStatus)}`}
                        >
                          {row.displayStatus}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{formatAppointmentSlot(row.startTime, row.endTime)}</p>
                    {row.customerEmail ? (
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{row.customerEmail}</p>
                    ) : null}
                    {row.bookingFlowQa && row.bookingFlowQa.length > 0 ? (
                      <div className="mt-3 border-t border-[var(--color-border-muted)] pt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                          Booking flow
                        </p>
                        <dl className="mt-2 space-y-2.5">
                          {row.bookingFlowQa.map((qa, i) => (
                            <div key={i}>
                              <dt className="text-xs font-semibold leading-snug text-[var(--color-text)]">{qa.question}</dt>
                              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-[var(--color-text)]">
                                {qa.answer}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ) : null}
                    {crmWebhookConfigured && bookingSourceSupportsCrmSync(row.source) ? (
                      <div className="mt-3 border-t border-[var(--color-border-muted)] pt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                          CRM sync
                        </p>
                        <BookedCrmSyncForm
                          appointmentId={row.id}
                          crmSyncStatus={row.crmSyncStatus}
                          crmSyncError={row.crmSyncError}
                          crmSyncAttempts={row.crmSyncAttempts}
                          action={retryCrmSync}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
          ,
          document.body,
        )
        : null}
    </Panel>
  );
}

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <div className="mt-1 space-y-1">
        {payload.map((entry) => (
          <p key={`${entry.name}-${entry.value}`} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color ?? "#94a3b8" }}
            />
            <span className="font-medium text-[var(--color-text)]">{entry.name}:</span>
            <span className="font-semibold text-[var(--color-text)]">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function AppointmentsTabs({
  bookedAppointments,
  calendarProviders,
  providerLoad,
  calendarRouteOptions: _calendarRouteOptions,
  retryCalendarSync: _retryCalendarSync,
  retryCrmSync,
  crmWebhookConfigured,
  appointmentAnalytics,
}: AppointmentsTabsProps) {
  void _calendarRouteOptions;
  void _retryCalendarSync;
  const [activeTab, setActiveTab] = useState<TabKey>("integrations");

  const trendHasActivity = useMemo(
    () => appointmentAnalytics.trend.some((d) => d.recorded > 0 || d.synced > 0),
    [appointmentAnalytics.trend],
  );
  const showTrendPlaceholder =
    !trendHasActivity && appointmentAnalytics.totalLast30Days === 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "booked" ? (
        <BookedAppointmentsPanel
          upcoming={bookedAppointments.upcoming}
          recentPast={bookedAppointments.recentPast}
          crmWebhookConfigured={crmWebhookConfigured}
          retryCrmSync={retryCrmSync}
        />
      ) : null}

      {activeTab === "integrations" ? (
        <div className="space-y-4">
          <CalendarServiceManager providers={calendarProviders} />
          <Panel
            title="Requests by Provider"
            subtitle="Incoming scheduling load by connected provider"
          >
            {providerLoad.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                No provider load data yet.
              </div>
            ) : (
              <div className="space-y-3 text-sm text-[var(--color-text)]">
                {providerLoad.map((item) => (
                  <div
                    key={item.provider}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3"
                  >
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{item.provider}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{item.note}</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)]">
                      {item.requests}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Last 30 days</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">
                {appointmentAnalytics.totalLast30Days}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Bookings recorded</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">On calendar</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-success)]">
                {appointmentAnalytics.postedToCalendarLast30Days}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Synced or has external event</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Not on calendar</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-warning)]">
                {appointmentAnalytics.awaitingCalendarLast30Days}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Pending post or sync issue</p>
            </div>
          </div>

          <Panel
            title="Bookings trend"
            subtitle="Last 7 days (UTC): new bookings recorded vs posted to a connected calendar that day"
          >
            {showTrendPlaceholder ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                No bookings yet. When guests book through your chatbot, daily counts will appear in this chart.
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={appointmentAnalytics.trend}
                      margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                      <XAxis dataKey="dayLabel" tick={{ fill: "#475569", fontSize: 11 }} />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        width={36}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="recorded"
                        name="Recorded"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#0284c7" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="synced"
                        name="On calendar"
                        stroke="#059669"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#059669" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Panel>
        </div>
      ) : null}
    </section>
  );
}

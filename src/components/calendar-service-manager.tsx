"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";

type CalendarProvider = {
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

type ProviderFilter = "all" | "connected" | "not_connected";

const filters: Array<{ id: ProviderFilter; label: string }> = [
  { id: "all", label: "All Providers" },
  { id: "connected", label: "Connected" },
  { id: "not_connected", label: "Needs Connection" },
];

export function CalendarServiceManager({
  providers,
}: {
  providers: CalendarProvider[];
}) {
  const [activeFilter, setActiveFilter] = useState<ProviderFilter>("all");
  const [collapsed, setCollapsed] = useState(false);

  const connectedCount = useMemo(
    () => providers.filter((provider) => provider.status === "Connected").length,
    [providers],
  );

  const filteredProviders = useMemo(() => {
    if (activeFilter === "connected") {
      return providers.filter((provider) => provider.status === "Connected");
    }

    if (activeFilter === "not_connected") {
      return providers.filter((provider) => provider.status !== "Connected");
    }

    return providers;
  }, [activeFilter, providers]);

  return (
    <section className="vr-app-panel overflow-hidden p-0">
      <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-4 lg:px-5 ${collapsed ? "" : "border-b border-[var(--color-border)]"}`}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Calendar connections</h3>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${connectedCount > 0 ? "vr-app-status-success" : "vr-app-status-warning"}`}>
              <span className={`size-1.5 rounded-full ${connectedCount > 0 ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]"}`} aria-hidden />
              {connectedCount > 0 ? `${connectedCount} connected` : "Connection needed"}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Availability checks and new bookings use these calendars.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="hidden text-[11px] text-[var(--color-text-muted)] sm:inline">
            {providers.length - connectedCount} need attention
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
          >
            {collapsed ? "Show providers" : "Hide providers"}
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 transition ${collapsed ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="p-4 lg:px-5">
          {providers.length > 3 ? <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                      : "bg-[var(--color-raised)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div> : null}

          {filteredProviders.length === 0 ? (
            <div className="vr-app-empty-state px-4 py-6 text-center text-sm">
              No providers match this filter.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredProviders.map((provider: CalendarProvider) => {
                const connected = provider.status === "Connected";
                return (
                  <div
                    key={provider.name}
                    className="flex min-w-0 flex-col justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-hover)] hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                          {provider.logoUrl ? (
                            <Image
                              src={provider.logoUrl}
                              alt={`${provider.name} logo`}
                              width={24}
                              height={24}
                              unoptimized
                              className="size-6 object-contain"
                            />
                          ) : (
                            <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                              No logo
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {provider.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                            {connected ? "Connected and ready for bookings" : provider.syncScope}
                          </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border-muted)] pt-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          connected ? "vr-app-status-success" : "vr-app-status-muted"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            connected ? "bg-[var(--color-success)]" : "bg-[var(--color-text-subtle)]"
                          }`}
                        />
                        {provider.status}
                      </span>
                      <Link
                        href={provider.connectHref}
                        className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        connected
                          ? "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-raised)]"
                          : "vr-btn-primary"
                      }`}
                      >
                        {connected ? "Manage" : "Connect"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

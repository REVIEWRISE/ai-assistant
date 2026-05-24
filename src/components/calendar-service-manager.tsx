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
  const [collapsed, setCollapsed] = useState(true);

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
    <section className="vr-app-panel p-4 lg:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text)]">
            Calendar Provider Integrations
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Connect calendar providers before AI can check availability and book appointments.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="inline-flex rounded-full vr-app-status-success px-3 py-1.5 font-semibold">
            Connected: {connectedCount}
          </span>
          <span className="inline-flex rounded-full vr-app-status-muted px-3 py-1.5 font-semibold">
            Not connected: {providers.length - connectedCount}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex items-center gap-1 rounded-full vr-btn-primary px-3 py-1.5 font-semibold"
          >
            {collapsed ? "Expand" : "Collapse"}
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
        <>
          <div className="mb-4 flex flex-wrap gap-2">
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
          </div>

          {filteredProviders.length === 0 ? (
            <div className="vr-app-empty-state px-4 py-6 text-center text-sm">
              No providers match this filter.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProviders.map((provider: CalendarProvider) => {
                const connected = provider.status === "Connected";
                return (
                  <div
                    key={provider.name}
                    className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm ${provider.tone}`}
                  >
                    <div className="absolute right-0 top-0 h-20 w-24 bg-[color-mix(in_srgb,var(--color-bg)_30%,transparent)] blur-2xl" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                          {provider.logoUrl ? (
                            <Image
                              src={provider.logoUrl}
                              alt={`${provider.name} logo`}
                              width={32}
                              height={32}
                              unoptimized
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                              No logo
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {provider.name}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                            {provider.type}
                          </p>
                        </div>
                      </div>
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
                    </div>
                    <div className="mt-4 space-y-2 text-xs text-[var(--color-text)]">
                      <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
                        <p className="font-semibold">Last Activity</p>
                        <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                          {provider.lastSync}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={provider.connectHref}
                      className={`mt-4 inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        connected
                          ? "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                          : "vr-btn-primary"
                      }`}
                    >
                      {connected ? "Manage Connection" : "Connect Provider"}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

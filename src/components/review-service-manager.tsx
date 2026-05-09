"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPortal } from "react-dom";
import Image from "next/image";

type ReviewService = {
  id: string;
  name: string;
  logoUrl?: string;
  type: string;
  status: string;
  left: string;
  lastSync: string;
  autoReply: string;
  syncable: boolean;
  requiredFields: Array<{
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
    secret: boolean;
  }>;
  existingConnectionDetails: Record<string, string>;
  tone: string;
};

type ServiceFilter = "all" | "connected" | "not_connected";

const filters: Array<{ id: ServiceFilter; label: string }> = [
  { id: "all", label: "All Services" },
  { id: "connected", label: "Connected" },
  { id: "not_connected", label: "Needs Connection" },
];

function SaveConnectionButton({ connected }: { connected: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : connected ? "Save Connection" : "Connect Provider"}
    </button>
  );
}

export function ReviewServiceManager({
  services,
  onConnectProvider,
  onSyncProvider,
}: {
  services: ReviewService[];
  onConnectProvider: (formData: FormData) => void | Promise<void>;
  onSyncProvider: (formData: FormData) => void | Promise<void>;
}) {
  const [activeFilter, setActiveFilter] = useState<ServiceFilter>("all");
  const [collapsed, setCollapsed] = useState(true);
  const [activeConnectionService, setActiveConnectionService] = useState<ReviewService | null>(null);
  const [connectionDraft, setConnectionDraft] = useState<Record<string, string>>({});

  const connectedCount = useMemo(
    () => services.filter((service) => service.status === "Connected").length,
    [services],
  );

  const filteredServices = useMemo(() => {
    if (activeFilter === "connected") {
      return services.filter((service) => service.status === "Connected");
    }

    if (activeFilter === "not_connected") {
      return services.filter((service) => service.status !== "Connected");
    }

    return services;
  }, [activeFilter, services]);

  function openConnectionModal(service: ReviewService) {
    setConnectionDraft(service.existingConnectionDetails ?? {});
    setActiveConnectionService(service);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Review Service Integrations</h3>
          <p className="mt-1 text-sm text-slate-600">
            Connect a platform before pulling reviews and allowing AI responses.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-700">
            Connected: {connectedCount}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
            Not connected: {services.length - connectedCount}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 font-semibold text-white transition hover:bg-slate-700"
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
                    active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredServices.length === 0 ? (
              <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">No review providers found.</p>
                <p className="mt-1 text-xs text-amber-800">
                  Add at least one enabled provider in the providers database (type: review) to show it here.
                </p>
              </div>
            ) : (
              filteredServices.map((service) => {
                const connected = service.status === "Connected";
                return (
                  <div key={service.name} className={`rounded-2xl border p-4 shadow-sm ${service.tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        {service.logoUrl ? (
                          <Image
                            src={service.logoUrl}
                            alt={`${service.name} logo`}
                            width={32}
                            height={32}
                            unoptimized
                            className="h-8 w-8 shrink-0 rounded-md border border-white/70 bg-white object-contain p-1"
                          />
                        ) : (
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/70 bg-white/80 text-xs font-bold text-slate-700">
                            {service.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{service.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.08em] opacity-80">{service.type}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold">
                        {service.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs">
                      <p className="font-medium">{service.left}</p>
                      <p className="opacity-80">{service.lastSync}</p>
                      <p className="opacity-80">{service.autoReply}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openConnectionModal(service)}
                      className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        connected ? "bg-white/80 text-slate-700 hover:bg-white" : "bg-slate-900 text-white hover:bg-slate-700"
                      }`}
                    >
                      {connected ? "Manage Connection" : "Connect Service"}
                    </button>
                    {service.syncable ? (
                      <form action={onSyncProvider} className="mt-2">
                        <input type="hidden" name="provider_id" value={service.id} />
                        <button
                          type="submit"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Sync now
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : null}

      {typeof document !== "undefined" && activeConnectionService
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                      Review Integration
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-slate-900">
                      {activeConnectionService.name}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveConnectionService(null)}
                    className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>
                </div>
                <form action={onConnectProvider} className="space-y-4 px-5 py-4">
                  <input type="hidden" name="provider_id" value={activeConnectionService.id} />
                  <input type="hidden" name="connection_details" value={JSON.stringify(connectionDraft)} />
                  {activeConnectionService.requiredFields.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600">
                        Provide the required information to complete this connection.
                      </p>
                      {activeConnectionService.requiredFields.map((field) => (
                        <label key={field.key} className="block text-xs font-semibold text-slate-700">
                          {field.label}
                          <input
                            type={field.secret ? "password" : "text"}
                            value={connectionDraft[field.key] ?? ""}
                            onChange={(e) =>
                              setConnectionDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            placeholder={field.placeholder}
                            required={field.required}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal"
                          />
                          {field.secret ? (
                            <p className="mt-1 text-[11px] font-normal text-slate-500">
                              Stored as connection secret for this provider.
                            </p>
                          ) : null}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      No additional information is required for this provider. Click connect to continue.
                    </div>
                  )}
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveConnectionService(null)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <SaveConnectionButton connected={activeConnectionService.status === "Connected"} />
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

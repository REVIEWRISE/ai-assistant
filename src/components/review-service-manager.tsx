"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { searchYelpBusinessesAction, type YelpBusinessSearchResult } from "@/app/(protected)/reviews/actions";

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
  oauthConnectHref?: string;
  integration?: "google_business_profile" | "yelp_fusion" | "generic_http_reviews" | null;
  connectLabel?: string;
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
      className="rounded-lg vr-btn-primary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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
  const [collapsed, setCollapsed] = useState(false);
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

  // Yelp business search states
  const [yelpSearchTerm, setYelpSearchTerm] = useState("");
  const [yelpSearchLoc, setYelpSearchLoc] = useState("");
  const [yelpSearchResults, setYelpSearchResults] = useState<YelpBusinessSearchResult[]>([]);
  const [yelpSearching, setYelpSearching] = useState(false);
  const [yelpSearchError, setYelpSearchError] = useState("");
  const [selectedYelpBusiness, setSelectedYelpBusiness] = useState<YelpBusinessSearchResult | null>(null);

  async function handleYelpSearch() {
    if (!yelpSearchTerm.trim() || !yelpSearchLoc.trim()) {
      setYelpSearchError("Please enter both a business name and location.");
      return;
    }
    setYelpSearching(true);
    setYelpSearchError("");
    setYelpSearchResults([]);
    try {
      const result = await searchYelpBusinessesAction(yelpSearchTerm, yelpSearchLoc);
      if (result.ok && result.businesses) {
        setYelpSearchResults(result.businesses);
        if (result.businesses.length === 0) {
          setYelpSearchError("No businesses found matching your query.");
        }
      } else {
        setYelpSearchError(result.error || "Failed to search Yelp businesses.");
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setYelpSearchError(err.message || "An unexpected error occurred.");
    } finally {
      setYelpSearching(false);
    }
  }

  function openConnectionModal(service: ReviewService) {
    setConnectionDraft(service.existingConnectionDetails ?? {});
    setActiveConnectionService(service);
    setYelpSearchTerm("");
    setYelpSearchLoc("");
    setYelpSearchResults([]);
    setYelpSearching(false);
    setYelpSearchError("");
    setSelectedYelpBusiness(null);
  }

  return (
    <section className="vr-app-panel p-4 lg:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text)]">Review Service Integrations</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Connect a platform before pulling reviews and allowing AI responses.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="inline-flex rounded-full vr-app-status-success px-3 py-1.5 font-semibold">
            Connected: {connectedCount}
          </span>
          <span className="inline-flex rounded-full vr-app-status-muted px-3 py-1.5 font-semibold">
            Not connected: {services.length - connectedCount}
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

      {collapsed && services.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {services.map((service) => (
            <span
              key={service.id}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                service.status === "Connected" ? "vr-app-status-success" : "vr-app-status-muted"
              }`}
            >
              {service.name}
              <span className="opacity-80">{service.status}</span>
            </span>
          ))}
        </div>
      ) : null}

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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredServices.length === 0 ? (
              <div className="vr-app-alert vr-app-alert-warning sm:col-span-2 xl:col-span-3">
                <p className="font-semibold">No review providers found.</p>
                <p className="mt-1 text-xs opacity-90">
                  In Platform → Providers, add a provider with type <strong>Review</strong> and status{" "}
                  <strong>Enabled</strong>. Only those appear here.
                </p>
              </div>
            ) : (
              filteredServices.map((service) => {
                const connected = service.status === "Connected";
                return (
                  <div key={service.id} className={`rounded-2xl border p-4 shadow-sm ${service.tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        {service.logoUrl ? (
                          <Image
                            src={service.logoUrl}
                            alt={`${service.name} logo`}
                            width={32}
                            height={32}
                            unoptimized
                            className="h-8 w-8 shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] object-contain p-1"
                          />
                        ) : (
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-bold text-[var(--color-text-muted)]">
                            {service.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--color-text)]">{service.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                            {service.type}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          connected ? "vr-app-status-success" : "vr-app-status-muted"
                        }`}
                      >
                        {service.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-[var(--color-text)]">
                      <p className="font-medium">{service.left}</p>
                      <p className="text-[var(--color-text-muted)]">{service.lastSync}</p>
                      <p className="text-[var(--color-text-muted)]">{service.autoReply}</p>
                    </div>
                    {service.oauthConnectHref ? (
                      <Link
                        href={service.oauthConnectHref}
                        className={`mt-3 inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          connected
                            ? "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                            : "vr-btn-primary"
                        }`}
                      >
                        {service.connectLabel ?? (connected ? "Reconnect with Google" : "Connect with Google")}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openConnectionModal(service)}
                        className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          connected
                            ? "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                            : "vr-btn-primary"
                        }`}
                      >
                        {service.connectLabel ?? (connected ? "Manage Connection" : "Connect Service")}
                      </button>
                    )}
                    {service.syncable ? (
                      <form action={onSyncProvider} className="mt-2">
                        <input type="hidden" name="provider_id" value={service.id} />
                        <button
                          type="submit"
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] p-4">
              <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary-h)]">
                      Review Integration
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-[var(--color-text)]">
                      {activeConnectionService.name}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveConnectionService(null)}
                    className="rounded-lg p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)]"
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
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {activeConnectionService.integration === "yelp_fusion"
                          ? "Use your Yelp Fusion API key and the business alias from the Yelp listing URL. Fusion returns up to 3 review excerpts unless Private Reviews partner access is enabled on the provider."
                          : "Provide the required information to complete this connection."}
                      </p>
                      {activeConnectionService.integration === "yelp_fusion" && (
                        <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                          <h5 className="text-xs font-bold text-[var(--color-text)] mb-2">Search Yelp to Find Your Business</h5>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Business Name (e.g. Sisterita)"
                              value={yelpSearchTerm}
                              onChange={(e) => setYelpSearchTerm(e.target.value)}
                              className="w-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-xs text-[var(--color-text)]"
                            />
                            <input
                              type="text"
                              placeholder="City, State or Zip"
                              value={yelpSearchLoc}
                              onChange={(e) => setYelpSearchLoc(e.target.value)}
                              className="w-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-xs text-[var(--color-text)]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleYelpSearch}
                            disabled={yelpSearching}
                            className="mt-2 w-full rounded-lg bg-[var(--color-primary)] text-white py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                          >
                            {yelpSearching ? "Searching Yelp..." : "Search Yelp"}
                          </button>
                          {yelpSearchError && (
                            <p className="mt-2 text-xs text-red-500 font-medium">{yelpSearchError}</p>
                          )}
                          {yelpSearchResults.length > 0 && (
                            <div className="mt-2 max-h-36 overflow-y-auto border-t border-[var(--color-border)] pt-2 space-y-1">
                              {yelpSearchResults.map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedYelpBusiness(b);
                                    setConnectionDraft((prev) => ({ ...prev, business_id: b.alias }));
                                  }}
                                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition hover:bg-[var(--color-border-muted)] ${
                                    selectedYelpBusiness?.id === b.id ? "bg-[var(--color-border-muted)] font-semibold" : ""
                                  }`}
                                >
                                  <div>
                                    <div className="text-[var(--color-text)]">{b.name}</div>
                                    <div className="text-[10px] text-[var(--color-text-muted)]">{b.location}</div>
                                  </div>
                                  <span className="text-[10px] bg-[var(--color-bg)] px-1.5 py-0.5 rounded text-[var(--color-text-muted)]">
                                    Select
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {activeConnectionService.requiredFields.map((field) => (
                        <label key={field.key} className="block text-xs font-semibold text-[var(--color-text)]">
                          {field.label}
                          <input
                            type={field.secret ? "password" : "text"}
                            value={connectionDraft[field.key] ?? ""}
                            onChange={(e) =>
                              setConnectionDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            placeholder={field.placeholder}
                            required={field.required}
                            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm font-normal text-[var(--color-text)]"
                          />
                          {field.secret ? (
                            <p className="mt-1 text-[11px] font-normal text-[var(--color-text-muted)]">
                              Stored as connection secret for this provider.
                            </p>
                          ) : null}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                      No additional information is required for this provider. Click connect to continue.
                    </div>
                  )}
                  <div className="flex justify-end gap-2 border-t border-[var(--color-border-muted)] pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveConnectionService(null)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
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

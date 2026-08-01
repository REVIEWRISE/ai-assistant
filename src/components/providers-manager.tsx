"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CustomSelect } from "@/components/custom-select";
import { SearchableSelect } from "@/components/searchable-select";
import { TableRowActionsMenu } from "@/components/table-row-actions-menu";
import {
  DataTable,
  DataTableBody,
  DataTableEmptyState,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/data-table";

type ProviderRow = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  apiUrl?: string | null;
  logoUrl?: string | null;
  status: string;
  config?: unknown;
  createdAt: string | Date;
};

type ProvidersManagerProps = {
  providers: ProviderRow[];
  onCreateProvider: (formData: FormData) => void | Promise<void>;
  onUpdateProvider: (formData: FormData) => void | Promise<void>;
  onDeleteProvider: (formData: FormData) => void | Promise<void>;
};

type ModalState =
  | { type: "create" }
  | { type: "edit"; provider: ProviderRow }
  | { type: "delete"; provider: ProviderRow }
  | null;

const typeOptions = [
  { value: "review", label: "Review" },
  { value: "calendar", label: "Appointment (Calendar)" },
  { value: "lead", label: "Lead Capture" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

type ConfigEntry = {
  id: string;
  key: string;
  value: string;
  showValue?: boolean;
};

type ConnectionRequiredFieldDraft = {
  id: string;
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  secret: boolean;
};

export function ProvidersManager({
  providers,
  onCreateProvider,
  onUpdateProvider,
  onDeleteProvider,
}: ProvidersManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [configEntries, setConfigEntries] = useState<ConfigEntry[]>([]);
  const [connectionRequiredFields, setConnectionRequiredFields] = useState<
    ConnectionRequiredFieldDraft[]
  >([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const configId = useRef(0);
  const configInputRef = useRef<HTMLInputElement | null>(null);

  const statusCounts = useMemo(() => {
    return {
      all: providers.length,
      enabled: providers.filter((provider) => provider.status === "enabled").length,
      disabled: providers.filter((provider) => provider.status === "disabled").length,
    };
  }, [providers]);

  const typeNames = useMemo(() => {
    return Array.from(new Set(providers.map((provider) => provider.type))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return providers
      .filter((provider) => {
        const matchesQuery =
          !normalizedQuery ||
          provider.name.toLowerCase().includes(normalizedQuery) ||
          provider.type.toLowerCase().includes(normalizedQuery) ||
          (provider.description ?? "").toLowerCase().includes(normalizedQuery) ||
          (provider.apiUrl ?? "").toLowerCase().includes(normalizedQuery);
        const matchesStatus =
          statusFilter === "all" || provider.status.toLowerCase() === statusFilter;
        const matchesType = typeFilter === "all" || provider.type === typeFilter;
        return matchesQuery && matchesStatus && matchesType;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [providers, query, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProviders.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedProviders = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredProviders.slice(start, start + perPage);
  }, [filteredProviders, currentPage, perPage]);

  const statusFilterOptions = [
    { value: "all", label: `All · ${statusCounts.all}` },
    { value: "enabled", label: `Enabled · ${statusCounts.enabled}` },
    { value: "disabled", label: `Disabled · ${statusCounts.disabled}` },
  ];

  const typeFilterOptions = [
    { value: "all", label: "All types" },
    ...typeNames.map((type) => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1).replace("_", " "),
    })),
  ];

  const createConfigEntry = (entry?: Partial<ConfigEntry>): ConfigEntry => ({
    id: String(configId.current++),
    key: "",
    value: "",
    showValue: false,
    ...entry,
  });

  const createConnectionFieldEntry = (
    entry?: Partial<ConnectionRequiredFieldDraft>,
  ): ConnectionRequiredFieldDraft => ({
    id: String(configId.current++),
    key: "",
    label: "",
    placeholder: "",
    required: true,
    secret: false,
    ...entry,
  });

  const initializeFromProvider = (provider: ProviderRow) => {
    const config = provider.config;
    if (!config || typeof config !== "object") {
      setConfigEntries([createConfigEntry()]);
      setConnectionRequiredFields([]);
      setLogoPreview(null);
      setLogoFileName(null);
      setIsSubmitting(false);
      return;
    }
    const configRecord = config as Record<string, unknown>;
    const rawRequiredFields = Array.isArray(configRecord.connection_required_fields)
      ? configRecord.connection_required_fields
      : [];
    const nextRequiredFields = rawRequiredFields
      .map((entry): ConnectionRequiredFieldDraft | null => {
        if (typeof entry === "string") {
          const key = entry.trim();
          if (!key) return null;
          return createConnectionFieldEntry({
            key,
            label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            placeholder: `Enter ${key.replace(/_/g, " ")}`,
            required: true,
            secret: false,
          });
        }
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
        const rec = entry as Record<string, unknown>;
        const key = String(rec.key ?? "").trim();
        if (!key) return null;
        return createConnectionFieldEntry({
          key,
          label: String(rec.label ?? "").trim(),
          placeholder: String(rec.placeholder ?? "").trim(),
          required: rec.required !== false,
          secret: rec.secret === true,
        });
      })
      .filter((x): x is ConnectionRequiredFieldDraft => x != null)
      .slice(0, 12);
    const entries = Object.entries(configRecord)
      .filter(([key]) => key !== "connection_required_fields")
      .map(([key, value]) => {
      const valueString =
        typeof value === "string"
          ? value
          : typeof value === "number" || typeof value === "boolean"
            ? String(value)
            : value
              ? JSON.stringify(value)
              : "";
      return createConfigEntry({ key, value: valueString, showValue: false });
      });
    setConfigEntries(entries.length ? entries : [createConfigEntry()]);
    setConnectionRequiredFields(nextRequiredFields);
    setLogoPreview(null);
    setLogoFileName(null);
    setIsSubmitting(false);
  };

  const openCreateModal = () => {
    setConfigEntries([createConfigEntry()]);
    setConnectionRequiredFields([]);
    setLogoPreview(null);
    setLogoFileName(null);
    setIsSubmitting(false);
    setModal({ type: "create" });
  };

  const openEditModal = (provider: ProviderRow) => {
    initializeFromProvider(provider);
    setModal({ type: "edit", provider });
  };

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const buildConfigPayload = useCallback((
    entries: ConfigEntry[],
    requiredFields: ConnectionRequiredFieldDraft[],
  ) => {
    const payload: Record<string, unknown> = {};
    entries.forEach((entry) => {
      const key = entry.key.trim();
      if (!key) {
        return;
      }
      const rawValue = entry.value.trim();
      payload[key] = rawValue;
    });
    const normalizedRequiredFields = requiredFields
      .map((field) => ({
        key: field.key.trim(),
        label: field.label.trim(),
        placeholder: field.placeholder.trim(),
        required: field.required,
        secret: field.secret,
      }))
      .filter((field) => field.key)
      .slice(0, 12);
    if (normalizedRequiredFields.length > 0) {
      payload.connection_required_fields = normalizedRequiredFields;
    }
    return payload;
  }, []);

  const configJson = useMemo(
    () => JSON.stringify(buildConfigPayload(configEntries, connectionRequiredFields)),
    [buildConfigPayload, configEntries, connectionRequiredFields],
  );

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between lg:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Directory
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Provider catalog</h2>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
              {filteredProviders.length}
              {filteredProviders.length !== providers.length ? ` of ${providers.length}` : ""} shown
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Configure external systems used across the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
        >
          Add provider
        </button>
      </div>

      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 lg:px-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <label className="block">
            <span className="sr-only">Search providers</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, type, description, or API URL…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
            />
          </label>
          <CustomSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={statusFilterOptions}
            aria-label="Filter by status"
            className="mt-0"
            triggerClassName="rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold"
          />
          <CustomSelect
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
            options={typeFilterOptions}
            aria-label="Filter by type"
            className="mt-0"
            triggerClassName="rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold"
          />
        </div>
      </div>

      <div className="p-4 lg:p-5">
      <DataTable>
        <DataTableHeader className="hidden grid-cols-[64px_minmax(180px,1.2fr)_110px_minmax(140px,1fr)_100px_100px_100px] gap-2 lg:grid lg:px-5">
          <div>Logo</div>
          <div>Provider</div>
          <div>Type</div>
          <div>API URL</div>
          <div>Status</div>
          <div>Config</div>
          <div className="text-right">Actions</div>
        </DataTableHeader>
        <DataTableBody>
          {pagedProviders.map((provider) => (
            <DataTableRow
              key={provider.id}
              className="group gap-4 py-4 hover:bg-[var(--color-bg)] lg:grid-cols-[64px_minmax(180px,1.2fr)_110px_minmax(140px,1fr)_100px_100px_100px] lg:items-center lg:px-5 lg:py-3.5"
            >
              <div className="flex items-center">
                {provider.logoUrl ? (
                  <Image
                    src={provider.logoUrl}
                    alt={`${provider.name} logo`}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] object-contain p-1"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] text-[10px] font-semibold text-[var(--color-text-subtle)]">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text)]">{provider.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                  {provider.description ?? `Added ${new Date(provider.createdAt).toLocaleDateString()}`}
                </p>
              </div>
              <div>
                <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)]">
                  {provider.type.charAt(0).toUpperCase() + provider.type.slice(1).replace("_", " ")}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-[var(--color-text-muted)]" title={provider.apiUrl ?? ""}>
                  {provider.apiUrl ?? "—"}
                </p>
              </div>
              <div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    provider.status === "enabled"
                      ? "vr-app-status-success"
                      : "vr-app-status-warning"
                  }`}
                >
                  {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                </span>
              </div>
              <div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    provider.config
                      ? "vr-app-status-success"
                      : "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {provider.config ? "Configured" : "Empty"}
                </span>
              </div>
              <div className="flex items-center lg:justify-end">
                <TableRowActionsMenu
                  label={provider.name}
                  isOpen={openMenuId === provider.id}
                  onToggle={() =>
                    setOpenMenuId((current) =>
                      current === provider.id ? null : provider.id,
                    )
                  }
                  onClose={() => setOpenMenuId(null)}
                  actions={[
                    {
                      id: "edit",
                      label: "Edit provider",
                      description: "Update connection settings",
                      onClick: () => openEditModal(provider),
                    },
                    {
                      id: "delete",
                      label: "Delete provider",
                      description: "Permanently remove this integration",
                      danger: true,
                      onClick: () => setModal({ type: "delete", provider }),
                    },
                  ]}
                />
              </div>
            </DataTableRow>
          ))}
          {filteredProviders.length === 0 ? (
            <DataTableEmptyState
              title={providers.length === 0 ? "No providers yet" : "No matching providers"}
              description={
                providers.length === 0
                  ? "Create the first provider to configure an external service."
                  : "Try a different search, status, or type filter."
              }
              action={
                providers.length === 0 ? (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)]"
                  >
                    Add provider
                  </button>
                ) : null
              }
            />
          ) : null}
        </DataTableBody>
        <DataTablePagination
          totalItems={filteredProviders.length}
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          itemLabel="providers"
        />
      </DataTable>
      </div>

      {modal && modal.type !== "delete"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm">
              <div className="max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-6 py-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
                      Platform settings
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">
                      {modal.type === "create" ? "Add a provider" : "Edit provider"}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Manage system provider configuration and connection fields.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-lg p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)]"
                    aria-label="Close"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>
                </div>

                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-6 pb-6">
                    <form
                      action={modal.type === "create" ? onCreateProvider : onUpdateProvider}
                      className="mt-4 space-y-4"
                      onSubmit={() => {
                        if (configInputRef.current) {
                          configInputRef.current.value = JSON.stringify(
                            buildConfigPayload(configEntries, connectionRequiredFields),
                          );
                        }
                        setIsSubmitting(true);
                      }}
                    >
                      {modal.type === "edit" ? (
                        <input type="hidden" name="id" value={modal.provider.id} />
                      ) : null}
                    <input
                      ref={configInputRef}
                      type="hidden"
                      name="config_json"
                      value={configJson}
                    />
                    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                      <div className="space-y-4">
                        <label className="block text-sm text-[var(--color-text)]">
                          Provider name
                          <input
                            type="text"
                            name="name"
                            defaultValue={modal.type === "edit" ? modal.provider.name : ""}
                            placeholder="e.g. Google"
                            className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                          />
                        </label>
                        <label className="block text-sm text-[var(--color-text)]">
                          Provider logo
                          <input
                            type="file"
                            name="logo"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) {
                                setLogoPreview(null);
                                setLogoFileName(null);
                                return;
                              }
                              if (logoPreview) {
                                URL.revokeObjectURL(logoPreview);
                              }
                              setLogoPreview(URL.createObjectURL(file));
                              setLogoFileName(file.name);
                            }}
                            className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-muted)] file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--color-raised)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--color-text)] hover:file:bg-[var(--color-raised)]"
                          />
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            Upload PNG, JPG, or SVG. Uploading replaces the current logo.
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1">
                              {logoPreview ||
                              (modal.type === "edit" && modal.provider.logoUrl) ? (
                                <Image
                                  src={
                                    logoPreview ??
                                    (modal.type === "edit" ? modal.provider.logoUrl ?? "" : "")
                                  }
                                  alt="Logo preview"
                                  width={40}
                                  height={40}
                                  unoptimized
                                  className="h-10 w-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] object-contain p-1"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-semibold text-[var(--color-text-subtle)]">
                                  No logo
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-semibold text-[var(--color-text)]">
                                  {logoFileName
                                    ? "New upload"
                                    : modal.type === "edit" && modal.provider.logoUrl
                                      ? "Current logo"
                                      : "No logo"}
                                </p>
                                <p className="text-[11px] text-[var(--color-text-subtle)]">
                                  {logoFileName ?? "Select a file to preview"}
                                </p>
                              </div>
                            </div>
                            {logoPreview ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (logoPreview) {
                                    URL.revokeObjectURL(logoPreview);
                                  }
                                  setLogoPreview(null);
                                  setLogoFileName(null);
                                }}
                                className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)]"
                              >
                                Clear
                              </button>
                            ) : null}
                          </div>
                        </label>
                        <label className="block text-sm text-[var(--color-text)]">
                          Provider type
                          <div className="mt-1">
                            <SearchableSelect
                              name="type"
                              placeholder="Select type"
                              defaultValue={
                                modal.type === "edit" ? modal.provider.type : "review"
                              }
                              options={typeOptions}
                            />
                          </div>
                        </label>
                        <label className="block text-sm text-[var(--color-text)]">
                          Status
                          <div className="mt-1">
                            <SearchableSelect
                              name="status"
                              placeholder="Select status"
                              defaultValue={
                                modal.type === "edit" ? modal.provider.status : "enabled"
                              }
                              options={statusOptions}
                            />
                          </div>
                        </label>
                        <label className="block text-sm text-[var(--color-text)]">
                          API URL
                          <input
                            type="url"
                            name="api_url"
                            defaultValue={
                              modal.type === "edit" ? modal.provider.apiUrl ?? "" : ""
                            }
                            placeholder="https://api.provider.com"
                            className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                          />
                        </label>
                        <label className="block text-sm text-[var(--color-text)]">
                          Description
                          <input
                            type="text"
                            name="description"
                            defaultValue={
                              modal.type === "edit" ? modal.provider.description ?? "" : ""
                            }
                            placeholder="Optional description"
                            className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                          />
                        </label>
                      </div>
                      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4">
                        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-gradient-to-b from-[var(--color-primary-soft)] to-[var(--color-bg)] p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
                                User Connection Schema
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                                Connection Required Fields
                              </p>
                              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                Used by user-side connect modal (especially for review providers).
                              </p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text)]">
                              <span>{connectionRequiredFields.length} field(s)</span>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setConnectionRequiredFields((prev) => [
                                  ...prev,
                                  createConnectionFieldEntry(),
                                ])
                              }
                              className="rounded-lg border border-[var(--color-primary)] vr-btn-primary px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--color-primary-h)]"
                            >
                              + Add required field
                            </button>
                            <button
                              type="button"
                              onClick={() => setConnectionRequiredFields([])}
                              disabled={connectionRequiredFields.length === 0}
                              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Clear all
                            </button>
                          </div>
                          {connectionRequiredFields.length === 0 ? (
                            <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                              No required fields configured. Users can connect without extra inputs.
                            </div>
                          ) : (
                            <div className="mt-3 space-y-3">
                              {connectionRequiredFields.map((field, index) => (
                                <div
                                  key={field.id}
                                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-sm"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary-h)]">
                                      Required Field {String(index + 1).padStart(2, "0")}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConnectionRequiredFields((prev) =>
                                          prev.filter((x) => x.id !== field.id),
                                        )
                                      }
                                      className="rounded-md border vr-app-status-danger px-2 py-1 text-[11px] font-semibold"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    <label className="text-xs text-[var(--color-text)]">
                                      Key
                                      <input
                                        value={field.key}
                                        onChange={(event) =>
                                          setConnectionRequiredFields((prev) =>
                                            prev.map((x) =>
                                              x.id === field.id
                                                ? { ...x, key: event.target.value }
                                                : x,
                                            ),
                                          )
                                        }
                                        placeholder="api_key"
                                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm"
                                      />
                                    </label>
                                    <label className="text-xs text-[var(--color-text)]">
                                      Label
                                      <input
                                        value={field.label}
                                        onChange={(event) =>
                                          setConnectionRequiredFields((prev) =>
                                            prev.map((x) =>
                                              x.id === field.id
                                                ? { ...x, label: event.target.value }
                                                : x,
                                            ),
                                          )
                                        }
                                        placeholder="API Key"
                                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm"
                                      />
                                    </label>
                                    <label className="text-xs text-[var(--color-text)] sm:col-span-2">
                                      Placeholder
                                      <input
                                        value={field.placeholder}
                                        onChange={(event) =>
                                          setConnectionRequiredFields((prev) =>
                                            prev.map((x) =>
                                              x.id === field.id
                                                ? { ...x, placeholder: event.target.value }
                                                : x,
                                            ),
                                          )
                                        }
                                        placeholder="Paste your API key"
                                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm"
                                      />
                                    </label>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)]">
                                      <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(event) =>
                                          setConnectionRequiredFields((prev) =>
                                            prev.map((x) =>
                                              x.id === field.id
                                                ? { ...x, required: event.target.checked }
                                                : x,
                                            ),
                                          )
                                        }
                                      />
                                      Required
                                    </label>
                                    <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)]">
                                      <input
                                        type="checkbox"
                                        checked={field.secret}
                                        onChange={(event) =>
                                          setConnectionRequiredFields((prev) =>
                                            prev.map((x) =>
                                              x.id === field.id
                                                ? { ...x, secret: event.target.checked }
                                                : x,
                                            ),
                                          )
                                        }
                                      />
                                      Secret (password input)
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-text)]">
                              Provider Configuration
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              Add any key/value pairs needed for this provider.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setConfigEntries((prev) => [
                                ...prev,
                                createConfigEntry(),
                              ])
                            }
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                          >
                            Add field
                          </button>
                        </div>
                        <div className="mt-3 space-y-3">
                          {configEntries.map((entry, index) => (
                            <div
                              key={entry.id}
                              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
                                  Field {String(index + 1).padStart(2, "0")}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfigEntries((prev) =>
                                      prev.length === 1
                                        ? prev.map((item) =>
                                            item.id === entry.id
                                              ? { ...item, key: "", value: "" }
                                              : item,
                                          )
                                        : prev.filter((item) => item.id !== entry.id),
                                    )
                                  }
                                  className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)]"
                                >
                                  {configEntries.length === 1 ? "Reset" : "Remove"}
                                </button>
                              </div>
                              <div className="mt-2 space-y-3">
                                <label className="block text-sm text-[var(--color-text)]">
                                  Key
                                  <input
                                    type="text"
                                    value={entry.key}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      setConfigEntries((prev) =>
                                        prev.map((item) =>
                                          item.id === entry.id
                                            ? { ...item, key: value }
                                            : item,
                                        ),
                                      );
                                    }}
                                    placeholder="client_id"
                                    className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:ring"
                                  />
                                </label>
                              </div>
                              <label className="mt-3 block text-sm text-[var(--color-text)]">
                                Value
                                <div className="relative mt-1">
                                  <input
                                    type="text"
                                    value={entry.value}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      setConfigEntries((prev) =>
                                        prev.map((item) =>
                                          item.id === entry.id
                                            ? { ...item, value }
                                            : item,
                                        ),
                                      );
                                    }}
                                    placeholder="Value"
                                    className={`w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-bg)] px-3 py-2 pr-11 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:ring ${
                                      entry.showValue ? "text-[var(--color-text)]" : "text-transparent caret-[var(--color-text)]"
                                    }`}
                                  />
                                  {!entry.showValue ? (
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-[var(--color-text-subtle)]">
                                      ••••••••••
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfigEntries((prev) =>
                                        prev.map((item) =>
                                          item.id === entry.id
                                            ? { ...item, showValue: !item.showValue }
                                            : item,
                                        ),
                                      )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)]"
                                    aria-label={entry.showValue ? "Hide value" : "Show value"}
                                  >
                                    {entry.showValue ? (
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
                                        <path d="M10 10l4 4" />
                                        <path d="M14 10l-4 4" />
                                      </svg>
                                    ) : (
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
                                        <circle cx="12" cy="12" r="3" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {isSubmitting ? (
                      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                        <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                          Uploading provider…
                        </p>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-raised)]">
                          <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--color-primary)]" />
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModal(null)}
                        disabled={isSubmitting}
                        className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold"
                      >
                        {modal.type === "create" ? "Create Provider" : "Save Changes"}
                      </button>
                    </div>
                    </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={modal?.type === "delete"}
        title="Delete provider"
        description={
          modal?.type === "delete"
            ? `This will permanently remove “${modal.provider.name}”.`
            : ""
        }
        confirmLabel="Delete provider"
        onCancel={() => setModal(null)}
        action={onDeleteProvider}
        hiddenFields={
          modal?.type === "delete" ? [{ name: "id", value: modal.provider.id }] : []
        }
      />
    </section>
  );
}

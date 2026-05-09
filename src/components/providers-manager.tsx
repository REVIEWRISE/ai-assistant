"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";
import { SearchableSelect } from "@/components/searchable-select";

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
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [configEntries, setConfigEntries] = useState<ConfigEntry[]>([]);
  const [connectionRequiredFields, setConnectionRequiredFields] = useState<
    ConnectionRequiredFieldDraft[]
  >([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const configId = useRef(0);
  const configInputRef = useRef<HTMLInputElement | null>(null);

  const sortedProviders = useMemo(
    () => providers.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [providers],
  );

  const totalPages = Math.max(1, Math.ceil(sortedProviders.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedProviders = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return sortedProviders.slice(start, start + perPage);
  }, [sortedProviders, currentPage, perPage]);

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
    <Panel title="Providers" subtitle="Create, edit, and remove system providers">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Configure external systems used across the platform.
        </p>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Add Provider
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[72px_64px_1.1fr_0.9fr_1.1fr_1.1fr_120px_120px_140px] items-center gap-2 bg-[linear-gradient(120deg,#0f172a,#1e293b_55%,#334155)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 md:grid">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            Index
          </div>
          <div>Logo</div>
          <div>Provider</div>
          <div>Type</div>
          <div>Description</div>
          <div>API URL</div>
          <div>Status</div>
          <div>Config</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {pagedProviders.map((provider, index) => (
            <div
              key={provider.id}
              className="group grid items-center gap-2 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50 md:grid-cols-[72px_64px_1.1fr_0.9fr_1.1fr_1.1fr_120px_120px_140px]"
            >
              <div className="text-xs font-semibold text-slate-500 md:text-sm">
                <span className="inline-flex min-w-[44px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                  {String((currentPage - 1) * perPage + index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center">
                {provider.logoUrl ? (
                  <Image
                    src={provider.logoUrl}
                    alt={`${provider.name} logo`}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 rounded-xl border border-slate-200 bg-white object-contain p-1"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-slate-200 text-[10px] font-semibold text-slate-400">
                    —
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{provider.name}</p>
                <p className="text-xs text-slate-500">
                  Created {new Date(provider.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-600 md:text-sm">
                {provider.type.charAt(0).toUpperCase() + provider.type.slice(1).replace("_", " ")}
              </div>
              <div className="truncate text-xs font-semibold text-slate-600 md:text-sm" title={provider.description ?? ""}>
                {provider.description ?? "—"}
              </div>
              <div className="truncate text-xs font-semibold text-slate-600 md:text-sm" title={provider.apiUrl ?? ""}>
                {provider.apiUrl ?? "—"}
              </div>
              <div className="text-xs font-semibold text-slate-600 md:text-sm">
                {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
              </div>
              <div
                className="truncate text-xs font-semibold text-slate-600 md:text-sm"
                title={
                  provider.config ? JSON.stringify(provider.config, null, 2) : ""
                }
              >
                {provider.config ? "Configured" : "—"}
              </div>
              <div className="flex items-center justify-start gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => openEditModal(provider)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-white group-hover:border-slate-300"
                  aria-label={`Edit ${provider.name}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ type: "delete", provider })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                  aria-label={`Delete ${provider.name}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {sortedProviders.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No providers yet. Create your first provider.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{" "}
          <span className="font-semibold text-slate-900">
            {sortedProviders.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-slate-900">
            {Math.min(currentPage * perPage, sortedProviders.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-900">{sortedProviders.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Items per page
            <select
              value={perPage}
              onChange={(event) => {
                const next = Number(event.target.value);
                setPerPage(next);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {modal
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
              <div className="max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-3 px-6 pt-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                      Platform Settings
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">
                      {modal.type === "create" ? "Add Provider" : "Edit Provider"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Manage system provider configuration.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
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
                  {modal.type === "delete" ? (
                    <form action={onDeleteProvider} className="mt-4 space-y-4">
                      <input type="hidden" name="id" value={modal.provider.id} />
                      <p className="text-sm text-slate-600">
                        This will permanently remove{" "}
                        <span className="font-semibold text-slate-900">
                          {modal.provider.name}
                        </span>{" "}
                        from the platform providers list.
                      </p>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModal(null)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                        >
                          Delete Provider
                        </button>
                      </div>
                    </form>
                  ) : (
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
                        <label className="block text-sm text-slate-700">
                          Provider name
                          <input
                            type="text"
                            name="name"
                            defaultValue={modal.type === "edit" ? modal.provider.name : ""}
                            placeholder="e.g. Google"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-amber-300 transition focus:bg-white focus:ring"
                          />
                        </label>
                        <label className="block text-sm text-slate-700">
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
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Upload PNG, JPG, or SVG. Uploading replaces the current logo.
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
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
                                  className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-1"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-400">
                                  No logo
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-semibold text-slate-700">
                                  {logoFileName
                                    ? "New upload"
                                    : modal.type === "edit" && modal.provider.logoUrl
                                      ? "Current logo"
                                      : "No logo"}
                                </p>
                                <p className="text-[11px] text-slate-400">
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
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                              >
                                Clear
                              </button>
                            ) : null}
                          </div>
                        </label>
                        <label className="block text-sm text-slate-700">
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
                        <label className="block text-sm text-slate-700">
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
                        <label className="block text-sm text-slate-700">
                          API URL
                          <input
                            type="url"
                            name="api_url"
                            defaultValue={
                              modal.type === "edit" ? modal.provider.apiUrl ?? "" : ""
                            }
                            placeholder="https://api.provider.com"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-amber-300 transition focus:bg-white focus:ring"
                          />
                        </label>
                        <label className="block text-sm text-slate-700">
                          Description
                          <input
                            type="text"
                            name="description"
                            defaultValue={
                              modal.type === "edit" ? modal.provider.description ?? "" : ""
                            }
                            placeholder="Optional description"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-amber-300 transition focus:bg-white focus:ring"
                          />
                        </label>
                      </div>
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-b from-cyan-50 to-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                                User Connection Schema
                              </p>
                              <p className="mt-1 text-sm font-semibold text-cyan-950">
                                Connection Required Fields
                              </p>
                              <p className="mt-1 text-xs text-cyan-900/80">
                                Used by user-side connect modal (especially for review providers).
                              </p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-cyan-900">
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
                              className="rounded-lg border border-cyan-300 bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700"
                            >
                              + Add required field
                            </button>
                            <button
                              type="button"
                              onClick={() => setConnectionRequiredFields([])}
                              disabled={connectionRequiredFields.length === 0}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Clear all
                            </button>
                          </div>
                          {connectionRequiredFields.length === 0 ? (
                            <div className="mt-3 rounded-xl border border-cyan-200/80 bg-white px-3 py-2 text-xs text-cyan-900/80">
                              No required fields configured. Users can connect without extra inputs.
                            </div>
                          ) : (
                            <div className="mt-3 space-y-3">
                              {connectionRequiredFields.map((field, index) => (
                                <div
                                  key={field.id}
                                  className="rounded-xl border border-cyan-200 bg-white p-3 shadow-sm"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">
                                      Required Field {String(index + 1).padStart(2, "0")}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConnectionRequiredFields((prev) =>
                                          prev.filter((x) => x.id !== field.id),
                                        )
                                      }
                                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    <label className="text-xs text-slate-700">
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
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                                      />
                                    </label>
                                    <label className="text-xs text-slate-700">
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
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                                      />
                                    </label>
                                    <label className="text-xs text-slate-700 sm:col-span-2">
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
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                                      />
                                    </label>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
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
                                    <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
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
                            <p className="text-sm font-semibold text-slate-800">
                              Provider Configuration
                            </p>
                            <p className="text-xs text-slate-500">
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
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Add field
                          </button>
                        </div>
                        <div className="mt-3 space-y-3">
                          {configEntries.map((entry, index) => (
                            <div
                              key={entry.id}
                              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
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
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                                >
                                  {configEntries.length === 1 ? "Reset" : "Remove"}
                                </button>
                              </div>
                              <div className="mt-2 space-y-3">
                                <label className="block text-sm text-slate-700">
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
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-amber-300 transition focus:ring"
                                  />
                                </label>
                              </div>
                              <label className="mt-3 block text-sm text-slate-700">
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
                                    className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-11 text-sm outline-none ring-amber-300 transition focus:ring ${
                                      entry.showValue ? "text-slate-900" : "text-transparent caret-slate-700"
                                    }`}
                                  />
                                  {!entry.showValue ? (
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-slate-400">
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
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
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
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold text-slate-600">
                          Uploading provider…
                        </p>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full w-1/2 animate-pulse rounded-full bg-slate-900" />
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModal(null)}
                        disabled={isSubmitting}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        {modal.type === "create" ? "Create Provider" : "Save Changes"}
                      </button>
                    </div>
                    </form>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </Panel>
  );
}

"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";

type OrganizationRow = {
  id: string;
  name: string;
  createdAt: string | Date;
};

type OrganizationsManagerProps = {
  organizations: OrganizationRow[];
  activeOrganizationId: string;
  returnTo: string;
  onCreateOrganization: (formData: FormData) => void | Promise<void>;
  onUpdateOrganization: (formData: FormData) => void | Promise<void>;
  onSwitchOrganization: (formData: FormData) => void | Promise<void>;
  onDeleteOrganization: (formData: FormData) => void | Promise<void>;
};

type ModalState =
  | { type: "create" }
  | { type: "edit"; organization: OrganizationRow }
  | { type: "delete"; organization: OrganizationRow }
  | null;

export function OrganizationsManager({
  organizations,
  activeOrganizationId,
  returnTo,
  onCreateOrganization,
  onUpdateOrganization,
  onSwitchOrganization,
  onDeleteOrganization,
}: OrganizationsManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  const sortedOrganizations = useMemo(
    () => organizations.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [organizations],
  );

  const totalPages = Math.max(1, Math.ceil(sortedOrganizations.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedOrganizations = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return sortedOrganizations.slice(start, start + perPage);
  }, [sortedOrganizations, currentPage, perPage]);

  return (
    <Panel title="Organization Inventory" subtitle="Create, switch, and remove organizations">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          Set the active organization used by Appointment Agent operations.
        </p>
        <button
          type="button"
          onClick={() => setModal({ type: "create" })}
          className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold"
        >
          Add Organization
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="vr-app-table-header hidden grid-cols-[80px_1fr_160px_190px] items-center gap-2 px-4 py-3 md:grid">
          <div>Index</div>
          <div>Organization Name</div>
          <div>Created</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-[var(--color-border-muted)]">
          {pagedOrganizations.map((organization, index) => {
            const isActive = organization.id === activeOrganizationId;
            return (
              <div
                key={organization.id}
                className="group grid items-center gap-2 px-4 py-3 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)] md:grid-cols-[80px_1fr_160px_190px]"
              >
                <div className="text-xs font-semibold text-[var(--color-text-muted)] md:text-sm">
                  <span className="inline-flex min-w-[44px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                    {String((currentPage - 1) * perPage + index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-[var(--color-text)]">{organization.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {isActive ? "Active organization" : "Available organization"}
                  </p>
                </div>
                <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                  {new Date(organization.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center justify-start gap-2 md:justify-end">
                  {isActive ? (
                    <span className="inline-flex rounded-lg vr-app-status-success px-2.5 py-1 text-xs font-semibold">
                      Active
                    </span>
                  ) : (
                    <form action={onSwitchOrganization}>
                      <input type="hidden" name="organization_id" value={organization.id} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                      >
                        Set Active
                      </button>
                    </form>
                  )}
                  <button
                    type="button"
                    onClick={() => setModal({ type: "edit", organization })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)]"
                    aria-label={`Edit ${organization.name}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ type: "delete", organization })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[var(--color-danger-soft)] text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Delete ${organization.name}`}
                    disabled={organizations.length <= 1}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <div>
          Showing{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {sortedOrganizations.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {Math.min(currentPage * perPage, sortedOrganizations.length)}
          </span>{" "}
          of <span className="font-semibold text-[var(--color-text)]">{sortedOrganizations.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Items per page
            <select
              value={perPage}
              onChange={(event) => {
                setPerPage(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs font-semibold text-[var(--color-text)]"
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
              className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text)] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="rounded-lg bg-[var(--color-raised)] px-2 py-1 text-xs font-semibold text-[var(--color-text)]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text)] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {modal && modal.type !== "delete"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] px-4">
              <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-[var(--shadow-lg)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                      Appointment Agent
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">
                      {modal.type === "create" ? "Add Organization" : "Edit Organization"}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {modal.type === "create"
                        ? "Create a workspace organization for appointment operations."
                        : "Update organization name."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-lg p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)]"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>
                </div>

                <form
                  action={modal.type === "create" ? onCreateOrganization : onUpdateOrganization}
                  className="mt-4 space-y-4"
                >
                  {modal.type === "edit" ? (
                    <input type="hidden" name="organization_id" value={modal.organization.id} />
                  ) : null}
                  <input type="hidden" name="return_to" value={returnTo} />
                  <label className="block text-sm text-[var(--color-text)]">
                    Organization name
                    <input
                      type="text"
                      name="organization_name"
                      placeholder="e.g. Northline Home Services"
                      defaultValue={modal.type === "edit" ? modal.organization.name : ""}
                      className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-bg)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold">
                      {modal.type === "create" ? "Create Organization" : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={modal?.type === "delete"}
        title="Delete organization"
        description={
          modal?.type === "delete"
            ? `This will permanently remove "${modal.organization.name}" if it is empty and you have owner access.`
            : ""
        }
        confirmLabel="Delete Organization"
        onCancel={() => setModal(null)}
        action={onDeleteOrganization}
        hiddenFields={
          modal?.type === "delete"
            ? [
                { name: "organization_id", value: modal.organization.id },
                { name: "return_to", value: returnTo },
              ]
            : []
        }
      />
    </Panel>
  );
}

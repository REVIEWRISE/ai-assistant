"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DataTable,
  DataTableBody,
  DataTableEmptyState,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/data-table";

type OrganizationRow = {
  id: string;
  name: string;
  logoUrl?: string | null;
  createdAt: string | Date;
};

type OrganizationsManagerProps = {
  organizations: OrganizationRow[];
  activeOrganizationId: string;
  readOnly?: boolean;
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
  readOnly = false,
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
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-5 lg:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Workspace directory</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-text)]">Organizations</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-text-muted)]">
            Select the workspace used by dashboard data, booking tools, and automated customer operations.
          </p>
        </div>
        {readOnly ? (
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
            View-only access
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setModal({ type: "create" })}
            className="rounded-xl vr-btn-primary px-4 py-2.5 text-sm font-semibold shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-primary)_85%,transparent)]"
          >
            Add organization
          </button>
        )}
      </div>

      <DataTable className="rounded-none border-x-0 border-b-0">
        <DataTableHeader className="hidden grid-cols-[64px_minmax(0,1fr)_140px_220px] md:grid">
          <div>Index</div>
          <div>Organization</div>
          <div>Created</div>
          <div className="text-right">{readOnly ? "Access" : "Actions"}</div>
        </DataTableHeader>
        <DataTableBody>
          {pagedOrganizations.length === 0 ? (
            <DataTableEmptyState
              title="No organizations yet"
              description="Create an organization to start configuring booking operations."
              action={!readOnly ? (
                <button type="button" onClick={() => setModal({ type: "create" })} className="rounded-xl vr-btn-primary px-4 py-2 text-xs font-semibold">
                  Add organization
                </button>
              ) : undefined}
            />
          ) : null}
          {pagedOrganizations.map((organization, index) => {
            const isActive = organization.id === activeOrganizationId;
            return (
              <DataTableRow
                key={organization.id}
                className="group items-center md:grid-cols-[64px_minmax(0,1fr)_140px_220px]"
              >
                <div className="text-xs font-semibold text-[var(--color-text-muted)] md:text-sm">
                  <span className="inline-flex min-w-[40px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
                    {String((currentPage - 1) * perPage + index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-primary-h)] shadow-[var(--shadow-sm)]">
                    {organization.logoUrl ? (
                      <Image src={organization.logoUrl} alt="" width={40} height={40} unoptimized className="size-full object-contain p-1.5" />
                    ) : (
                      organization.name.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--color-text)]">{organization.name}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                      {isActive ? "Currently powering booking operations" : "Available workspace"}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                  {new Date(organization.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center justify-start gap-2 md:justify-end">
                  {readOnly ? (
                    <span className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                      View only
                    </span>
                  ) : isActive ? (
                    <span className="inline-flex rounded-lg vr-app-status-success px-2.5 py-1 text-xs font-semibold">
                      Active
                    </span>
                  ) : (
                    <form action={onSwitchOrganization}>
                      <input type="hidden" name="organization_id" value={organization.id} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-raised)]"
                      >
                        Set Active
                      </button>
                    </form>
                  )}
                  {!readOnly ? <button
                    type="button"
                    onClick={() => setModal({ type: "edit", organization })}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-raised)]"
                    aria-label={`Edit ${organization.name}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button> : null}
                  {!readOnly ? <button
                    type="button"
                    onClick={() => setModal({ type: "delete", organization })}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[var(--color-danger-soft)] text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Delete ${organization.name}`}
                    disabled={organizations.length <= 1}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                    </svg>
                  </button> : null}
                </div>
              </DataTableRow>
            );
          })}
        </DataTableBody>
        <DataTablePagination
          totalItems={sortedOrganizations.length}
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          itemLabel="organizations"
        />
      </DataTable>

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
                        : "Update organization name and company logo for emails."}
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
                  {modal.type === "edit" ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                      <p className="text-sm font-semibold text-[var(--color-text)]">Company logo</p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        Shown in booking confirmation emails. PNG, JPG, or SVG recommended.
                      </p>
                      {modal.organization.logoUrl ? (
                        <Image
                          src={modal.organization.logoUrl}
                          alt=""
                          width={56}
                          height={56}
                          unoptimized
                          className="mt-3 h-14 w-14 rounded-xl border border-[var(--color-border)] bg-white object-contain p-1"
                        />
                      ) : null}
                      <input
                        type="file"
                        name="logo"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="mt-3 block w-full text-xs text-[var(--color-text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary-soft)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[var(--color-primary-h)]"
                      />
                    </div>
                  ) : null}
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
    </section>
  );
}

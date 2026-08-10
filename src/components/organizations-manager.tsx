"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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
  /** When true, delete confirms cascade of all workspace data (admin force-delete). */
  canForceDelete?: boolean;
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

function organizationInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

function OrganizationActionsMenu({
  organization,
  isActive,
  canDelete,
  isOpen,
  onToggle,
  onClose,
  onSetActive,
  onEdit,
  onDelete,
}: {
  organization: OrganizationRow;
  isActive: boolean;
  canDelete: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ bottom: number; left: number } | null>(
    null,
  );

  function computeMenuPosition(rect: DOMRect) {
    const menuWidth = 220;
    const gap = 8;
    const viewportPadding = 8;
    const bottom = window.innerHeight - rect.top + gap;
    let left = rect.right - menuWidth;

    left = Math.min(
      Math.max(viewportPadding, left),
      window.innerWidth - menuWidth - viewportPadding,
    );

    return { bottom, left };
  }

  function handleTriggerClick() {
    if (isOpen) {
      onClose();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition(computeMenuPosition(rect));
    onToggle();
  }

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setMenuPosition(computeMenuPosition(rect));
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const menuItems = [
    ...(!isActive
      ? [
          {
            id: "set-active",
            label: "Set active",
            description: "Use this workspace for bookings",
            onClick: onSetActive,
            danger: false,
            disabled: false,
          },
        ]
      : []),
    {
      id: "edit",
      label: "Edit organization",
      description: "Update name or company logo",
      onClick: onEdit,
      danger: false,
      disabled: false,
    },
    {
      id: "delete",
      label: "Delete organization",
      description: canDelete
        ? "Permanently remove this workspace"
        : "At least one organization is required",
      onClick: onDelete,
      danger: true,
      disabled: !canDelete,
    },
  ];

  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-label={`Open actions for ${organization.name}`}
        title={`Actions for ${organization.name}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          isOpen
            ? "border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
            : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ bottom: menuPosition.bottom, left: menuPosition.left }}
              className="fixed z-[120] min-w-[13.75rem] max-w-[13.75rem] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-1 shadow-[var(--shadow-lg)]"
            >
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onClick();
                    onClose();
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    item.danger
                      ? "hover:bg-[var(--color-danger-soft)] disabled:hover:bg-transparent"
                      : "hover:bg-[var(--color-surface)] disabled:hover:bg-transparent"
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      item.danger ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="text-[11px] leading-snug text-[var(--color-text-muted)]">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function OrganizationsManager({
  organizations,
  activeOrganizationId,
  readOnly = false,
  canForceDelete = false,
  returnTo,
  onCreateOrganization,
  onUpdateOrganization,
  onSwitchOrganization,
  onDeleteOrganization,
}: OrganizationsManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
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

  function openCreate() {
    setDraftName("");
    setModal({ type: "create" });
  }

  function openEdit(organization: OrganizationRow) {
    setDraftName(organization.name);
    setModal({ type: "edit", organization });
  }

  function closeModal() {
    setModal(null);
    setDraftName("");
  }

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
            onClick={openCreate}
            className="rounded-xl vr-btn-primary px-4 py-2.5 text-sm font-semibold shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-primary)_85%,transparent)]"
          >
            Add organization
          </button>
        )}
      </div>

      <DataTable className="rounded-none border-x-0 border-b-0">
        <DataTableHeader className="hidden grid-cols-[64px_minmax(0,1fr)_140px_100px] md:grid">
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
              action={
                !readOnly ? (
                  <button type="button" onClick={openCreate} className="rounded-xl vr-btn-primary px-4 py-2 text-xs font-semibold">
                    Add organization
                  </button>
                ) : undefined
              }
            />
          ) : null}
          {pagedOrganizations.map((organization, index) => {
            const isActive = organization.id === activeOrganizationId;
            return (
              <DataTableRow
                key={organization.id}
                className="group items-center md:grid-cols-[64px_minmax(0,1fr)_140px_100px]"
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
                      organizationInitials(organization.name)
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
                <div className="flex items-center md:justify-end">
                  {readOnly ? (
                    <span className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                      View only
                    </span>
                  ) : (
                    <OrganizationActionsMenu
                      organization={organization}
                      isActive={isActive}
                      canDelete={organizations.length > 1}
                      isOpen={openMenuId === organization.id}
                      onToggle={() =>
                        setOpenMenuId((current) =>
                          current === organization.id ? null : organization.id,
                        )
                      }
                      onClose={() => setOpenMenuId(null)}
                      onSetActive={() => {
                        const formData = new FormData();
                        formData.set("organization_id", organization.id);
                        formData.set("return_to", returnTo);
                        void onSwitchOrganization(formData);
                      }}
                      onEdit={() => openEdit(organization)}
                      onDelete={() => setModal({ type: "delete", organization })}
                    />
                  )}
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
            <div
              className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="organization-modal-title"
            >
              <button
                type="button"
                className="absolute inset-0 bg-[color-mix(in_srgb,#0a0a0a_48%,transparent)] backdrop-blur-[3px]"
                aria-label="Close"
                onClick={closeModal}
              />
              <div className="onboarding-panel-in relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
                <div className="relative overflow-hidden border-b border-[var(--color-border)] px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
                  <div
                    className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[var(--color-primary-soft)] blur-2xl"
                    aria-hidden
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-sm font-bold text-white shadow-[var(--shadow-sm)]">
                        {organizationInitials(draftName || (modal.type === "edit" ? modal.organization.name : "New"))}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                          Workspace
                        </p>
                        <h2
                          id="organization-modal-title"
                          className="mt-1 text-xl font-semibold tracking-tight text-[var(--color-text)]"
                        >
                          {modal.type === "create" ? "Add organization" : "Edit organization"}
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                          {modal.type === "create"
                            ? "Create a new business workspace. You’ll pick a plan next."
                            : "Update the name and logo used across booking emails."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                      aria-label="Close"
                    >
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                </div>

                <form
                  action={modal.type === "create" ? onCreateOrganization : onUpdateOrganization}
                  className="space-y-5 px-5 py-5 sm:px-6"
                >
                  {modal.type === "edit" ? (
                    <input type="hidden" name="organization_id" value={modal.organization.id} />
                  ) : null}
                  <input type="hidden" name="return_to" value={returnTo} />

                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Organization name</span>
                    <input
                      type="text"
                      name="organization_name"
                      required
                      autoFocus
                      placeholder="e.g. Northline Home Services"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
                    />
                  </label>

                  {modal.type === "edit" ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                      <div className="flex items-start gap-3">
                        {modal.organization.logoUrl ? (
                          <Image
                            src={modal.organization.logoUrl}
                            alt=""
                            width={56}
                            height={56}
                            unoptimized
                            className="size-14 shrink-0 rounded-xl border border-[var(--color-border)] bg-white object-contain p-1"
                          />
                        ) : (
                          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text-muted)]">
                            {organizationInitials(draftName || modal.organization.name)}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--color-text)]">Company logo</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                            Shown in booking confirmation emails. PNG, JPG, or SVG.
                          </p>
                          <input
                            type="file"
                            name="logo"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="mt-3 block w-full text-xs text-[var(--color-text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary-soft)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[var(--color-primary-h)]"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3.5">
                      <p className="text-xs font-semibold text-[var(--color-text)]">What happens next</p>
                      <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                        <li className="flex gap-2">
                          <span className="font-semibold text-[var(--color-primary-h)]">1.</span>
                          Workspace is created and set as active
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold text-[var(--color-primary-h)]">2.</span>
                          Choose a plan to unlock booking and reviews
                        </li>
                      </ol>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!draftName.trim()}
                      className="rounded-xl vr-btn-primary px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {modal.type === "create" ? "Create organization" : "Save changes"}
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
            ? canForceDelete
              ? `Permanently delete "${modal.organization.name}" and all workspace data (members, bookings, reviews, knowledge base, chatbot, voice lines, and audit history)? This cannot be undone.`
              : `This will permanently remove "${modal.organization.name}" if it is empty and you have owner access.`
            : ""
        }
        confirmLabel={canForceDelete ? "Delete workspace & data" : "Delete Organization"}
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

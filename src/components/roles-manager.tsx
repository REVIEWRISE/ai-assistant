"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CustomSelect } from "@/components/custom-select";
import {
  DataTable,
  DataTableBody,
  DataTableEmptyState,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/data-table";

type RoleRow = {
  id: string;
  name: string;
  createdAt: string | Date;
  userCount?: number;
  permissionCount?: number;
};

type RolesManagerProps = {
  roles: RoleRow[];
  onCreateRole: (formData: FormData) => void | Promise<void>;
  onUpdateRole: (formData: FormData) => void | Promise<void>;
  onDeleteRole: (formData: FormData) => void | Promise<void>;
};

type ModalState =
  | { type: "create" }
  | { type: "edit"; role: RoleRow }
  | { type: "delete"; role: RoleRow }
  | null;

type CoverageFilter = "all" | "with_grants" | "no_grants";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]";

function initialsFor(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || name.slice(0, 2).toUpperCase()
  );
}

function RoleActionsMenu({
  role,
  isOpen,
  onToggle,
  onClose,
  onEdit,
  onDelete,
}: {
  role: RoleRow;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
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
    {
      id: "edit",
      label: "Edit role",
      description: "Rename this access tier",
      onClick: onEdit,
      danger: false,
    },
    {
      id: "delete",
      label: "Delete role",
      description: "Permanently remove this role",
      onClick: onDelete,
      danger: true,
    },
  ];

  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-label={`Open actions for ${role.name}`}
        title={`Actions for ${role.name}`}
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
                  onClick={() => {
                    item.onClick();
                    onClose();
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition ${
                    item.danger
                      ? "hover:bg-[var(--color-danger-soft)]"
                      : "hover:bg-[var(--color-surface)]"
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

export function RolesManager({
  roles,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
}: RolesManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [query, setQuery] = useState("");
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");

  const coverageCounts = useMemo(() => {
    return {
      all: roles.length,
      with_grants: roles.filter((role) => (role.permissionCount ?? 0) > 0).length,
      no_grants: roles.filter((role) => (role.permissionCount ?? 0) === 0).length,
    };
  }, [roles]);

  const filteredRoles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return roles
      .filter((role) => {
        const matchesQuery =
          !normalizedQuery || role.name.toLowerCase().includes(normalizedQuery);
        const grants = role.permissionCount ?? 0;
        const matchesCoverage =
          coverageFilter === "all" ||
          (coverageFilter === "with_grants" && grants > 0) ||
          (coverageFilter === "no_grants" && grants === 0);
        return matchesQuery && matchesCoverage;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [coverageFilter, query, roles]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedRoles = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredRoles.slice(start, start + perPage);
  }, [filteredRoles, currentPage, perPage]);

  const coverageOptions = [
    { value: "all" as const, label: `All · ${coverageCounts.all}` },
    { value: "with_grants" as const, label: `With grants · ${coverageCounts.with_grants}` },
    { value: "no_grants" as const, label: `No grants · ${coverageCounts.no_grants}` },
  ];

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between lg:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Inventory
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Workspace roles</h2>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
              {filteredRoles.length}
              {filteredRoles.length !== roles.length ? ` of ${roles.length}` : ""} shown
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Create access tiers, then assign menus under Permissions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: "create" })}
          className="shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
        >
          Add role
        </button>
      </div>

      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 lg:px-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="block">
            <span className="sr-only">Search roles</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by role name…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
            />
          </label>
          <CustomSelect
            value={coverageFilter}
            onChange={(value) => {
              setCoverageFilter(value);
              setPage(1);
            }}
            options={coverageOptions}
            aria-label="Filter by permission coverage"
            className="mt-0"
            triggerClassName="rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold"
          />
        </div>
      </div>

      <div className="p-4 lg:p-5">
        <DataTable>
          <DataTableHeader className="hidden grid-cols-[minmax(220px,1.4fr)_120px_140px_140px_120px] lg:grid lg:px-5">
            <div>Role</div>
            <div>Users</div>
            <div>Menu grants</div>
            <div>Created</div>
            <div className="text-right">Actions</div>
          </DataTableHeader>

        <DataTableBody>
          {pagedRoles.map((role) => {
            const userCount = role.userCount ?? 0;
            const permissionCount = role.permissionCount ?? 0;
            return (
              <DataTableRow
                key={role.id}
                className="gap-4 py-4 hover:bg-[var(--color-bg)] lg:grid-cols-[minmax(220px,1.4fr)_120px_140px_140px_120px] lg:items-center lg:px-5 lg:py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_22%,transparent),color-mix(in_srgb,var(--color-primary)_8%,transparent))] text-[11px] font-bold text-[var(--color-primary-h)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))]">
                    {initialsFor(role.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {role.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                      Access tier
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] lg:hidden">
                    Users
                  </p>
                  <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--color-text)]">
                    {userCount}
                  </span>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] lg:hidden">
                    Menu grants
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
                      permissionCount > 0
                        ? "vr-app-status-success"
                        : "vr-app-status-warning"
                    }`}
                  >
                    {permissionCount > 0 ? `${permissionCount} grants` : "No grants"}
                  </span>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] lg:hidden">
                    Created
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center lg:justify-end">
                  <RoleActionsMenu
                    role={role}
                    isOpen={openMenuId === role.id}
                    onToggle={() =>
                      setOpenMenuId((current) => (current === role.id ? null : role.id))
                    }
                    onClose={() => setOpenMenuId(null)}
                    onEdit={() => setModal({ type: "edit", role })}
                    onDelete={() => setModal({ type: "delete", role })}
                  />
                </div>
              </DataTableRow>
            );
          })}

          {filteredRoles.length === 0 ? (
            <DataTableEmptyState
              title={roles.length === 0 ? "No roles yet" : "No matching roles"}
              description={
                roles.length === 0
                  ? "Create the first role to define reusable access."
                  : "Try a different search or coverage filter."
              }
              action={
                roles.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setModal({ type: "create" })}
                    className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)]"
                  >
                    Add role
                  </button>
                ) : null
              }
            />
          ) : null}
        </DataTableBody>
        <DataTablePagination
          totalItems={filteredRoles.length}
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          itemLabel="roles"
        />
        </DataTable>
      </div>

      {modal && modal.type !== "delete"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 backdrop-blur-sm">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="role-dialog-title"
                className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
                      Access control
                    </p>
                    <h2
                      id="role-dialog-title"
                      className="mt-1 text-lg font-semibold text-[var(--color-text)]"
                    >
                      {modal.type === "create" ? "Add a role" : "Edit role"}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {modal.type === "create"
                        ? "Create a reusable access tier for the workspace."
                        : "Update the role name used across permissions."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                    aria-label="Close dialog"
                  >
                    ×
                  </button>
                </div>

                <form
                  action={modal.type === "create" ? onCreateRole : onUpdateRole}
                  className="space-y-4 p-5"
                >
                  {modal.type === "edit" ? (
                    <input type="hidden" name="id" value={modal.role.id} />
                  ) : null}
                  <label className="block text-xs font-semibold text-[var(--color-text)]">
                    Role name
                    <input
                      type="text"
                      name="name"
                      defaultValue={modal.type === "edit" ? modal.role.name : ""}
                      placeholder="e.g. Supervisor"
                      required
                      className={fieldClass}
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
                    >
                      {modal.type === "create" ? "Create role" : "Save changes"}
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
        title="Delete role"
        description={
          modal?.type === "delete"
            ? `This will permanently remove “${modal.role.name}”.`
            : ""
        }
        confirmLabel="Delete role"
        onCancel={() => setModal(null)}
        action={onDeleteRole}
        hiddenFields={
          modal?.type === "delete" ? [{ name: "id", value: modal.role.id }] : []
        }
      />
    </section>
  );
}

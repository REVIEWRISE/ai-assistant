"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";

type RoleRow = {
  id: string;
  name: string;
  createdAt: string | Date;
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

export function RolesManager({
  roles,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
}: RolesManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  const sortedRoles = useMemo(
    () => roles.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [roles],
  );

  const totalPages = Math.max(1, Math.ceil(sortedRoles.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedRoles = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return sortedRoles.slice(start, start + perPage);
  }, [sortedRoles, currentPage, perPage]);

  return (
    <Panel title="Role Inventory" subtitle="Create, edit, and remove roles">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          Roles control which menus and permissions are available.
        </p>
        <button
          type="button"
          onClick={() => setModal({ type: "create" })}
          className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold"
        >
          Add Role
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="vr-app-table-header hidden grid-cols-[80px_1fr_160px_160px] items-center gap-2 px-4 py-3 md:grid">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
            Index
          </div>
          <div>Role Name</div>
          <div>Created</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-[var(--color-border-muted)]">
          {pagedRoles.map((role, index) => (
            <div
              key={role.id}
              className="group grid items-center gap-2 px-4 py-3 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)] md:grid-cols-[80px_1fr_160px_160px]"
            >
              <div className="text-xs font-semibold text-[var(--color-text-muted)] md:text-sm">
                <span className="inline-flex min-w-[44px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {String((currentPage - 1) * perPage + index + 1).padStart(2, "0")}
                </span>
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">{role.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Access control</p>
              </div>
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                {new Date(role.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center justify-start gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => setModal({ type: "edit", role })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg)] group-hover:border-[var(--color-border-hover)]"
                  aria-label={`Edit ${role.name}`}
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
                  onClick={() => setModal({ type: "delete", role })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[var(--color-danger-soft)] text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))] transition hover:brightness-95"
                  aria-label={`Delete ${role.name}`}
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
          {sortedRoles.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No roles yet. Create your first role.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <div>
          Showing{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {sortedRoles.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {Math.min(currentPage * perPage, sortedRoles.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-[var(--color-text)]">{sortedRoles.length}</span>
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
              <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                      Access Control
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">
                      {modal.type === "create" ? "Add Role" : "Edit Role"}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {modal.type === "create"
                        ? "Create a new role for the workspace."
                        : "Update the role name."}
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

                <form
                  action={modal.type === "create" ? onCreateRole : onUpdateRole}
                  className="mt-4 space-y-4"
                >
                  {modal.type === "edit" ? (
                    <input type="hidden" name="id" value={modal.role.id} />
                  ) : null}
                  <label className="block text-sm text-[var(--color-text)]">
                    Role name
                    <input
                      type="text"
                      name="name"
                      defaultValue={modal.type === "edit" ? modal.role.name : ""}
                      placeholder="e.g. Supervisor"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold"
                    >
                      {modal.type === "create" ? "Create Role" : "Save Changes"}
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
            ? `This will permanently remove "${modal.role.name}".`
            : ""
        }
        confirmLabel="Delete Role"
        onCancel={() => setModal(null)}
        action={onDeleteRole}
        hiddenFields={
          modal?.type === "delete" ? [{ name: "id", value: modal.role.id }] : []
        }
      />
    </Panel>
  );
}

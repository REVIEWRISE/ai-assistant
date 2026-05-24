"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";

type RoleOption = {
  id: string;
  name: string;
};

type MenuOption = {
  id: string;
  label: string;
  path: string;
};

type PermissionRow = {
  id: string;
  role: RoleOption;
  menuItem: MenuOption;
  createdAt: string | Date;
};

type PermissionsManagerProps = {
  permissions: PermissionRow[];
  roles: RoleOption[];
  menus: MenuOption[];
  onCreatePermission: (formData: FormData) => void | Promise<void>;
  onDeletePermission: (formData: FormData) => void | Promise<void>;
};

type ModalState =
  | { type: "create" }
  | { type: "delete"; permission: PermissionRow }
  | null;

export function PermissionsManager({
  permissions,
  roles,
  menus,
  onCreatePermission,
  onDeletePermission,
}: PermissionsManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  const sortedPermissions = useMemo(
    () =>
      permissions
        .slice()
        .sort((a, b) => a.role.name.localeCompare(b.role.name)),
    [permissions],
  );

  const totalPages = Math.max(1, Math.ceil(sortedPermissions.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedPermissions = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return sortedPermissions.slice(start, start + perPage);
  }, [sortedPermissions, currentPage, perPage]);

  const menuAccessByRole = useMemo(() => {
    const map = new Map<string, Set<string>>();
    permissions.forEach((permission) => {
      const current = map.get(permission.role.id) ?? new Set<string>();
      current.add(permission.menuItem.id);
      map.set(permission.role.id, current);
    });
    return map;
  }, [permissions]);

  const availableMenus = useMemo(() => {
    if (!selectedRoleId) return menus;
    const assigned = menuAccessByRole.get(selectedRoleId) ?? new Set<string>();
    return menus.filter((menu) => !assigned.has(menu.id));
  }, [menus, menuAccessByRole, selectedRoleId]);

  return (
    <Panel title="Menu Permissions" subtitle="Assign roles to menu access">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          Control which roles can see and access each menu item.
        </p>
        <button
          type="button"
          onClick={() => {
            setSelectedRoleId("");
            setModal({ type: "create" });
          }}
          className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold"
        >
          Add Permission
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="vr-app-table-header hidden grid-cols-[72px_1fr_1.2fr_160px_140px] items-center gap-2 px-4 py-3 md:grid">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
            Index
          </div>
          <div>Role</div>
          <div>Menu</div>
          <div>Created</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-[var(--color-border-muted)]">
          {pagedPermissions.map((permission, index) => (
            <div
              key={permission.id}
              className="group grid items-center gap-2 px-4 py-3 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)] md:grid-cols-[72px_1fr_1.2fr_160px_140px]"
            >
              <div className="text-xs font-semibold text-[var(--color-text-muted)] md:text-sm">
                <span className="inline-flex min-w-[44px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {String((currentPage - 1) * perPage + index + 1).padStart(2, "0")}
                </span>
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">{permission.role.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Role access</p>
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">{permission.menuItem.label}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{permission.menuItem.path}</p>
              </div>
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                {new Date(permission.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center justify-start gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => setModal({ type: "delete", permission })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[var(--color-danger-soft)] text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))] transition hover:brightness-95"
                  aria-label="Delete permission"
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
          {sortedPermissions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No permissions yet. Create your first mapping.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <div>
          Showing{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {sortedPermissions.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {Math.min(currentPage * perPage, sortedPermissions.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-[var(--color-text)]">{sortedPermissions.length}</span>
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

      {modal?.type === "create"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] px-4">
              <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                      Access Control
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">
                      Add Permission
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      Assign a role to a menu item.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleId("");
                      setModal(null);
                    }}
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
                  action={onCreatePermission}
                  className="mt-4 space-y-4"
                >
                  <label className="block text-sm text-[var(--color-text)]">
                    Role
                    <select
                      name="role_id"
                      defaultValue=""
                      onChange={(event) => setSelectedRoleId(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                    >
                      <option value="">Select role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-[var(--color-text)]">
                    Menu
                    <select
                      name="menu_item_id"
                      defaultValue=""
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                    >
                      <option value="">Select menu</option>
                      {availableMenus.map((menu) => (
                        <option key={menu.id} value={menu.id}>
                          {menu.label} ({menu.path})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoleId("");
                        setModal(null);
                      }}
                      className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold"
                    >
                      Create Permission
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
        title="Delete permission"
        description={
          modal?.type === "delete"
            ? `Remove access for ${modal.permission.role.name} on ${modal.permission.menuItem.label}?`
            : ""
        }
        confirmLabel="Delete Permission"
        onCancel={() => {
          setSelectedRoleId("");
          setModal(null);
        }}
        action={onDeletePermission}
        hiddenFields={
          modal?.type === "delete"
            ? [{ name: "id", value: modal.permission.id }]
            : []
        }
      />
    </Panel>
  );
}

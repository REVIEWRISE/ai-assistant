"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CustomSelect } from "@/components/custom-select";

type RoleOption = {
  id: string;
  name: string;
};

type MenuOption = {
  id: string;
  label: string;
  path: string;
};

type RolePermissionRow = {
  id: string;
  role: RoleOption;
  menuItem: MenuOption;
  createdAt: string | Date;
};

type RolePermissionsManagerProps = {
  permissions: RolePermissionRow[];
  roles: RoleOption[];
  menus: MenuOption[];
  onCreatePermission: (formData: FormData) => void | Promise<void>;
  onDeletePermission: (formData: FormData) => void | Promise<void>;
  embedded?: boolean;
};

type ModalState =
  | { type: "create" }
  | { type: "delete"; permission: RolePermissionRow }
  | null;

export function RolePermissionsManager({
  permissions,
  roles,
  menus,
  onCreatePermission,
  onDeletePermission,
  embedded = false,
}: RolePermissionsManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [filterRoleId, setFilterRoleId] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  const sortedPermissions = useMemo(
    () =>
      permissions
        .slice()
        .sort((a, b) => {
          const roleCompare = a.role.name.localeCompare(b.role.name);
          if (roleCompare !== 0) return roleCompare;
          return a.menuItem.label.localeCompare(b.menuItem.label);
        }),
    [permissions],
  );

  const filteredPermissions = useMemo(() => {
    if (!filterRoleId) return sortedPermissions;
    return sortedPermissions.filter((permission) => permission.role.id === filterRoleId);
  }, [sortedPermissions, filterRoleId]);

  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedPermissions = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredPermissions.slice(start, start + perPage);
  }, [filteredPermissions, currentPage, perPage]);

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

  const roleFilterOptions = useMemo(
    () => [
      { value: "", label: "All roles" },
      ...roles.map((role) => ({ value: role.id, label: role.name })),
    ],
    [roles],
  );

  const roleModalOptions = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.name })),
    [roles],
  );

  const menuModalOptions = useMemo(
    () =>
      availableMenus.map((menu) => ({
        value: menu.id,
        label: `${menu.label} (${menu.path})`,
      })),
    [availableMenus],
  );

  const filteredRoleLabel =
    roles.find((role) => role.id === filterRoleId)?.name ?? "All roles";

  const modalSelectTriggerClass =
    "rounded-xl border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2.5 font-medium hover:bg-[var(--color-raised)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]";

  const canSubmit = Boolean(selectedRoleId) && Boolean(selectedMenuItemId);

  function resetCreateForm() {
    setSelectedRoleId("");
    setSelectedMenuItemId("");
  }

  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          {embedded
            ? "Menus granted to everyone with the selected role when no user override exists."
            : "These defaults apply to every organization unless you assign that user custom permissions below."}
        </p>
        <button
          type="button"
          onClick={() => {
            resetCreateForm();
            setModal({ type: "create" });
          }}
          className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold"
          disabled={roles.length === 0}
        >
          Add Role Permission
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="w-full min-w-[220px] sm:w-auto sm:min-w-[240px]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            Filter by role
          </p>
          <CustomSelect
            value={filterRoleId}
            onChange={(roleId) => {
              setFilterRoleId(roleId);
              setPage(1);
            }}
            options={roleFilterOptions}
            placeholder="All roles"
            aria-label="Filter by role"
            className="mt-1.5"
            triggerClassName="rounded-xl border-[var(--color-border-hover)] bg-[var(--color-bg)] px-3 py-2.5 font-medium hover:bg-[var(--color-raised)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          {filterRoleId ? (
            <button
              type="button"
              onClick={() => {
                setFilterRoleId("");
                setPage(1);
              }}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
            >
              Clear filter
            </button>
          ) : null}
          <span className="rounded-lg bg-[var(--color-bg)] px-2.5 py-1.5 font-semibold text-[var(--color-text)]">
            {filteredPermissions.length} permission{filteredPermissions.length === 1 ? "" : "s"}
          </span>
          {filterRoleId ? (
            <span className="text-[var(--color-text-muted)]">for {filteredRoleLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="vr-app-table-header hidden grid-cols-[56px_1fr_1.4fr_120px_80px] items-center gap-2 px-4 py-3 md:grid">
          <div>#</div>
          <div>Role</div>
          <div>Menu</div>
          <div>Created</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-[var(--color-border-muted)]">
          {pagedPermissions.map((permission, index) => (
            <div
              key={permission.id}
              className="group grid items-center gap-2 px-4 py-3 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)] md:grid-cols-[56px_1fr_1.4fr_120px_80px]"
            >
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                {String((currentPage - 1) * perPage + index + 1).padStart(2, "0")}
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">{permission.role.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Role default</p>
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
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {filteredPermissions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No role permissions yet. Add defaults so users inherit menus from their role.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <div>
          Showing{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {filteredPermissions.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {Math.min(currentPage * perPage, filteredPermissions.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-[var(--color-text)]">{filteredPermissions.length}</span>
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
                      Add Role Permission
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      Grant a menu to all users with this role (when no org override exists).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetCreateForm();
                      setModal(null);
                    }}
                    className="rounded-lg p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)]"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>
                </div>

                <form action={onCreatePermission} className="mt-4 space-y-4">
                  <input type="hidden" name="role_id" value={selectedRoleId} />
                  <input type="hidden" name="menu_item_id" value={selectedMenuItemId} />

                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Role</p>
                    <CustomSelect
                      value={selectedRoleId}
                      onChange={(roleId) => {
                        setSelectedRoleId(roleId);
                        setSelectedMenuItemId("");
                      }}
                      options={roleModalOptions}
                      placeholder="Select role"
                      aria-label="Role"
                      className="mt-1.5"
                      triggerClassName={modalSelectTriggerClass}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Menu</p>
                    <CustomSelect
                      value={selectedMenuItemId}
                      onChange={setSelectedMenuItemId}
                      options={menuModalOptions}
                      placeholder="Select menu"
                      disabled={!selectedRoleId}
                      aria-label="Menu"
                      className="mt-1.5"
                      triggerClassName={modalSelectTriggerClass}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetCreateForm();
                        setModal(null);
                      }}
                      className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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
        title="Delete role permission"
        description={
          modal?.type === "delete"
            ? `Remove ${modal.permission.menuItem.label} from role ${modal.permission.role.name}?`
            : ""
        }
        confirmLabel="Delete Permission"
        onCancel={() => setModal(null)}
        action={onDeletePermission}
        hiddenFields={
          modal?.type === "delete" ? [{ name: "id", value: modal.permission.id }] : []
        }
      />
    </>
  );

  if (embedded) return content;

  return (
    <Panel
      title="Role Default Permissions"
      subtitle="Baseline menu access by role — used when a user has no organization-specific overrides"
    >
      {content}
    </Panel>
  );
}

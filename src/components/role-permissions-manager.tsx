"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";
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
import { TableRowActionsMenu } from "@/components/table-row-actions-menu";

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

      <DataTable className="mt-4">
        <DataTableHeader className="hidden grid-cols-[56px_1fr_1.4fr_120px_80px] md:grid">
          <div>#</div>
          <div>Role</div>
          <div>Menu</div>
          <div>Created</div>
          <div className="text-right">Actions</div>
        </DataTableHeader>
        <DataTableBody>
          {pagedPermissions.map((permission, index) => (
            <DataTableRow
              key={permission.id}
              className="group items-center gap-2 md:grid-cols-[56px_1fr_1.4fr_120px_80px]"
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
              <div className="flex items-center justify-start md:justify-end">
                <TableRowActionsMenu
                  label={`${permission.role.name} · ${permission.menuItem.label}`}
                  isOpen={openMenuId === permission.id}
                  onToggle={() =>
                    setOpenMenuId((current) =>
                      current === permission.id ? null : permission.id,
                    )
                  }
                  onClose={() => setOpenMenuId(null)}
                  actions={[
                    {
                      id: "delete",
                      label: "Delete permission",
                      description: "Remove this role menu grant",
                      danger: true,
                      onClick: () => setModal({ type: "delete", permission }),
                    },
                  ]}
                />
              </div>
            </DataTableRow>
          ))}
          {filteredPermissions.length === 0 ? (
            <DataTableEmptyState
              title="No role defaults yet"
              description="Add defaults so users inherit menus from their role."
            />
          ) : null}
        </DataTableBody>
        <DataTablePagination
          totalItems={filteredPermissions.length}
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          itemLabel="permissions"
        />
      </DataTable>

      {modal?.type === "create"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4">
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

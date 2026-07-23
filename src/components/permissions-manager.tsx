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

type OrganizationOption = {
  id: string;
  name: string;
};

type MembershipOption = {
  organizationId: string;
  organizationName: string;
  userId: string;
  userName: string;
  userEmail: string;
};

type MenuOption = {
  id: string;
  label: string;
  path: string;
};

type PermissionRow = {
  id: string;
  organization: OrganizationOption;
  user: { id: string; fullName: string; email: string };
  menuItem: MenuOption;
  createdAt: string | Date;
};

type PermissionsManagerProps = {
  permissions: PermissionRow[];
  organizations: OrganizationOption[];
  memberships: MembershipOption[];
  menus: MenuOption[];
  onCreatePermission: (formData: FormData) => void | Promise<void>;
  onDeletePermission: (formData: FormData) => void | Promise<void>;
  embedded?: boolean;
};

type ModalState =
  | { type: "create" }
  | { type: "delete"; permission: PermissionRow }
  | null;

export function PermissionsManager({
  permissions,
  organizations,
  memberships,
  menus,
  onCreatePermission,
  onDeletePermission,
  embedded = false,
}: PermissionsManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [filterOrganizationId, setFilterOrganizationId] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  const sortedPermissions = useMemo(
    () =>
      permissions
        .slice()
        .sort((a, b) => {
          const orgCompare = a.organization.name.localeCompare(b.organization.name);
          if (orgCompare !== 0) return orgCompare;
          const userCompare = a.user.fullName.localeCompare(b.user.fullName);
          if (userCompare !== 0) return userCompare;
          return a.menuItem.label.localeCompare(b.menuItem.label);
        }),
    [permissions],
  );

  const filteredPermissions = useMemo(() => {
    if (!filterOrganizationId) return sortedPermissions;
    return sortedPermissions.filter(
      (permission) => permission.organization.id === filterOrganizationId,
    );
  }, [sortedPermissions, filterOrganizationId]);

  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedPermissions = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredPermissions.slice(start, start + perPage);
  }, [filteredPermissions, currentPage, perPage]);

  const menuAccessByMember = useMemo(() => {
    const map = new Map<string, Set<string>>();
    permissions.forEach((permission) => {
      const key = `${permission.organization.id}:${permission.user.id}`;
      const current = map.get(key) ?? new Set<string>();
      current.add(permission.menuItem.id);
      map.set(key, current);
    });
    return map;
  }, [permissions]);

  const membersForOrganization = useMemo(() => {
    if (!selectedOrganizationId) return [];
    return memberships.filter(
      (membership) => membership.organizationId === selectedOrganizationId,
    );
  }, [memberships, selectedOrganizationId]);

  const availableMenus = useMemo(() => {
    if (!selectedOrganizationId || !selectedUserId) return menus;
    const key = `${selectedOrganizationId}:${selectedUserId}`;
    const assigned = menuAccessByMember.get(key) ?? new Set<string>();
    return menus.filter((menu) => !assigned.has(menu.id));
  }, [menus, menuAccessByMember, selectedOrganizationId, selectedUserId]);

  const organizationFilterOptions = useMemo(
    () => [
      { value: "", label: "All organizations" },
      ...organizations.map((organization) => ({
        value: organization.id,
        label: organization.name,
      })),
    ],
    [organizations],
  );

  const filteredOrganizationLabel =
    organizations.find((organization) => organization.id === filterOrganizationId)?.name ??
    "All organizations";

  const organizationModalOptions = useMemo(
    () =>
      organizations.map((organization) => ({
        value: organization.id,
        label: organization.name,
      })),
    [organizations],
  );

  const userModalOptions = useMemo(
    () =>
      membersForOrganization.map((membership) => ({
        value: membership.userId,
        label: `${membership.userName} (${membership.userEmail})`,
      })),
    [membersForOrganization],
  );

  const menuModalOptions = useMemo(
    () =>
      availableMenus.map((menu) => ({
        value: menu.id,
        label: `${menu.label} (${menu.path})`,
      })),
    [availableMenus],
  );

  const modalSelectTriggerClass =
    "rounded-xl border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2.5 font-medium hover:bg-[var(--color-raised)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]";

  const canSubmitPermission =
    Boolean(selectedOrganizationId) && Boolean(selectedUserId) && Boolean(selectedMenuItemId);

  function resetCreateForm() {
    setSelectedOrganizationId("");
    setSelectedUserId("");
    setSelectedMenuItemId("");
  }

  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          {embedded
            ? "Target a specific member inside one organization. These rules override role defaults for that workspace."
            : "Assign access per organization and user. These rules take priority over role defaults."}
        </p>
        <button
          type="button"
          onClick={() => {
            resetCreateForm();
            setModal({ type: "create" });
          }}
          className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold"
          disabled={organizations.length === 0 || memberships.length === 0}
        >
          Add Permission
        </button>
      </div>

      {organizations.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-text-muted)]">
          No organizations found. Create an organization before assigning user permissions.
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <div className="w-full min-w-[220px] sm:w-auto sm:min-w-[280px]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Filter by organization
            </p>
            <CustomSelect
              value={filterOrganizationId}
              onChange={(organizationId) => {
                setFilterOrganizationId(organizationId);
                setPage(1);
              }}
              options={organizationFilterOptions}
              placeholder="All organizations"
              aria-label="Filter by organization"
              className="mt-1.5"
              triggerClassName="rounded-xl border-[var(--color-border-hover)] bg-[var(--color-bg)] px-3 py-2.5 font-medium hover:bg-[var(--color-raised)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
              menuClassName="min-w-[280px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
            {filterOrganizationId ? (
              <button
                type="button"
                onClick={() => {
                  setFilterOrganizationId("");
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
            {filterOrganizationId ? (
              <span className="text-[var(--color-text-muted)]">in {filteredOrganizationLabel}</span>
            ) : null}
          </div>
        </div>
      )}

      <DataTable className="mt-4">
        <DataTableHeader className="hidden grid-cols-[56px_1.1fr_1.2fr_1.2fr_120px_80px] md:grid">
          <div>#</div>
          <div>Organization</div>
          <div>User</div>
          <div>Menu</div>
          <div>Created</div>
          <div className="text-right">Actions</div>
        </DataTableHeader>
        <DataTableBody>
          {pagedPermissions.map((permission, index) => (
            <DataTableRow
              key={permission.id}
              className="group items-center gap-2 md:grid-cols-[56px_1.1fr_1.2fr_1.2fr_120px_80px]"
            >
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                {String((currentPage - 1) * perPage + index + 1).padStart(2, "0")}
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">
                  {permission.organization.name}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">{permission.user.fullName}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{permission.user.email}</p>
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
                  label={`${permission.user.fullName} · ${permission.menuItem.label}`}
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
                      description: "Remove this user override",
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
              title="No user overrides yet"
              description="Assign menu access for a specific organization member."
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] px-4">
              <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                      Access Control
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">
                      Add User Permission
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      Grant a menu to a user inside one organization.
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

                <form action={onCreatePermission} className="mt-4 space-y-4">
                  <input type="hidden" name="organization_id" value={selectedOrganizationId} />
                  <input type="hidden" name="user_id" value={selectedUserId} />
                  <input type="hidden" name="menu_item_id" value={selectedMenuItemId} />

                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Organization</p>
                    <CustomSelect
                      value={selectedOrganizationId}
                      onChange={(organizationId) => {
                        setSelectedOrganizationId(organizationId);
                        setSelectedUserId("");
                        setSelectedMenuItemId("");
                      }}
                      options={organizationModalOptions}
                      placeholder="Select organization"
                      aria-label="Organization"
                      className="mt-1.5"
                      triggerClassName={modalSelectTriggerClass}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">User</p>
                    <CustomSelect
                      value={selectedUserId}
                      onChange={(userId) => {
                        setSelectedUserId(userId);
                        setSelectedMenuItemId("");
                      }}
                      options={userModalOptions}
                      placeholder="Select user"
                      disabled={!selectedOrganizationId}
                      aria-label="User"
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
                      disabled={!selectedOrganizationId || !selectedUserId}
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
                      disabled={!canSubmitPermission}
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
        title="Delete permission"
        description={
          modal?.type === "delete"
            ? `Remove ${modal.permission.menuItem.label} for ${modal.permission.user.fullName} in ${modal.permission.organization.name}?`
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
      title="Organization User Permissions"
      subtitle="Control which menus each user can access in a specific organization"
    >
      {content}
    </Panel>
  );
}

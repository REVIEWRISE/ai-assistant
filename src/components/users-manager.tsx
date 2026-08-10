"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CustomSelect } from "@/components/custom-select";
import { SearchableSelect } from "@/components/searchable-select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DataTable,
  DataTableBody,
  DataTableEmptyState,
  DataTableHeader,
  DataTablePagination,
  DataTableRow,
} from "@/components/data-table";

type RoleOption = {
  id: string;
  name: string;
};

type UserOrganization = {
  id: string;
  name: string;
  businessType?: string | null;
  description?: string | null;
  memberRole: string;
  createdAt: string | Date;
};

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  accountStatus: string;
  roleName: string;
  roleId?: string | null;
  createdAt: string | Date;
  organizations: UserOrganization[];
};

type UsersManagerProps = {
  users: UserRow[];
  roles: RoleOption[];
  onCreateUser: (formData: FormData) => void | Promise<void>;
  onUpdateUser: (formData: FormData) => void | Promise<void>;
  onDeleteUser: (formData: FormData) => void | Promise<void>;
};

type OverlayState =
  | { type: "create" }
  | { type: "edit"; user: UserRow }
  | { type: "delete"; user: UserRow }
  | null;

type StatusFilter = "all" | "active" | "invited" | "suspended";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]";

function initialsFor(name: string, email: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || email.slice(0, 2).toUpperCase()
  );
}

function statusClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "active") return "vr-app-status-success";
  if (normalized === "suspended") {
    return "bg-[var(--color-danger-soft)] text-[var(--color-danger)]";
  }
  return "vr-app-status-warning";
}

function statusLabel(status: string): string {
  const normalized = status.trim();
  return normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "Unknown";
}

function UserActionsMenu({
  user,
  isOpen,
  onToggle,
  onClose,
  onEdit,
  onDelete,
}: {
  user: UserRow;
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
      label: "Edit user",
      description: "Update name, role, or status",
      onClick: onEdit,
      danger: false,
    },
    {
      id: "delete",
      label: "Delete user",
      description: "Permanently remove this account",
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
        aria-label={`Open actions for ${user.fullName}`}
        title={`Actions for ${user.fullName}`}
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

export function UsersManager({
  users,
  roles,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}: UsersManagerProps) {
  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  const roleNames = useMemo(() => {
    const names = new Set(users.map((user) => user.roleName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const statusCounts = useMemo(() => {
    return {
      all: users.length,
      active: users.filter((user) => user.accountStatus === "active").length,
      invited: users.filter((user) => user.accountStatus === "invited").length,
      suspended: users.filter((user) => user.accountStatus === "suspended").length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users
      .filter((user) => {
        const matchesQuery =
          !normalizedQuery ||
          user.fullName.toLowerCase().includes(normalizedQuery) ||
          user.email.toLowerCase().includes(normalizedQuery) ||
          user.roleName.toLowerCase().includes(normalizedQuery);
        const matchesStatus =
          statusFilter === "all" || user.accountStatus.toLowerCase() === statusFilter;
        const matchesRole = roleFilter === "all" || user.roleName === roleFilter;
        return matchesQuery && matchesStatus && matchesRole;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [query, roleFilter, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredUsers.slice(start, start + perPage);
  }, [filteredUsers, currentPage, perPage]);

  function openCreateSheet() {
    setShowPassword(false);
    setSelectedOrganizationId("");
    setOverlay({ type: "create" });
  }

  function openEditSheet(user: UserRow) {
    setSelectedOrganizationId(
      user.organizations.find((organization) => organization.memberRole === "owner")?.id ?? "",
    );
    setOverlay({ type: "edit", user });
  }

  const userSheetOpen = overlay?.type === "create" || overlay?.type === "edit";
  const ownedOrganizations =
    overlay?.type === "edit"
      ? overlay.user.organizations.filter((organization) => organization.memberRole === "owner")
      : [];
  const selectedOrganization =
    ownedOrganizations.find((organization) => organization.id === selectedOrganizationId) ?? null;

  useEffect(() => {
    if (!userSheetOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOverlay(null);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [userSheetOpen]);

  const statusOptions = [
    { value: "all" as const, label: `All · ${statusCounts.all}` },
    { value: "active" as const, label: `Active · ${statusCounts.active}` },
    { value: "invited" as const, label: `Invited · ${statusCounts.invited}` },
    { value: "suspended" as const, label: `Suspended · ${statusCounts.suspended}` },
  ];

  const roleOptions = [
    { value: "all", label: "All roles" },
    ...roleNames.map((role) => ({ value: role, label: role })),
  ];

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between lg:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Directory
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Workspace users</h2>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
              {filteredUsers.length}
              {filteredUsers.length !== users.length ? ` of ${users.length}` : ""} shown
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Search accounts, filter by status or role, then edit access in place.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateSheet}
          className="shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
        >
          Add user
        </button>
      </div>

      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 lg:px-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <label className="block">
            <span className="sr-only">Search users</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, or role…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
            />
          </label>
          <CustomSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={statusOptions}
            aria-label="Filter by status"
            className="mt-0"
            triggerClassName="rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold"
          />
          <CustomSelect
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
              setPage(1);
            }}
            options={roleOptions}
            aria-label="Filter by role"
            className="mt-0"
            triggerClassName="rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold"
          />
        </div>
      </div>

      <div className="p-4 lg:p-5">
        <DataTable>
          <DataTableHeader className="hidden grid-cols-[minmax(220px,1.3fr)_minmax(200px,1fr)_120px_120px_120px] lg:grid lg:px-5">
            <div>User</div>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </DataTableHeader>

          <DataTableBody>
            {pagedUsers.map((user) => (
              <DataTableRow
                key={user.id}
                className="gap-4 py-4 hover:bg-[var(--color-bg)] lg:grid-cols-[minmax(220px,1.3fr)_minmax(200px,1fr)_120px_120px_120px] lg:items-center lg:px-5 lg:py-3.5"
              >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_22%,transparent),color-mix(in_srgb,var(--color-primary)_8%,transparent))] text-[11px] font-bold text-[var(--color-primary-h)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))]">
                  {initialsFor(user.fullName, user.email)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {user.fullName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                    Added {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] lg:hidden">
                  Email
                </p>
                <p className="truncate text-sm text-[var(--color-text-muted)]">{user.email}</p>
              </div>

              <div>
                <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)]">
                  {user.roleName}
                </span>
              </div>

              <div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(user.accountStatus)}`}
                >
                  {statusLabel(user.accountStatus)}
                </span>
              </div>

              <div className="flex items-center lg:justify-end">
                <UserActionsMenu
                  user={user}
                  isOpen={openMenuId === user.id}
                  onToggle={() =>
                    setOpenMenuId((current) => (current === user.id ? null : user.id))
                  }
                  onClose={() => setOpenMenuId(null)}
                  onEdit={() => openEditSheet(user)}
                  onDelete={() => setOverlay({ type: "delete", user })}
                />
              </div>
            </DataTableRow>
          ))}

          {filteredUsers.length === 0 ? (
            <DataTableEmptyState
              title={users.length === 0 ? "No users yet" : "No matching users"}
              description={
                users.length === 0
                  ? "Add the first account to begin building your team."
                  : "Try a different search, status, or role filter."
              }
              action={
                users.length === 0 ? (
                  <button
                    type="button"
                    onClick={openCreateSheet}
                    className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)]"
                  >
                    Add user
                  </button>
                ) : null
              }
            />
          ) : null}
        </DataTableBody>
        <DataTablePagination
          totalItems={filteredUsers.length}
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          itemLabel="users"
        />
        </DataTable>
      </div>

      {overlay && overlay.type !== "delete"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex justify-end bg-[var(--color-overlay)] backdrop-blur-sm">
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Close user sheet"
                onClick={() => setOverlay(null)}
              />
              <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-sheet-title"
                className="relative flex h-full w-full max-w-2xl flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]"
              >
                <header className="relative shrink-0 overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#0b0b0b_0%,#171717_52%,#292929_100%)] px-5 py-6 text-white sm:px-6">
                  <div className="pointer-events-none absolute -right-12 -top-24 size-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setOverlay(null)}
                    className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl leading-none text-neutral-300 transition hover:bg-white/10 hover:text-white"
                    aria-label="Close user sheet"
                  >
                    ×
                  </button>

                  <div className="relative pr-12">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                      User management
                    </p>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-bold text-white shadow-inner">
                        {overlay.type === "edit"
                          ? initialsFor(overlay.user.fullName, overlay.user.email)
                          : "+"}
                      </div>
                      <div className="min-w-0">
                        <h2
                          id="user-sheet-title"
                          className="truncate text-2xl font-semibold tracking-[-0.025em] text-white"
                        >
                          {overlay.type === "create" ? "Create a new user" : overlay.user.fullName}
                        </h2>
                        <p className="mt-1 truncate text-sm text-neutral-400">
                          {overlay.type === "create"
                            ? "Set up identity, access, and an optional organization."
                            : overlay.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold text-neutral-200">
                        {overlay.type === "create" ? "New account" : statusLabel(overlay.user.accountStatus)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold text-neutral-200">
                        {overlay.type === "create" ? "Role pending" : overlay.user.roleName}
                      </span>
                      {overlay.type === "edit" ? (
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold text-neutral-200">
                          {overlay.user.organizations.length} workspace{overlay.user.organizations.length === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </header>

                <form
                  key={
                    overlay.type === "edit"
                      ? `${overlay.user.id}:${selectedOrganizationId}`
                      : "create-user"
                  }
                  action={overlay.type === "create" ? onCreateUser : onUpdateUser}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  {overlay.type === "edit" ? (
                    <input type="hidden" name="id" value={overlay.user.id} />
                  ) : null}

                  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                    <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                      <div className="flex items-start gap-3 border-b border-[var(--color-border)] px-5 py-4">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[11px] font-bold text-[var(--color-primary-h)]">
                          01
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--color-text)]">Account and access</h3>
                          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                            Personal details, sign-in credentials, and workspace permissions.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-5 p-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-[var(--color-text)]">
                        Full name
                        <input
                          type="text"
                          name="full_name"
                          defaultValue={overlay.type === "edit" ? overlay.user.fullName : ""}
                          placeholder="Jane Doe"
                          autoComplete="name"
                          required
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-xs font-semibold text-[var(--color-text)]">
                        Work email
                        <input
                          type="email"
                          name="email"
                          defaultValue={overlay.type === "edit" ? overlay.user.email : ""}
                          placeholder="jane@company.com"
                          autoComplete="email"
                          required
                          className={fieldClass}
                        />
                      </label>
                        </div>

                        {overlay.type === "create" ? (
                          <label className="block text-xs font-semibold text-[var(--color-text)]">
                            Temporary password
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Create a secure password"
                                autoComplete="new-password"
                                minLength={12}
                                required
                                className={`${fieldClass} pr-16`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((previous) => !previous)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--color-primary-h)] transition hover:bg-[var(--color-primary-soft)]"
                              >
                                {showPassword ? "Hide" : "Show"}
                              </button>
                            </div>
                            <span className="mt-1.5 block font-normal leading-relaxed text-[var(--color-text-muted)]">
                              Use at least 12 characters with uppercase, lowercase, number, and symbol.
                            </span>
                          </label>
                        ) : null}

                        <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-[var(--color-text)]">
                        Role
                        <div className="mt-1.5">
                          <SearchableSelect
                            name="role_id"
                            placeholder="Select role"
                            defaultValue={overlay.type === "edit" ? overlay.user.roleId ?? "" : ""}
                            options={roles.map((role) => ({
                              value: role.id,
                              label: role.name,
                            }))}
                          />
                        </div>
                      </label>
                      <label className="block text-xs font-semibold text-[var(--color-text)]">
                        Account status
                        <div className="mt-1.5">
                          <SearchableSelect
                            name="account_status"
                            placeholder="Select status"
                            defaultValue={
                              overlay.type === "edit" ? overlay.user.accountStatus : "active"
                            }
                            options={[
                              { value: "active", label: "Active" },
                              { value: "invited", label: "Invited" },
                              { value: "suspended", label: "Suspended" },
                            ]}
                          />
                        </div>
                      </label>
                        </div>
                      </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[11px] font-bold text-[var(--color-primary-h)]">
                            02
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold text-[var(--color-text)]">
                          {overlay.type === "create"
                                ? "Organization profile"
                                : "Organizations and ownership"}
                            </h3>
                            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                              {overlay.type === "create"
                                ? "Connect an optional business workspace to this account."
                                : "Update an owned workspace and review all memberships."}
                            </p>
                          </div>
                        </div>
                        {overlay.type === "create" ? (
                          <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
                            Optional
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-5 p-5">
                      {overlay.type === "edit" && ownedOrganizations.length > 1 ? (
                        <label className="block text-xs font-semibold text-[var(--color-text)]">
                          Organization to edit
                          <div className="mt-1.5">
                            <SearchableSelect
                              name="organization_picker"
                              placeholder="Select organization"
                              value={selectedOrganizationId}
                              onChange={setSelectedOrganizationId}
                              options={ownedOrganizations.map((organization) => ({
                                value: organization.id,
                                label: organization.name,
                                description: organization.businessType || "Business type not added",
                              }))}
                            />
                          </div>
                        </label>
                      ) : null}

                      <input
                        type="hidden"
                        name="organization_id"
                        value={selectedOrganization?.id ?? ""}
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-[var(--color-text)]">
                          Organization name
                          <input
                            type="text"
                            name="organization_name"
                            defaultValue={selectedOrganization?.name ?? ""}
                            placeholder="Acme Hospitality"
                            maxLength={100}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block text-xs font-semibold text-[var(--color-text)]">
                          Business or service type
                          <input
                            type="text"
                            name="business_type"
                            defaultValue={selectedOrganization?.businessType ?? ""}
                            placeholder="Restaurant, hotel, transport…"
                            list="user-organization-types"
                            maxLength={80}
                            className={fieldClass}
                          />
                          <datalist id="user-organization-types">
                            <option value="Restaurant" />
                            <option value="Hotel" />
                            <option value="Service Appointment" />
                            <option value="Transportation" />
                          </datalist>
                        </label>
                      </div>

                      <label className="block text-xs font-semibold text-[var(--color-text)]">
                        What does this organization do?
                        <textarea
                          name="organization_description"
                          defaultValue={selectedOrganization?.description ?? ""}
                          placeholder="Describe its customers, services, operating area, and how it helps them."
                          rows={5}
                          maxLength={2000}
                          className={`${fieldClass} min-h-32 resize-y leading-relaxed`}
                        />
                        <span className="mt-1.5 block font-normal text-[var(--color-text-muted)]">
                          Up to 2,000 characters. This gives administrators context about the business.
                        </span>
                      </label>

                      {overlay.type === "edit" && overlay.user.organizations.length > 0 ? (
                        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                            <div>
                              <p className="text-xs font-semibold text-[var(--color-text)]">Workspace access</p>
                              <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">Every organization connected to this user</p>
                            </div>
                            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-primary-h)]">
                              {overlay.user.organizations.length}
                            </span>
                          </div>
                          <div className="divide-y divide-[var(--color-border)]">
                            {overlay.user.organizations.map((organization) => (
                              <div
                                key={organization.id}
                                className="flex items-center justify-between gap-3 bg-[var(--color-surface)] px-4 py-3"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[10px] font-bold text-[var(--color-primary-h)]">
                                    {organization.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                                      {organization.name}
                                    </p>
                                    <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                                      {organization.businessType || "Business type not added"}
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold capitalize text-[var(--color-primary-h)]">
                                  {organization.memberRole}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      </div>
                    </section>
                  </div>

                  <footer className="flex shrink-0 flex-col gap-3 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                      {overlay.type === "create"
                        ? "The user can sign in as soon as the account is created."
                        : "Changes apply to this account immediately."}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOverlay(null)}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--color-primary-h)]"
                      >
                        {overlay.type === "create" ? "Create user" : "Save changes"}
                      </button>
                    </div>
                  </footer>
                </form>
              </aside>
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={overlay?.type === "delete"}
        title="Delete user"
        description={
          overlay?.type === "delete"
            ? `This will permanently remove “${overlay.user.fullName}”.`
            : ""
        }
        confirmLabel="Delete user"
        onCancel={() => setOverlay(null)}
        action={onDeleteUser}
        hiddenFields={
          overlay?.type === "delete" ? [{ name: "id", value: overlay.user.id }] : []
        }
      />
    </section>
  );
}

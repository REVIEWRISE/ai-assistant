"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";
import { SearchableSelect } from "@/components/searchable-select";
import { ConfirmDialog } from "@/components/confirm-dialog";

type RoleOption = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  accountStatus: string;
  roleName: string;
  roleId?: string | null;
  createdAt: string | Date;
};

type UsersManagerProps = {
  users: UserRow[];
  roles: RoleOption[];
  onCreateUser: (formData: FormData) => void | Promise<void>;
  onUpdateUser: (formData: FormData) => void | Promise<void>;
  onDeleteUser: (formData: FormData) => void | Promise<void>;
};

type ModalState =
  | { type: "create" }
  | { type: "edit"; user: UserRow }
  | { type: "delete"; user: UserRow }
  | null;

export function UsersManager({
  users,
  roles,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}: UsersManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [showPassword, setShowPassword] = useState(false);

  const sortedUsers = useMemo(
    () => users.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users],
  );

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return sortedUsers.slice(start, start + perPage);
  }, [sortedUsers, currentPage, perPage]);

  return (
    <Panel title="User Directory" subtitle="Create, edit, and remove users">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          Manage who has access to the workspace.
        </p>
        <button
          type="button"
          onClick={() => setModal({ type: "create" })}
          className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold"
        >
          Add User
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="vr-app-table-header hidden grid-cols-[72px_1.2fr_1.2fr_140px_140px_140px] items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] md:grid">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
            Index
          </div>
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-[var(--color-border-muted)]">
          {pagedUsers.map((user, index) => (
            <div
              key={user.id}
              className="group grid items-center gap-2 px-4 py-3 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)] md:grid-cols-[72px_1.2fr_1.2fr_140px_140px_140px]"
            >
              <div className="text-xs font-semibold text-[var(--color-text-muted)] md:text-sm">
                <span className="inline-flex min-w-[44px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {String((currentPage - 1) * perPage + index + 1).padStart(2, "0")}
                </span>
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">{user.fullName}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Created {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-xs font-semibold text-[var(--color-text-muted)] md:text-sm">
                {user.email}
              </div>
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                {user.roleName}
              </div>
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                {user.accountStatus}
              </div>
              <div className="flex items-center justify-start gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => setModal({ type: "edit", user })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg)] group-hover:border-[var(--color-border-hover)]"
                  aria-label={`Edit ${user.fullName}`}
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
                  onClick={() => setModal({ type: "delete", user })}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[var(--color-danger-soft)] text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))] transition hover:brightness-95"
                  aria-label={`Delete ${user.fullName}`}
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
          {sortedUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No users yet. Create your first user.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <div>
          Showing{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {sortedUsers.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {Math.min(currentPage * perPage, sortedUsers.length)}
          </span>{" "}
          of <span className="font-semibold text-[var(--color-text)]">{sortedUsers.length}</span>
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
                      User Management
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">
                      {modal.type === "create" ? "Add User" : "Edit User"}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {modal.type === "create"
                        ? "Invite a new user to the workspace."
                        : "Update user profile details."}
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
                  action={modal.type === "create" ? onCreateUser : onUpdateUser}
                  className="mt-4 space-y-4"
                >
                  {modal.type === "edit" ? (
                    <input type="hidden" name="id" value={modal.user.id} />
                  ) : null}
                  <label className="block text-sm text-[var(--color-text)]">
                    Full name
                    <input
                      type="text"
                      name="full_name"
                      defaultValue={modal.type === "edit" ? modal.user.fullName : ""}
                      placeholder="Jane Doe"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                    />
                  </label>
                  <label className="block text-sm text-[var(--color-text)]">
                    Email
                    <input
                      type="email"
                      name="email"
                      defaultValue={modal.type === "edit" ? modal.user.email : ""}
                      placeholder="you@company.com"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                    />
                  </label>
                  {modal.type === "create" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm text-[var(--color-text)]">
                        Temporary password
                        <div className="relative mt-1">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="Create a secure password"
                            className="w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 pr-10 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                          >
                            {showPassword ? (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M3 3l18 18" />
                                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9.3 3.4 10.9 8-0.5 1.4-1.3 2.7-2.3 3.8" />
                                <path d="M6.2 6.2C4 7.7 2.4 9.7 1.1 12c1.9 4.6 6.2 8 10.9 8 1.6 0 3.2-0.4 4.6-1" />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M1.1 12C3 7.4 7.3 4 12 4s9 3.4 10.9 8c-1.9 4.6-6.2 8-10.9 8s-9-3.4-10.9-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </label>
                      <label className="block text-sm text-[var(--color-text)]">
                        Status
                        <div className="mt-1">
                          <SearchableSelect
                            name="account_status"
                            placeholder="Select status"
                            defaultValue="active"
                            options={[
                              { value: "active", label: "Active" },
                              { value: "suspended", label: "Suspended" },
                              { value: "invited", label: "Invited" },
                            ]}
                          />
                        </div>
                      </label>
                    </div>
                  ) : null}
                  <label className="block text-sm text-[var(--color-text)]">
                    Role
                    <div className="mt-1">
                      <SearchableSelect
                        name="role_id"
                        placeholder="Select role"
                        defaultValue={modal.type === "edit" ? modal.user.roleId ?? "" : ""}
                        options={roles.map((role) => ({
                          value: role.id,
                          label: role.name,
                        }))}
                      />
                    </div>
                  </label>
                  {modal.type === "edit" ? (
                    <label className="block text-sm text-[var(--color-text)]">
                      Status
                      <div className="mt-1">
                        <SearchableSelect
                          name="account_status"
                          placeholder="Select status"
                          defaultValue={modal.user.accountStatus}
                          options={[
                            { value: "active", label: "Active" },
                            { value: "suspended", label: "Suspended" },
                            { value: "invited", label: "Invited" },
                          ]}
                        />
                      </div>
                    </label>
                  ) : null}

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
                      {modal.type === "create" ? "Create User" : "Save Changes"}
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
        title="Delete user"
        description={
          modal?.type === "delete"
            ? `This will permanently remove "${modal.user.fullName}".`
            : ""
        }
        confirmLabel="Delete User"
        onCancel={() => setModal(null)}
        action={onDeleteUser}
        hiddenFields={
          modal?.type === "delete" ? [{ name: "id", value: modal.user.id }] : []
        }
      />
    </Panel>
  );
}

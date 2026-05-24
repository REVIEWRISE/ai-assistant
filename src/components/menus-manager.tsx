"use client";

import { Fragment, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";

type MenuRow = {
  id: string;
  label: string;
  path: string;
  description: string | null;
  parentId?: string | null;
  icon?: string | null;
  sortOrder?: number | null;
  createdAt: string | Date;
};

type MenusManagerProps = {
  menus: MenuRow[];
  onCreateMenu: (formData: FormData) => void | Promise<void>;
  onUpdateMenu: (formData: FormData) => void | Promise<void>;
  onDeleteMenu: (formData: FormData) => void | Promise<void>;
};

type ModalState =
  | { type: "create" }
  | { type: "edit"; menu: MenuRow }
  | { type: "delete"; menu: MenuRow }
  | null;

function sortMenus(a: MenuRow, b: MenuRow): number {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label);
}

type MenuTreeNode = MenuRow & { children: MenuTreeNode[] };

function buildMenuTree(menus: MenuRow[]): MenuTreeNode[] {
  const menuById = new Map(menus.map((m) => [m.id, m]));
  const childrenMap = new Map<string, MenuRow[]>();
  for (const m of menus) {
    if (!m.parentId || !menuById.has(m.parentId)) continue;
    const list = childrenMap.get(m.parentId) ?? [];
    list.push(m);
    childrenMap.set(m.parentId, list);
  }
  for (const [, list] of childrenMap) {
    list.sort(sortMenus);
  }

  function toNode(row: MenuRow): MenuTreeNode {
    const raw = childrenMap.get(row.id) ?? [];
    return { ...row, children: raw.map(toNode) };
  }

  return menus
    .filter((m) => !m.parentId || !menuById.has(m.parentId))
    .sort(sortMenus)
    .map(toNode);
}

export function MenusManager({
  menus,
  onCreateMenu,
  onUpdateMenu,
  onDeleteMenu,
}: MenusManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  const menuTree = useMemo(() => buildMenuTree(menus), [menus]);

  const totalPages = Math.max(1, Math.ceil(menuTree.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedTree = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return menuTree.slice(start, start + perPage);
  }, [menuTree, currentPage, perPage]);

  const topLevelMenus = useMemo(() => menus.filter((menu) => !menu.parentId), [menus]);

  const parentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    menus.forEach((menu) => {
      map.set(menu.id, menu.label);
    });
    return map;
  }, [menus]);

  const gridHeaderClass =
    "hidden grid-cols-[52px_minmax(0,1fr)_minmax(0,1.1fr)_120px_120px_160px] items-center gap-2 vr-app-table-header px-4 py-3 md:grid";
  const gridRowClass =
    "group grid items-center gap-2 px-4 py-3 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)] md:grid-cols-[52px_minmax(0,1fr)_minmax(0,1.1fr)_120px_120px_160px]";
  const hasAnySubMenus = menus.length > menuTree.length;

  function renderMenuRow(
    menu: MenuRow,
    opts: { rowKey: string; indexLabel: string; depth: number },
  ) {
    const { rowKey, indexLabel, depth } = opts;
    const isNested = depth > 0;

    return (
      <div key={rowKey} className={gridRowClass}>
        <div className="text-xs font-semibold text-[var(--color-text-muted)] md:text-sm">
          <span
            className={`inline-flex min-w-[44px] items-center justify-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
              isNested
                ? "border-[var(--color-border-muted)] bg-[var(--color-raised)]/80 text-[var(--color-text-muted)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
            }`}
          >
            {indexLabel}
          </span>
        </div>
        <div
          className={`min-w-0 ${isNested ? "border-l-2 border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]" : ""}`}
          style={isNested ? { paddingLeft: 12 + Math.min(depth, 8) * 14 } : undefined}
        >
          <p className="font-semibold text-[var(--color-text)]">{menu.label}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {isNested ? `Under ${parentLabelById.get(menu.parentId ?? "") ?? "parent"} · ` : null}
            {menu.description ?? "No description"}
          </p>
        </div>
        <div className="truncate text-xs font-semibold text-[var(--color-text-muted)] md:text-sm">{menu.path}</div>
        <div className="text-xs font-semibold text-[var(--color-text-muted)]">{menu.sortOrder ?? 0}</div>
        <div className="text-xs font-semibold text-[var(--color-text-muted)]">
          {new Date(menu.createdAt).toLocaleDateString()}
        </div>
        <div className="flex items-center justify-start gap-2 md:justify-end">
          <button
            type="button"
            onClick={() => setModal({ type: "edit", menu })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg)] group-hover:border-[var(--color-border-hover)]"
            aria-label={`Edit ${menu.label}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setModal({ type: "delete", menu })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[var(--color-danger-soft)] text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))] transition hover:brightness-95"
            aria-label={`Delete ${menu.label}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  function renderMenuSubtree(node: MenuTreeNode, indexLabel: string, depth: number) {
    return (
      <>
        {renderMenuRow(node, { rowKey: `menu-${node.id}`, indexLabel, depth })}
        {node.children.map((child, cIdx) => (
          <Fragment key={child.id}>
            {renderMenuSubtree(child, `${indexLabel}.${cIdx + 1}`, depth + 1)}
          </Fragment>
        ))}
      </>
    );
  }

  return (
    <Panel title="Menu Catalog" subtitle="Create, edit, and remove navigation items">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm text-[var(--color-text-muted)]">
            Menus define the navigation structure and routes in the app.
          </p>
          {menus.length > 0 && !hasAnySubMenus ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold">Sub-menus</span> are listed under their parent. Edit a menu (or add one) and set{" "}
              <span className="font-semibold">Parent menu</span> to nest it.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: "create" })}
          className="rounded-xl vr-btn-primary px-4 py-2 text-sm font-semibold"
        >
          Add Menu
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className={gridHeaderClass}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
            Index
          </div>
          <div>Label</div>
          <div>Path</div>
          <div>Order</div>
          <div>Created</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-[var(--color-border-muted)]">
          {pagedTree.map((node, index) => {
            const parentIndex = String((currentPage - 1) * perPage + index + 1).padStart(2, "0");
            return (
              <div key={node.id} className="divide-y divide-[var(--color-border-muted)]">
                {renderMenuSubtree(node, parentIndex, 0)}
              </div>
            );
          })}
          {menus.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No menus yet. Create your first menu.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <div>
          <span className="text-[var(--color-text-muted)]">
            {menus.length} menu{menus.length === 1 ? "" : "s"} total
            {menuTree.length > 0 ? ` · ${menuTree.length} top-level` : null}
            {menus.length > menuTree.length
              ? ` · ${menus.length - menuTree.length} sub-menu${menus.length - menuTree.length === 1 ? "" : "s"}`
              : null}
          </span>
          <span className="mx-2 text-[var(--color-text-subtle)]">|</span>
          Showing{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {menuTree.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {Math.min(currentPage * perPage, menuTree.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-[var(--color-text)]">{menuTree.length}</span> top-level
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
                      {modal.type === "create" ? "Add Menu" : "Edit Menu"}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {modal.type === "create"
                        ? "Create a new menu entry."
                        : "Update the menu details."}
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
                  action={modal.type === "create" ? onCreateMenu : onUpdateMenu}
                  className="mt-4 space-y-4"
                >
                  {modal.type === "edit" ? (
                    <input type="hidden" name="id" value={modal.menu.id} />
                  ) : null}
                  <label className="block text-sm text-[var(--color-text)]">
                    Label
                    <input
                      type="text"
                      name="label"
                      defaultValue={modal.type === "edit" ? modal.menu.label : ""}
                      placeholder="e.g. Reporting"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                    />
                  </label>
                  <label className="block text-sm text-[var(--color-text)]">
                    Path
                    <input
                      type="text"
                      name="path"
                      defaultValue={modal.type === "edit" ? modal.menu.path : ""}
                      placeholder="/settings/reporting"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                    />
                  </label>
                  <label className="block text-sm text-[var(--color-text)]">
                    Parent menu
                    <select
                      name="parent_id"
                      defaultValue={modal.type === "edit" ? modal.menu.parentId ?? "" : ""}
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                    >
                      <option value="">No parent</option>
                      {topLevelMenus
                        .filter((menu) => (modal.type === "edit" ? menu.id !== modal.menu.id : true))
                        .map((menu) => (
                          <option key={menu.id} value={menu.id}>
                            {menu.label}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm text-[var(--color-text)]">
                      Icon key
                      <input
                        type="text"
                        name="icon"
                        defaultValue={modal.type === "edit" ? modal.menu.icon ?? "" : ""}
                        placeholder="e.g. shield, chart"
                        className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                      />
                    </label>
                    <label className="block text-sm text-[var(--color-text)]">
                      Sort order
                      <input
                        type="number"
                        name="sort_order"
                        defaultValue={modal.type === "edit" ? modal.menu.sortOrder ?? 0 : 0}
                        className="mt-1 w-full rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] transition focus:bg-[var(--color-bg)] focus:ring"
                      />
                    </label>
                  </div>
                  <label className="block text-sm text-[var(--color-text)]">
                    Description
                    <input
                      type="text"
                      name="description"
                      defaultValue={modal.type === "edit" ? modal.menu.description ?? "" : ""}
                      placeholder="Optional description"
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
                      {modal.type === "create" ? "Create Menu" : "Save Changes"}
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
        title="Delete menu"
        description={
          modal?.type === "delete"
            ? `This will permanently remove "${modal.menu.label}".`
            : ""
        }
        confirmLabel="Delete Menu"
        onCancel={() => setModal(null)}
        action={onDeleteMenu}
        hiddenFields={
          modal?.type === "delete" ? [{ name: "id", value: modal.menu.id }] : []
        }
      />
    </Panel>
  );
}

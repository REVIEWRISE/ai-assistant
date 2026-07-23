"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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

type MenuRow = {
  id: string;
  label: string;
  path: string;
  description: string | null;
  parentId?: string | null;
  icon?: string | null;
  sortOrder?: number | null;
  createdAt: string | Date;
  childCount?: number;
  grantCount?: number;
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

type LevelFilter = "all" | "top" | "nested";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]";

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

function MenuActionsMenu({
  menu,
  isOpen,
  onToggle,
  onClose,
  onEdit,
  onDelete,
}: {
  menu: MenuRow;
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

  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-label={`Open actions for ${menu.label}`}
        title={`Actions for ${menu.label}`}
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
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onEdit();
                  onClose();
                }}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition hover:bg-[var(--color-surface)]"
              >
                <span className="text-sm font-semibold text-[var(--color-text)]">Edit menu</span>
                <span className="text-[11px] leading-snug text-[var(--color-text-muted)]">
                  Update label, path, or nesting
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition hover:bg-[var(--color-danger-soft)]"
              >
                <span className="text-sm font-semibold text-[var(--color-danger)]">Delete menu</span>
                <span className="text-[11px] leading-snug text-[var(--color-text-muted)]">
                  Permanently remove this route
                </span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function MenusManager({
  menus,
  onCreateMenu,
  onUpdateMenu,
  onDeleteMenu,
}: MenusManagerProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");

  const filteredMenus = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return menus.filter((menu) => {
      const matchesQuery =
        !normalizedQuery ||
        menu.label.toLowerCase().includes(normalizedQuery) ||
        menu.path.toLowerCase().includes(normalizedQuery) ||
        (menu.description ?? "").toLowerCase().includes(normalizedQuery);
      const isTop = !menu.parentId;
      const matchesLevel =
        levelFilter === "all" ||
        (levelFilter === "top" && isTop) ||
        (levelFilter === "nested" && !isTop);
      return matchesQuery && matchesLevel;
    });
  }, [levelFilter, menus, query]);

  const menuTree = useMemo(() => buildMenuTree(filteredMenus), [filteredMenus]);
  const totalPages = Math.max(1, Math.ceil(menuTree.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedTree = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return menuTree.slice(start, start + perPage);
  }, [menuTree, currentPage, perPage]);

  const topLevelMenus = useMemo(() => menus.filter((menu) => !menu.parentId), [menus]);
  const nestedCount = menus.length - topLevelMenus.length;
  const hasAnySubMenus = nestedCount > 0;

  const levelCounts = {
    all: menus.length,
    top: topLevelMenus.length,
    nested: nestedCount,
  };

  const parentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    menus.forEach((menu) => {
      map.set(menu.id, menu.label);
    });
    return map;
  }, [menus]);

  const levelFilters: Array<{ key: LevelFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "top", label: "Top level" },
    { key: "nested", label: "Nested" },
  ];

  const levelOptions = levelFilters.map((filter) => ({
    value: filter.key,
    label: `${filter.label} · ${levelCounts[filter.key]}`,
  }));

  function renderMenuRow(
    menu: MenuRow,
    opts: { rowKey: string; indexLabel: string; depth: number },
  ) {
    const { rowKey, indexLabel, depth } = opts;
    const isNested = depth > 0;
    const grantCount = menu.grantCount ?? 0;

    return (
      <DataTableRow
        key={rowKey}
        className="group gap-4 py-4 hover:bg-[var(--color-bg)] lg:grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_88px_100px_120px] lg:items-center lg:px-5 lg:py-3.5"
      >
        <div
          className={`flex min-w-0 items-start gap-3 ${isNested ? "border-l-2 border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]" : ""}`}
          style={isNested ? { paddingLeft: 10 + Math.min(depth, 6) * 12 } : undefined}
        >
          <div
            className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${
              isNested
                ? "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
                : "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary)_22%,transparent),color-mix(in_srgb,var(--color-primary)_8%,transparent))] text-[var(--color-primary-h)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))]"
            }`}
          >
            {indexLabel}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-text)]">{menu.label}</p>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {isNested ? `Under ${parentLabelById.get(menu.parentId ?? "") ?? "parent"} · ` : null}
              {menu.description ?? "No description"}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] lg:hidden">
            Path
          </p>
          <p className="truncate font-mono text-xs text-[var(--color-text-muted)]">{menu.path}</p>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] lg:hidden">
            Order
          </p>
          <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--color-text)]">
            {menu.sortOrder ?? 0}
          </span>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] lg:hidden">
            Grants
          </p>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
              grantCount > 0 ? "vr-app-status-success" : "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
            }`}
          >
            {grantCount}
          </span>
        </div>

        <div className="flex items-center lg:justify-end">
          <MenuActionsMenu
            menu={menu}
            isOpen={openMenuId === menu.id}
            onToggle={() =>
              setOpenMenuId((current) => (current === menu.id ? null : menu.id))
            }
            onClose={() => setOpenMenuId(null)}
            onEdit={() => setModal({ type: "edit", menu })}
            onDelete={() => setModal({ type: "delete", menu })}
          />
        </div>
      </DataTableRow>
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
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between lg:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Catalog
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Navigation menus</h2>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
              {filteredMenus.length}
              {filteredMenus.length !== menus.length ? ` of ${menus.length}` : ""} shown
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Define routes that can be granted through roles and user overrides.
          </p>
          {menus.length > 0 && !hasAnySubMenus ? (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Set a <span className="font-semibold">Parent menu</span> when adding or editing to nest items.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: "create" })}
          className="shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
        >
          Add menu
        </button>
      </div>

      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 lg:px-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="block">
            <span className="sr-only">Search menus</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by label, path, or description…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
            />
          </label>
          <CustomSelect
            value={levelFilter}
            onChange={(value) => {
              setLevelFilter(value);
              setPage(1);
            }}
            options={levelOptions}
            aria-label="Filter by menu level"
            className="mt-0"
            triggerClassName="rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold"
          />
        </div>
      </div>

      <div className="p-4 lg:p-5">
        <DataTable>
          <DataTableHeader className="hidden grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_88px_100px_120px] lg:grid lg:px-5">
            <div>Menu</div>
            <div>Path</div>
            <div>Order</div>
            <div>Grants</div>
            <div className="text-right">Actions</div>
          </DataTableHeader>
        <DataTableBody>
          {pagedTree.map((node, index) => {
            const parentIndex = String((currentPage - 1) * perPage + index + 1).padStart(2, "0");
            return (
              <Fragment key={node.id}>{renderMenuSubtree(node, parentIndex, 0)}</Fragment>
            );
          })}
          {filteredMenus.length === 0 ? (
            <DataTableEmptyState
              title={menus.length === 0 ? "No menus yet" : "No matching menus"}
              description={
                menus.length === 0
                  ? "Create the first menu to begin defining navigation access."
                  : "Try a different search or level filter."
              }
              action={
                menus.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setModal({ type: "create" })}
                    className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)]"
                  >
                    Add menu
                  </button>
                ) : null
              }
            />
          ) : null}
        </DataTableBody>
        <DataTablePagination
          totalItems={menuTree.length}
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
          itemLabel="top-level menus"
          summary={
            <p>
              <span className="font-semibold text-[var(--color-text)]">{menus.length}</span> menus ·{" "}
              <span className="font-semibold text-[var(--color-text)]">{topLevelMenus.length}</span>{" "}
              top-level ·{" "}
              <span className="font-semibold text-[var(--color-text)]">{nestedCount}</span> nested
            </p>
          }
        />
        </DataTable>
      </div>

      {modal && modal.type !== "delete"
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_42%,transparent)] px-4 backdrop-blur-sm">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="menu-dialog-title"
                className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
                      Access control
                    </p>
                    <h2
                      id="menu-dialog-title"
                      className="mt-1 text-lg font-semibold text-[var(--color-text)]"
                    >
                      {modal.type === "create" ? "Add a menu" : "Edit menu"}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {modal.type === "create"
                        ? "Create a navigation entry that can be granted to roles."
                        : "Update the menu label, path, nesting, or order."}
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
                  action={modal.type === "create" ? onCreateMenu : onUpdateMenu}
                  className="space-y-4 p-5"
                >
                  {modal.type === "edit" ? (
                    <input type="hidden" name="id" value={modal.menu.id} />
                  ) : null}
                  <label className="block text-xs font-semibold text-[var(--color-text)]">
                    Label
                    <input
                      type="text"
                      name="label"
                      defaultValue={modal.type === "edit" ? modal.menu.label : ""}
                      placeholder="e.g. Reporting"
                      required
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[var(--color-text)]">
                    Path
                    <input
                      type="text"
                      name="path"
                      defaultValue={modal.type === "edit" ? modal.menu.path : ""}
                      placeholder="/settings/reporting"
                      required
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[var(--color-text)]">
                    Parent menu
                    <select
                      name="parent_id"
                      defaultValue={modal.type === "edit" ? modal.menu.parentId ?? "" : ""}
                      className={fieldClass}
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-[var(--color-text)]">
                      Icon key
                      <input
                        type="text"
                        name="icon"
                        defaultValue={modal.type === "edit" ? modal.menu.icon ?? "" : ""}
                        placeholder="e.g. shield, chart"
                        className={fieldClass}
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[var(--color-text)]">
                      Sort order
                      <input
                        type="number"
                        name="sort_order"
                        defaultValue={modal.type === "edit" ? (modal.menu.sortOrder ?? 0) : 0}
                        className={fieldClass}
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-semibold text-[var(--color-text)]">
                    Description
                    <input
                      type="text"
                      name="description"
                      defaultValue={modal.type === "edit" ? modal.menu.description ?? "" : ""}
                      placeholder="Optional description"
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
                      {modal.type === "create" ? "Create menu" : "Save changes"}
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
            ? `This will permanently remove “${modal.menu.label}”.`
            : ""
        }
        confirmLabel="Delete menu"
        onCancel={() => setModal(null)}
        action={onDeleteMenu}
        hiddenFields={
          modal?.type === "delete" ? [{ name: "id", value: modal.menu.id }] : []
        }
      />
    </section>
  );
}

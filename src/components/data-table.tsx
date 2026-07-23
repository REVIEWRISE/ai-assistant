import type { ReactNode } from "react";

function joinClasses(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(" ");
}

export function DataTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTableHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-raised)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTableBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={joinClasses("divide-y divide-[var(--color-border-muted)]", className)}>
      {children}
    </div>
  );
}

export function DataTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "grid gap-3 px-4 py-3 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTableEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function DataTablePagination({
  totalItems,
  currentPage,
  totalPages,
  perPage,
  onPageChange,
  onPerPageChange,
  pageSizes = [5, 10, 20, 50],
  itemLabel = "items",
  summary,
}: {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (size: number) => void;
  pageSizes?: number[];
  itemLabel?: string;
  summary?: ReactNode;
}) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[10px] text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        {summary ?? (
          <p>
            Showing{" "}
            <span className="font-semibold text-[var(--color-text)]">{start}</span>{" "}
            to <span className="font-semibold text-[var(--color-text)]">{end}</span>{" "}
            of{" "}
            <span className="font-semibold text-[var(--color-text)]">{totalItems}</span>{" "}
            {itemLabel}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          Rows
          <select
            value={perPage}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[10px] font-semibold text-[var(--color-text)]"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-semibold text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="rounded-lg bg-[var(--color-raised)] px-2.5 py-1.5 font-semibold text-[var(--color-text)]">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-semibold text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

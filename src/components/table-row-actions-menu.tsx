"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TableRowAction = {
  id: string;
  label: string;
  description?: string;
  danger?: boolean;
  onClick: () => void;
};

export function TableRowActionsMenu({
  label,
  isOpen,
  onToggle,
  onClose,
  actions,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  actions: TableRowAction[];
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
        aria-label={`Open actions for ${label}`}
        title={`Actions for ${label}`}
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
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition ${
                    action.danger
                      ? "hover:bg-[var(--color-danger-soft)]"
                      : "hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      action.danger ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"
                    }`}
                  >
                    {action.label}
                  </span>
                  {action.description ? (
                    <span className="text-[11px] leading-snug text-[var(--color-text-muted)]">
                      {action.description}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

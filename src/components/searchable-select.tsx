"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = {
  value: string;
  label: string;
  description?: string;
};

type SearchableSelectProps = {
  name: string;
  placeholder: string;
  options: Option[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
};

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
};

export function SearchableSelect({
  name,
  placeholder,
  options,
  defaultValue,
  value,
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selectedValue = value ?? internalValue;
  const selected = options.find((option) => option.value === selectedValue);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.description?.toLowerCase().includes(q),
    );
  }, [options, query]);

  function computeMenuPosition(rect: DOMRect): MenuPosition {
    const viewportPadding = 8;
    const gap = 8;
    const estimatedMenuHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUp = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding),
    );

    if (openUp) {
      return {
        bottom: window.innerHeight - rect.top + gap,
        left,
        width: rect.width,
      };
    }

    return {
      top: rect.bottom + gap,
      left,
      width: rect.width,
    };
  }

  function closeMenu() {
    setOpen(false);
    setQuery("");
    setMenuPosition(null);
  }

  function toggleMenu() {
    if (open) {
      closeMenu();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition(computeMenuPosition(rect));
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

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
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} />
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border-hover)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:ring focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
      >
        <span className={selected ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 text-[var(--color-text-muted)] transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={{
                top: menuPosition.top,
                bottom: menuPosition.bottom,
                left: menuPosition.left,
                width: menuPosition.width,
              }}
              className="fixed z-[140] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl"
            >
              <div className="border-b border-[var(--color-border)] p-2">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search..."
                  autoFocus
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:ring focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
                />
              </div>
              <div className="max-h-56 overflow-auto p-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-[var(--color-text-muted)]">No matches.</div>
                ) : (
                  filtered.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={selectedValue === option.value}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setInternalValue(option.value);
                        closeMenu();
                        onChange?.(option.value);
                      }}
                      className={`flex w-full flex-col items-start gap-1 rounded-xl px-3 py-2 text-left text-xs transition ${
                        selectedValue === option.value
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                          : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                      }`}
                    >
                      <span className="text-sm font-semibold">{option.label}</span>
                      {option.description ? (
                        <span
                          className={
                            selectedValue === option.value
                              ? "text-[var(--color-primary-fg)]/70"
                              : "text-[var(--color-text-muted)]"
                          }
                        >
                          {option.description}
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

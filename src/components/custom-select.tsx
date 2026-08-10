"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

type CustomSelectProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<CustomSelectOption<T>>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  "aria-label": string;
};

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
};

function computeMenuPosition(rect: DOMRect): MenuPosition {
  const gap = 4;
  const maxHeight = 208; // max-h-52
  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const openUpward = spaceBelow < Math.min(maxHeight, 160) && spaceAbove > spaceBelow;

  return {
    left: rect.left,
    width: rect.width,
    ...(openUpward
      ? { bottom: window.innerHeight - rect.top + gap }
      : { top: rect.bottom + gap }),
  };
}

export function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  className = "mt-1.5",
  triggerClassName = "",
  menuClassName = "",
  "aria-label": ariaLabel,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const listboxId = useId();

  const selected = options.find((option) => option.value === value);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition(computeMenuPosition(rect));
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    setMenuPosition(null);
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
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) closeMenu();
          else openMenu();
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-left text-sm text-[var(--color-text)] outline-none transition hover:border-[var(--color-border-hover)] focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60 ${triggerClassName}`}
      >
        <span className={selected ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && menuPosition
        ? createPortal(
            <ul
              ref={menuRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              style={{
                top: menuPosition.top,
                bottom: menuPosition.bottom,
                left: menuPosition.left,
                width: menuPosition.width,
              }}
              className={`fixed z-[140] max-h-52 overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1 shadow-[var(--shadow-lg)] ${menuClassName}`}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onChange(option.value);
                        closeMenu();
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-h)]"
                          : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden
                        >
                          <path d="M5 12l4 4L19 6" />
                        </svg>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

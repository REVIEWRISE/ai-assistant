"use client";

import { useEffect, useId, useRef, useState } from "react";

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

export function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  "aria-label": ariaLabel,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
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

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-30 mt-1 max-h-52 w-full min-w-full overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1 shadow-[var(--shadow-lg)] ${menuClassName}`}
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
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    isSelected
                      ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-h)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M5 12l4 4L19 6" />
                    </svg>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

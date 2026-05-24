"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} />
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
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

      {open ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl">
          <div className="border-b border-[var(--color-border)] p-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
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
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setInternalValue(option.value);
                    setOpen(false);
                    setQuery("");
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
        </div>
      ) : null}
    </div>
  );
}

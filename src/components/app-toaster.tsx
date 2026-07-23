"use client";

import { Toaster } from "sonner";

function ToastGlyph({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${className}`}
      aria-hidden
    >
      {children}
    </span>
  );
}

const toastIcons = {
  success: (
    <ToastGlyph className="border-[color-mix(in_srgb,var(--color-success)_28%,var(--color-border))] bg-[var(--color-success-soft)] text-[var(--color-success)]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </ToastGlyph>
  ),
  error: (
    <ToastGlyph className="border-[color-mix(in_srgb,var(--color-danger)_28%,var(--color-border))] bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </ToastGlyph>
  ),
  warning: (
    <ToastGlyph className="border-[color-mix(in_srgb,var(--color-warning)_30%,var(--color-border))] bg-[var(--color-warning-soft)] text-[color-mix(in_srgb,var(--color-warning)_82%,var(--color-text))]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    </ToastGlyph>
  ),
  info: (
    <ToastGlyph className="border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    </ToastGlyph>
  ),
};

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      offset={20}
      gap={10}
      visibleToasts={4}
      icons={toastIcons}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "vr-toast",
          title: "vr-toast-title",
          description: "vr-toast-description",
          content: "vr-toast-content",
          icon: "vr-toast-icon",
          closeButton: "vr-toast-close",
          success: "vr-toast-success",
          error: "vr-toast-error",
          warning: "vr-toast-warning",
          info: "vr-toast-info",
        },
      }}
    />
  );
}

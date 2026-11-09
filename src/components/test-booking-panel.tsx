"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

/**
 * "Test booking flow" without leaving the page: opens the workspace's live booking assistant
 * (the same /embed/chatbot page customers see) in a side panel. Bookings made here are real.
 */
export function TestBookingButton({
  testBookingHref,
  label = "Test booking flow",
  className,
}: {
  testBookingHref: string;
  label?: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open ? <TestBookingPanel testBookingHref={testBookingHref} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function TestBookingPanel({ testBookingHref, onClose }: { testBookingHref: string; onClose: () => void }) {
  const router = useRouter();
  // layout=fill: the assistant fills the panel with even padding instead of floating in a corner.
  const src = `${testBookingHref}${testBookingHref.includes("?") ? "&" : "?"}open=1&layout=fill`;

  function close() {
    onClose();
    // A test booking changes counts, the Bookings list and setup progress — pull fresh data.
    router.refresh();
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-label="Test booking flow">
      <button type="button" aria-label="Close test booking" onClick={close} className="absolute inset-0 bg-[var(--color-overlay)]" />
      <div className="relative flex h-full w-full max-w-[440px] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Test your booking assistant</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
              This is the live assistant your customers see. Bookings made here are real and show up under Bookings.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="relative min-h-0 flex-1 bg-[var(--color-bg)]">
          <iframe src={src} title="Booking assistant test" className="absolute inset-0 h-full w-full border-0" />
        </div>
      </div>
    </div>,
    document.body,
  );
}

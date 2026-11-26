"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]";
const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-fill-h)]";

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  copy: "M8 8h11v11H8zM5 16V5h11",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM14 20h1M20 14h1",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  open: "M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5",
};

export function BookingShareActions({
  businessName,
  bookingUrl,
  qrDataUrl,
  qrFileName,
}: {
  businessName: string;
  bookingUrl: string;
  qrDataUrl: string;
  qrFileName: string;
}) {
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!showQr) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowQr(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [showQr]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success("Booking link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  }

  async function shareLink() {
    // Phones and Safari offer a native share sheet; elsewhere fall back to copying.
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: `Book with ${businessName}`, url: bookingUrl });
    } catch {
      // The person closed the share sheet.
    }
  }

  return (
    <>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center xl:shrink-0">
        <div className="flex min-w-0 items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-1 pl-3 pr-1 sm:flex-1 xl:w-[300px] xl:flex-none">
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text)]" title={bookingUrl}>
            {bookingUrl.replace(/^https?:\/\//, "")}
          </span>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open booking page"
            title="Open booking page"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
          >
            <Icon path={ICONS.open} />
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            aria-label="Copy link"
            title="Copy link"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
          >
            <Icon path={ICONS.copy} />
          </button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void shareLink()} className={`${secondaryButton} flex-1 sm:flex-none`}>
            <Icon path={ICONS.share} />
            Share
          </button>
          <button type="button" onClick={() => setShowQr(true)} className={`${primaryButton} flex-1 sm:flex-none`}>
            <Icon path={ICONS.qr} />
            QR code
          </button>
        </div>
      </div>
      {showQr
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Booking QR code">
              <button
                type="button"
                aria-label="Close QR code"
                onClick={() => setShowQr(false)}
                className="absolute inset-0 bg-[var(--color-overlay)]"
              />
              <div className="relative w-full max-w-sm overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-[var(--color-text)]">Booking QR code</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                      Print it for your counter, window or flyers. Scanning opens {businessName}&apos;s booking page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQr(false)}
                    aria-label="Close"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="bg-[var(--color-bg)] px-5 py-5">
                  <div className="mx-auto w-full max-w-[240px] rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-sm)]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
                    <img src={qrDataUrl} alt={`QR code for ${bookingUrl}`} className="block w-full" />
                  </div>
                  <p className="mt-3 truncate text-center text-xs text-[var(--color-text-muted)]" title={bookingUrl}>
                    {bookingUrl.replace(/^https?:\/\//, "")}
                  </p>
                </div>
                <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3.5">
                  <button type="button" onClick={() => setShowQr(false)} className={secondaryButton}>
                    Close
                  </button>
                  <a href={qrDataUrl} download={qrFileName} className={primaryButton}>
                    <Icon path={ICONS.download} />
                    Download PNG
                  </a>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

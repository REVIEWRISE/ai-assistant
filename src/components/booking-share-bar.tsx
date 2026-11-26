import QRCode from "qrcode";
import { BookingShareActions } from "@/components/booking-share-actions";
import { getAppOrigin } from "@/lib/app-origin";
import { ensureBookingSlug } from "@/lib/booking-link";
import { prisma } from "@/lib/prisma";

/** One-click sharing of the workspace's public booking page: link, share sheet and QR code. */
export async function BookingShareBar({ organizationId }: { organizationId: string }) {
  const [slug, origin, org] = await Promise.all([
    ensureBookingSlug(organizationId),
    getAppOrigin(),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
  ]);
  if (!slug || !origin || !org) return null;

  const bookingUrl = `${origin}/book/${slug}`;
  const qrDataUrl = await QRCode.toDataURL(`${bookingUrl}?src=qr`, { width: 1024, margin: 2 });
  const localOnly = /\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(bookingUrl);

  return (
    <section className="vr-app-panel p-4 lg:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)]"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Share your booking page</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Customers open the link or scan the QR code to book with {org.name}. No app or sign-in needed.
            </p>
          </div>
        </div>
        <BookingShareActions
          businessName={org.name}
          bookingUrl={bookingUrl}
          qrDataUrl={qrDataUrl}
          qrFileName={`${slug}-booking-qr.png`}
        />
      </div>
      {localOnly ? (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          This address only works on this computer. Phones can open it once the app runs on a public URL.
        </p>
      ) : null}
    </section>
  );
}

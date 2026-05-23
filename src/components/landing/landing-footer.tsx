import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { CONTACT_EMAIL, MAIN_SITE_URL, PRODUCT_NAME } from "@/lib/brand";

const PORTFOLIO_HREF = `${MAIN_SITE_URL}/work`;

export function LandingFooter({ isLoggedIn }: { isLoggedIn: boolean }) {
  const navLinkClass =
    "text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-primary-h)]";

  return (
    <footer className="vr-landing-section relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,color-mix(in_srgb,var(--color-primary)_8%,transparent),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12 lg:py-14">
        <div className="max-w-sm">
          <BrandLogo
            href="/"
            primary={PRODUCT_NAME}
            secondary="AI for reviews, appointments, and leads"
            className="text-[var(--color-text)] [&_p:first-child]:text-[var(--color-primary-h)] [&_p:last-child]:text-[var(--color-text-muted)]"
          />
          <p className="vr-landing-muted mt-4 text-sm leading-relaxed">
            Customer-facing automation from{" "}
            <a
              href={MAIN_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--color-primary)] transition hover:text-[var(--color-primary-h)]"
            >
              VyntRise
            </a>
            .
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:gap-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              Product
            </p>
            <nav className="mt-3 flex flex-col gap-2.5" aria-label="Footer product">
              {isLoggedIn ? (
                <Link href="/dashboard" className={navLinkClass}>
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className={navLinkClass}>
                    Sign in
                  </Link>
                  <Link href="/register" className={navLinkClass}>
                    Start free
                  </Link>
                </>
              )}
              <a href="#features" className={navLinkClass}>
                Features
              </a>
              <a href="#pricing" className={navLinkClass}>
                Pricing
              </a>
              <a href="#contact" className={navLinkClass}>
                Contact
              </a>
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              Company
            </p>
            <nav className="mt-3 flex flex-col gap-2.5" aria-label="Footer company">
              <a
                href={PORTFOLIO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClass}
              >
                Portfolio
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className={navLinkClass}>
                {CONTACT_EMAIL}
              </a>
              <a
                href={MAIN_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClass}
              >
                vyntrise.com
              </a>
            </nav>
          </div>
        </div>
      </div>

      <div className="relative border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-[var(--color-text-subtle)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} VyntRise. All rights reserved.</p>
          <p>Built for local businesses scaling with AI.</p>
        </div>
      </div>
    </footer>
  );
}

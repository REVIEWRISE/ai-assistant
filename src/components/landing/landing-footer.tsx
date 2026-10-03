import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { CONTACT_EMAIL, MAIN_SITE_URL, PRODUCT_NAME } from "@/lib/brand";

const PORTFOLIO_HREF = `${MAIN_SITE_URL}/work`;

export function LandingFooter({ isLoggedIn }: { isLoggedIn: boolean }) {
  const navLinkClass =
    "text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-primary-h)]";

  return (
    <footer className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,color-mix(in_srgb,var(--color-primary)_10%,transparent),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-14 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-16 lg:py-16">
        {/* Brand Info */}
        <div className="max-w-md">
          <BrandLogo
            href="/"
            primary={PRODUCT_NAME}
            secondary="Autonomous AI Front-of-House Engine"
            className="text-[var(--color-text)] [&_p:first-child]:text-[var(--color-text)] [&_p:last-child]:text-[var(--color-text-muted)]"
          />
          <p className="mt-4 text-xs leading-6 text-[var(--color-text-muted)]">
            VyntRise coordinates reviews, appointment scheduling, and inbound leads for local businesses with human-grade accuracy and zero operational downtime.
          </p>

          <div className="mt-6 flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-[11px] font-bold text-[var(--color-text)] w-fit shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All Systems Operational (99.9% Uptime)</span>
          </div>
        </div>

        {/* Navigation Columns */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-10 lg:gap-16">
          {/* Product Links */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              Platform
            </p>
            <nav className="mt-3 flex flex-col gap-2.5" aria-label="Footer platform">
              <a href="#features" className={navLinkClass}>
                Core Agents
              </a>
              <a href="#demo-playground" className={navLinkClass}>
                Live Sandbox
              </a>
              <a href="#playbook" className={navLinkClass}>
                How It Works
              </a>
              <a href="#integrations" className={navLinkClass}>
                Integrations
              </a>
              <a href="#pricing" className={navLinkClass}>
                Pricing Plans
              </a>
            </nav>
          </div>

          {/* Resources */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              Solutions
            </p>
            <nav className="mt-3 flex flex-col gap-2.5" aria-label="Footer solutions">
              <a href="#testimonials" className={navLinkClass}>
                Customer Stories
              </a>
              <a href="#faq" className={navLinkClass}>
                FAQ & Security
              </a>
              <a href="#contact" className={navLinkClass}>
                Enterprise Inquiry
              </a>
              {isLoggedIn ? (
                <Link href="/dashboard" className={navLinkClass}>
                  Console Dashboard
                </Link>
              ) : (
                <Link href="/register" className={navLinkClass}>
                  Start Free Trial
                </Link>
              )}
            </nav>
          </div>

          {/* Company */}
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              Company
            </p>
            <nav className="mt-3 flex flex-col gap-2.5" aria-label="Footer company">
              <a
                href={PORTFOLIO_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClass}
              >
                VyntRise Agency
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

      {/* Bottom Bar */}
      <div className="relative border-t border-[var(--color-border)] bg-[var(--color-surface)]/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-[var(--color-text-subtle)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} VyntRise Technologies. All rights reserved.</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Legal">
            <a
              href={`${MAIN_SITE_URL}/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-[var(--color-primary-h)]"
            >
              Privacy Policy
            </a>
            <a
              href={`${MAIN_SITE_URL}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-[var(--color-primary-h)]"
            >
              Terms of Service
            </a>
            <a
              href={`${MAIN_SITE_URL}/cookies`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-[var(--color-primary-h)]"
            >
              Security SLA
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { CONTACT_EMAIL, MAIN_SITE_URL, PRODUCT_NAME } from "@/lib/brand";

const PORTFOLIO_HREF = `${MAIN_SITE_URL}/work`;

const navLinkClass =
  "text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--lp-accent)]";
const columnTitleClass = "text-sm font-semibold text-[var(--color-text)]";

export function LandingFooter({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <footer className="bg-[var(--color-bg)]">
      <div className="lp-wrap flex flex-col gap-10 py-14 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
        <div className="max-w-sm">
          <BrandLogo
            href="/"
            size="sm"
            primary={PRODUCT_NAME}
            className="text-[var(--color-text)] [&_p]:text-[15px] [&_p]:tracking-[-0.02em]"
          />
          <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">
            VyntRise coordinates reviews, appointment scheduling, and inbound leads for local businesses with
            human-grade accuracy and zero operational downtime.
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span className="size-2 rounded-full bg-[var(--color-success)]" />
            All systems operational (99.9% uptime)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-10 lg:gap-16">
          <div>
            <p className={columnTitleClass}>Platform</p>
            <nav className="mt-3 flex flex-col gap-2.5" aria-label="Footer platform">
              <a href="#features" className={navLinkClass}>Core agents</a>
              <a href="#demo-playground" className={navLinkClass}>Live sandbox</a>
              <a href="#playbook" className={navLinkClass}>How it works</a>
              <a href="#integrations" className={navLinkClass}>Integrations</a>
              <a href="#pricing" className={navLinkClass}>Pricing plans</a>
            </nav>
          </div>

          <div>
            <p className={columnTitleClass}>Solutions</p>
            <nav className="mt-3 flex flex-col gap-2.5" aria-label="Footer solutions">
              <a href="#testimonials" className={navLinkClass}>Customer stories</a>
              <a href="#faq" className={navLinkClass}>FAQ & security</a>
              <a href="#contact" className={navLinkClass}>Enterprise inquiry</a>
              {isLoggedIn ? (
                <Link href="/dashboard" className={navLinkClass}>Console dashboard</Link>
              ) : (
                <Link href="/register" className={navLinkClass}>Start free trial</Link>
              )}
            </nav>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <p className={columnTitleClass}>Company</p>
            <nav className="mt-3 flex flex-col gap-2.5" aria-label="Footer company">
              <a href={PORTFOLIO_HREF} target="_blank" rel="noopener noreferrer" className={navLinkClass}>
                VyntRise Agency
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className={navLinkClass}>{CONTACT_EMAIL}</a>
              <a href={MAIN_SITE_URL} target="_blank" rel="noopener noreferrer" className={navLinkClass}>
                vyntrise.com
              </a>
            </nav>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]">
        <div className="lp-wrap flex flex-col gap-3 py-6 text-sm text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VyntRise Technologies. All rights reserved.</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Legal">
            <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noopener noreferrer" className={navLinkClass}>
              Privacy Policy
            </a>
            <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noopener noreferrer" className={navLinkClass}>
              Terms of Service
            </a>
            <a href={`${MAIN_SITE_URL}/cookies`} target="_blank" rel="noopener noreferrer" className={navLinkClass}>
              Security SLA
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

import { CONTACT_EMAIL, MAIN_SITE_URL, PRODUCT_NAME } from "@/lib/brand";

const LINK_CLASS =
  "rounded transition-colors hover:text-[var(--color-primary-h)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

export function AppFooter() {
  return (
    <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg)] [[data-theme=dark]_&]:bg-[var(--color-surface)]">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 text-xs text-[var(--color-text-muted)] lg:px-6">
        <p>
          © {new Date().getFullYear()} {PRODUCT_NAME}
        </p>
        <nav className="flex items-center gap-5" aria-label="Footer">
          <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            Privacy
          </a>
          <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            Terms
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}

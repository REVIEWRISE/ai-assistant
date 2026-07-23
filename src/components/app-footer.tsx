import { BRAND_NAME, PRODUCT_NAME } from "@/lib/brand";

type AppFooterProps = {
  organization: string;
  role: string;
};

export function AppFooter({ organization, role }: AppFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] backdrop-blur-xl">
      <div className="flex min-h-11 min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 text-xs text-[var(--color-text-muted)] sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="min-w-0 truncate font-medium text-[var(--color-text)]">
            {organization}
          </span>
          <span className="hidden text-[var(--color-border-hover)] sm:inline" aria-hidden>
            ·
          </span>
          <span className="hidden truncate sm:inline">{role} workspace</span>
        </div>

        <p className="shrink-0">
          <span className="font-medium text-[var(--color-text)]">{BRAND_NAME}</span>
          <span className="mx-1.5 text-[var(--color-border-hover)]" aria-hidden>
            ·
          </span>
          <span className="hidden sm:inline">{PRODUCT_NAME} · </span>© {year}
        </p>
      </div>
    </footer>
  );
}

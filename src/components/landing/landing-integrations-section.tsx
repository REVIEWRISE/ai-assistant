import Link from "next/link";

function integrationInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function LandingIntegrationsSection({
  integrations,
  registerHref,
  isLoggedIn,
}: {
  integrations: readonly string[];
  registerHref: string;
  isLoggedIn: boolean;
}) {
  return (
    <section id="integrations" className="bg-[var(--color-surface)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
              Fits your stack
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)] sm:text-4xl">
              Connect the tools your team already trusts.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-[var(--color-text-muted)]">
              Keep your review channels and calendars. VyntRise adds an intelligent operating layer instead of forcing a rip-and-replace project.
            </p>
            <Link
              href={registerHref}
              className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)]"
            >
              {isLoggedIn ? "Manage integrations" : "Start connecting"}
              <span aria-hidden>→</span>
            </Link>
          </div>

          <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 sm:gap-x-6">
            {integrations.map((integration) => (
              <li
                key={integration}
                className="flex items-center gap-3 border-b border-[var(--color-border)] py-4"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg)] text-xs font-semibold tracking-wide text-[var(--color-primary-h)]"
                  aria-hidden
                >
                  {integrationInitials(integration)}
                </span>
                <span className="min-w-0 text-sm font-semibold leading-5 text-[var(--color-text)]">
                  {integration}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

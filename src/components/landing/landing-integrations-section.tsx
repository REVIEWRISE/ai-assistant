import Link from "next/link";

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
        <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-bg)]">
          <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:p-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Fits your stack</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)] sm:text-4xl">
                Connect the tools your team already trusts.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-[var(--color-text-muted)]">
                Keep your review channels and calendars. VyntRise adds an intelligent operating layer instead of forcing a rip-and-replace project.
              </p>
              <Link href={registerHref} className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)]">
                {isLoggedIn ? "Manage integrations" : "Start connecting"}
                <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {integrations.map((integration, index) => (
                <div key={integration} className="flex min-h-28 flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:-translate-y-0.5 hover:bg-[var(--color-raised)] motion-reduce:hover:translate-y-0">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M12 8v8M5 5h14v14H5z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-5 text-[var(--color-text)]">{integration}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">Connection 0{index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingTrustedSection({ names }: { names: readonly string[] }) {
  return (
    <section id="trusted" className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-baseline lg:justify-between lg:gap-10 lg:px-8">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          Built with operators
        </p>
        <p className="text-sm leading-6 text-[var(--color-text)] sm:text-base">
          {names.map((name, index) => (
            <span key={name}>
              {index > 0 ? (
                <span className="mx-2.5 text-[var(--color-text-subtle)]" aria-hidden>
                  ·
                </span>
              ) : null}
              <span className="font-medium">{name}</span>
            </span>
          ))}
          <span className="mx-2.5 text-[var(--color-text-subtle)]" aria-hidden>
            ·
          </span>
          <span className="text-[var(--color-text-muted)]">and local teams scaling with AI</span>
        </p>
      </div>
    </section>
  );
}

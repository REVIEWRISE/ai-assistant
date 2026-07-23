export function LandingTrustedSection({ names }: { names: readonly string[] }) {
  return (
    <section id="trusted" className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">Built with operators</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
            Designed for local teams that cannot afford to let customer conversations wait.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 lg:justify-end">
          {names.map((name) => (
            <span key={name} className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] shadow-sm">
              {name}
            </span>
          ))}
          <span className="rounded-full border border-dashed border-[var(--color-border-hover)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)]">
            Early-access partners
          </span>
        </div>
      </div>
    </section>
  );
}

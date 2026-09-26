export function LandingTrustedSection({ names }: { names: readonly string[] }) {
  const PARTNERS = [
    { name: "Habesha Food", category: "Hospitality" },
    { name: "Liya Cookies", category: "Bakery & Retail" },
    { name: "Nazaret Market", category: "Grocery" },
    { name: "Apex Wellness", category: "Healthcare" },
    { name: "Nova Auto Care", category: "Automotive" },
  ];

  const STATS = [
    { value: "250k+", label: "Messages handled" },
    { value: "< 2 min", label: "Avg response time" },
    { value: "99.4%", label: "Automation accuracy" },
    { value: "35 hrs", label: "Saved per location / mo" },
  ];

  return (
    <section id="trusted" className="border-y border-[var(--color-border)] bg-[var(--color-surface)]/50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Partner names */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
            Trusted by
          </p>
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0">
            {PARTNERS.map((p, i) => (
              <span key={p.name} className="flex items-center">
                {i > 0 && (
                  <span className="mx-3 text-[var(--color-border)]" aria-hidden>·</span>
                )}
                <span className="text-sm font-semibold text-[var(--color-text)]">{p.name}</span>
                <span className="ml-1.5 text-xs text-[var(--color-text-subtle)]">({p.category})</span>
              </span>
            ))}
            <span className="mx-3 text-[var(--color-border)]" aria-hidden>·</span>
            <span className="text-xs text-[var(--color-text-subtle)]">and 150+ local teams</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-8 sm:grid-cols-4 sm:gap-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4 shadow-sm">
              <p className="vr-gradient-text text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

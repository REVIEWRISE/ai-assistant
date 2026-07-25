export default function PlatformProvidersLoading() {
  return (
    <div
      className="mx-auto max-w-[92rem] space-y-5 animate-pulse"
      aria-busy
      aria-label="Loading providers"
    >
      <div className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(125deg,#09101f_0%,#111a30_52%,#233b5b_100%)] px-5 pb-5 pt-6 lg:px-7 lg:pb-7 lg:pt-7">
        <div className="h-3 w-32 rounded bg-white/15" />
        <div className="mt-3 h-8 w-56 rounded-lg bg-white/20" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-white/10" />
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {["Total providers", "Enabled", "Configured", "Provider types"].map((label) => (
            <div
              key={label}
              className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {label}
              </p>
              <div className="mt-2 h-7 w-14 rounded bg-white/20" />
              <div className="mt-2 h-3 w-24 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-10 w-72 rounded-xl bg-[var(--color-skeleton)]" />
      <div className="h-80 rounded-[1.5rem] bg-[var(--color-skeleton)]" />
    </div>
  );
}

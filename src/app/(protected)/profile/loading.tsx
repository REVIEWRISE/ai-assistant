export default function ProfileLoading() {
  return (
    <div
      className="mx-auto max-w-[92rem] space-y-5 animate-pulse"
      aria-busy
      aria-label="Loading profile"
    >
      <div className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(125deg,#0c0c0c_0%,#161616_52%,#222222_100%)] px-5 pb-5 pt-6 lg:px-7 lg:pb-7 lg:pt-7">
        <div className="h-3 w-32 rounded bg-white/15" />
        <div className="mt-3 h-8 w-48 rounded-lg bg-white/20" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-white/10" />
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {["Role", "Active workspace", "Workspaces", "Email status"].map((label) => (
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

      <div className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="h-3 w-20 rounded bg-[var(--color-skeleton)]" />
            <div className="mt-2 h-6 w-44 rounded bg-[var(--color-skeleton)]" />
            <div className="mt-2 h-4 w-72 rounded bg-[var(--color-skeleton)]" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-36 rounded-lg bg-[var(--color-skeleton)]" />
            <div className="h-9 w-36 rounded-lg bg-[var(--color-skeleton)]" />
          </div>
        </div>
        <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="h-72 rounded-2xl bg-[var(--color-skeleton)]" />
          <div className="h-56 rounded-2xl bg-[var(--color-skeleton)]" />
        </div>
      </div>
    </div>
  );
}

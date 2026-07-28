export default function BillingTrialExpiredLoading() {
  return (
    <div
      className="relative min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)]"
      aria-busy
      aria-label="Loading billing"
    >
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <div className="h-9 w-9 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-skeleton)]" />
      </div>

      <div className="relative grid min-h-[100dvh] w-full animate-pulse lg:grid-cols-[minmax(20rem,0.95fr)_minmax(0,1.15fr)]">
        <aside className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
          <div className="ml-auto w-full max-w-lg space-y-4 lg:max-w-md xl:max-w-lg">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-[var(--color-skeleton)]" />
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-[var(--color-skeleton)]" />
                <div className="h-2.5 w-20 rounded bg-[var(--color-skeleton)]" />
              </div>
            </div>
            <div className="mt-14 h-6 w-28 rounded-full bg-[var(--color-skeleton)]" />
            <div className="h-12 w-full rounded-xl bg-[var(--color-skeleton)]" />
            <div className="h-12 w-[85%] rounded-xl bg-[var(--color-skeleton)]" />
            <div className="h-4 w-full rounded bg-[var(--color-skeleton)]" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="h-20 rounded-2xl bg-[var(--color-skeleton)]" />
              <div className="h-20 rounded-2xl bg-[var(--color-skeleton)]" />
            </div>
          </div>
        </aside>

        <main className="px-6 py-10 sm:px-10 lg:px-12 lg:py-12">
          <div className="mr-auto w-full max-w-xl space-y-4">
            <div className="h-3 w-24 rounded bg-[var(--color-skeleton)]" />
            <div className="h-8 w-56 rounded-lg bg-[var(--color-skeleton)]" />
            <div className="h-64 rounded-[1.5rem] bg-[var(--color-skeleton)]" />
          </div>
        </main>
      </div>
    </div>
  );
}

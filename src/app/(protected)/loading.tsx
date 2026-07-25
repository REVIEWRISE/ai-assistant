export default function ProtectedLoading() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy aria-label="Loading page">
      <div className="h-28 rounded-3xl border border-[var(--color-border)] bg-[var(--color-skeleton)]" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-24 rounded-2xl border border-[var(--color-border)] bg-[var(--color-skeleton)] lg:col-span-1" />
        <div className="h-24 rounded-2xl border border-[var(--color-border)] bg-[var(--color-skeleton)] lg:col-span-1" />
        <div className="h-24 rounded-2xl border border-[var(--color-border)] bg-[var(--color-skeleton)] lg:col-span-1" />
      </div>
      <div className="h-72 rounded-3xl border border-[var(--color-border)] bg-[var(--color-skeleton)]" />
    </div>
  );
}

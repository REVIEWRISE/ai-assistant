import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { PRODUCT_NAME } from "@/lib/brand";

const ACTIVITY = [
  ["Review response", "Draft ready", "text-emerald-300 bg-emerald-400/10"],
  ["New appointment", "Booked", "text-indigo-300 bg-indigo-400/10"],
  ["Lead follow-up", "Assigned", "text-amber-300 bg-amber-400/10"],
] as const;

export function AuthShell({
  sideTitle,
  sideDescription,
  children,
}: {
  sideTitle: string;
  sideDescription: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent_62%)]" aria-hidden />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[0_30px_90px_-50px_rgba(15,23,42,0.55)] lg:min-h-[min(780px,calc(100dvh-4rem))] lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="landing-dark relative hidden overflow-hidden bg-[linear-gradient(145deg,#080d18,#111a31_55%,#252f6a)] p-10 text-white lg:flex lg:flex-col xl:p-12">
            <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.1]" aria-hidden />
            <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-indigo-500/25 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-32 -right-20 size-80 rounded-full bg-sky-400/15 blur-3xl" aria-hidden />

            <div className="relative flex h-full flex-col">
              <BrandLogo
                href="/"
                size="sm"
                primary={PRODUCT_NAME}
                secondary="AI operations"
                className="text-white [&_p:first-child]:text-[10px] [&_p:first-child]:font-semibold [&_p:first-child]:uppercase [&_p:first-child]:tracking-[0.2em] [&_p:first-child]:text-indigo-300 [&_p:last-child]:text-sm [&_p:last-child]:font-medium [&_p:last-child]:text-slate-300"
              />

              <div className="my-auto py-10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Your operations workspace</p>
                <h1 className="mt-5 max-w-md text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white xl:text-5xl">
                  {sideTitle}
                </h1>
                <p className="mt-5 max-w-md text-sm leading-7 text-slate-300 xl:text-base">
                  {sideDescription}
                </p>

                <div className="mt-9 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 backdrop-blur">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <span className="text-xs font-semibold text-white">Today&rsquo;s activity</span>
                    <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-300">Live</span>
                  </div>
                  <div className="space-y-2 p-3">
                    {ACTIVITY.map(([label, status, color]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-3">
                        <span className="text-sm font-medium text-slate-200">{label}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${color}`}>{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative flex items-center gap-5 border-t border-white/10 pt-5 text-xs text-slate-400">
                <span>Reviews</span>
                <span>Bookings</span>
                <span>Leads</span>
              </div>
            </div>
          </aside>

          <main className="flex min-h-[calc(100dvh-3rem)] flex-col p-5 sm:p-8 lg:min-h-0 lg:p-10 xl:p-12">
            <div className="flex items-center justify-between gap-4">
              <div className="lg:hidden">
                <BrandLogo href="/" size="sm" primary={PRODUCT_NAME} className="text-[var(--color-text)]" />
              </div>
              <Link href="/" className="hidden items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] lg:inline-flex">
                <span aria-hidden>←</span> Back to home
              </Link>
              <ThemeSwitch />
            </div>

            <div className="my-auto flex justify-center py-10 sm:py-12">
              <div className="w-full max-w-md">{children}</div>
            </div>

            <p className="text-center text-[11px] leading-5 text-[var(--color-text-subtle)]">
              Protected by secure, seven-day sessions. Your credentials are never displayed.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}

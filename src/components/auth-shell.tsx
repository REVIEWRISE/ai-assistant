import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LandingLogoMark } from "@/components/landing/landing-logo-mark";
import { ThemeSwitch } from "@/components/theme-switch";
import { PRODUCT_NAME } from "@/lib/brand";

const ACTIVITY = [
  ["Review response", "Draft ready"],
  ["New appointment", "Booked"],
  ["Lead follow-up", "Assigned"],
] as const;

function ActivityCard() {
  return (
    <div className="lp-console">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
        <span className="text-sm font-semibold">Today&rsquo;s activity</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
          <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
          Live
        </span>
      </div>
      <ul className="divide-y divide-[var(--color-border)] px-5">
        {ACTIVITY.map(([label, status]) => (
          <li key={label} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="font-medium">{label}</span>
            <span className="text-[var(--color-text-muted)]">{status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepsCard({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="space-y-4 border-t border-white/25 pt-6">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-4 text-[15px] font-medium text-white">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[var(--lp-deep)]">
            {index + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

export function AuthShell({
  sideTitle,
  sideDescription,
  steps,
  children,
}: {
  sideTitle: string;
  sideDescription: string;
  /** Replaces the activity card with a short numbered list on the blue panel. */
  steps?: readonly string[];
  children: React.ReactNode;
}) {
  return (
    <div className="landing min-h-[100dvh] lg:grid lg:grid-cols-2">
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-[100dvh]">
        <div className="lp-blue flex h-full flex-col p-10 xl:p-14">
          <LandingLogoMark className="lp-mark -bottom-44 -left-24 w-[48rem] max-w-none" />

          <Link href="/" className="lp-blue-link flex w-fit items-center gap-2.5 rounded-full">
            <LandingLogoMark className="h-7 w-auto shrink-0 text-white" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">{PRODUCT_NAME}</span>
          </Link>

          <div className="my-auto max-w-xl py-8">
            <h1 className="text-[clamp(2.25rem,3.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.035em] [text-wrap:balance]">
              {sideTitle}
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-[1.65] text-[var(--lp-on-blue-muted)]">{sideDescription}</p>
            <div className="mt-9 [@media(max-height:740px)]:hidden">
              {steps ? <StepsCard steps={steps} /> : <ActivityCard />}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-h-[100dvh] flex-col px-4 py-4 sm:px-8 lg:px-12 lg:py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="lg:hidden">
            <BrandLogo href="/" size="sm" primary={PRODUCT_NAME} className="text-[var(--color-text)] [&_p]:text-[15px] [&_p]:tracking-[-0.02em]" />
          </div>
          <Link
            href="/"
            className="hidden items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] lg:inline-flex"
          >
            <span aria-hidden>←</span> Back to home
          </Link>
          <ThemeSwitch className="rounded-full! shadow-none!" />
        </div>

        <div className="my-auto flex justify-center py-10">
          <div className="w-full max-w-[30rem]">{children}</div>
        </div>

        <p className="text-center text-xs leading-5 text-[var(--color-text-muted)]">
          Protected by secure, seven-day sessions. Your credentials are never displayed.
        </p>
      </main>
    </div>
  );
}

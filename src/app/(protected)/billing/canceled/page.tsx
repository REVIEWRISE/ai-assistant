import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { requireSession } from "@/lib/auth-session";
import { getOrgBilling, isBillingAccessAllowed } from "@/lib/entitlements";
import { PRODUCT_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function BillingCanceledPage() {
  const session = await requireSession();
  const organizationId = session.activeOrganizationId;

  if (!organizationId) {
    redirect("/profile?error=organization_required");
  }

  const billing = await getOrgBilling(organizationId);
  if (billing && isBillingAccessAllowed(billing.billingStatus) && billing.billingStatus === "active") {
    redirect("/dashboard");
  }

  const retryHref =
    billing?.billingStatus === "expired" ? "/billing/expired" : "/billing";
  const workspaceName = session.activeOrganization?.name ?? null;

  return (
    <div className="relative min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--color-primary)_16%,transparent),transparent_55%)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />

      <div className="relative flex min-h-[100dvh] flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-6 lg:px-8">
        <header className="flex w-full items-center justify-between gap-3">
          <BrandLogo
            href="/dashboard"
            size="sm"
            primary={PRODUCT_NAME}
            secondary="Billing"
            className="min-w-0 [&_p:last-child]:hidden sm:[&_p:last-child]:block"
          />
          <ThemeSwitch className="shrink-0" />
        </header>

        <div className="flex flex-1 items-start justify-center py-8 sm:items-center sm:py-12">
          <section className="landing-animate-up mx-auto w-full max-w-lg overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_30px_80px_-48px_rgba(15,23,42,0.45)] sm:rounded-[1.75rem]">
            <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--color-primary)_10%,var(--color-bg)),var(--color-surface))] px-4 pb-7 pt-8 text-center sm:px-8 sm:pb-8 sm:pt-10">
              <div
                className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] blur-3xl sm:size-40"
                aria-hidden
              />
              <div className="relative flex flex-col items-center">
                <span className="relative flex size-14 items-center justify-center rounded-full bg-[var(--color-raised)] text-[var(--color-text-muted)] ring-4 ring-[color-mix(in_srgb,var(--color-border)_65%,transparent)] sm:size-16 sm:ring-8">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-7 sm:size-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" d="M8 12h8" />
                  </svg>
                </span>
                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)] sm:mt-6 sm:text-[11px]">
                  Checkout
                </p>
                <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-[-0.035em] text-[var(--color-text)] sm:text-3xl">
                  Payment canceled
                </h1>
                <p className="mt-3 max-w-sm text-[13px] leading-6 text-[var(--color-text-muted)] sm:text-sm">
                  {workspaceName
                    ? `No charge was made for ${workspaceName}. Pick a plan again whenever you're ready.`
                    : "No charge was made. Pick a plan again whenever you're ready."}
                </p>
              </div>
            </div>

            <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-8 sm:py-6">
              <ul className="space-y-2.5 sm:space-y-3" aria-label="What happens next">
                {[
                  "Your card was not charged",
                  "Your current workspace access is unchanged",
                  "You can restart checkout in one click",
                ].map((item, index) => (
                  <li key={item} className="flex items-center gap-2.5 sm:gap-3">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-[10px] font-semibold text-[var(--color-text-muted)] sm:size-7 sm:text-[11px]"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] font-medium text-[var(--color-text)] sm:text-sm">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                <Link
                  href={retryHref}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] sm:min-h-12 sm:flex-1"
                >
                  Choose a plan
                </Link>
                <Link
                  href="/profile"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] sm:min-h-12 sm:flex-1"
                >
                  Open profile
                </Link>
              </div>

              <p className="text-center text-[11px] leading-5 text-[var(--color-text-subtle)]">
                Changed your mind mid-checkout? That's fine — nothing was billed.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

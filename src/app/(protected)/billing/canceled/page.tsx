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

  return (
    <div className="relative min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-primary)_12%,transparent),transparent_55%)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden />

      <div className="relative flex min-h-[100dvh] flex-col px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <BrandLogo href="/dashboard" size="sm" primary={PRODUCT_NAME} secondary="Billing" />
          <ThemeSwitch />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <section className="mx-auto w-full max-w-xl rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center shadow-[var(--shadow-md)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
              Payment
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
              Checkout canceled
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              No charge was made. You can pick a plan again whenever you&rsquo;re ready.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href={retryHref}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
              >
                Choose a plan
              </Link>
              <Link
                href="/profile"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
              >
                Open profile
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

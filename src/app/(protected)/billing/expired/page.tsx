import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingExpiredPlanPicker } from "@/components/billing-expired-plan-picker";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { isBillingConfigured } from "@/lib/billing-client";
import { listCheckoutPlanOptions } from "@/lib/billing-checkout";
import { getOrgBilling, isBillingAccessAllowed } from "@/lib/entitlements";
import { BRAND_NAME, PRODUCT_NAME } from "@/lib/brand";
import { BILLING_RULES, getPlanBySlug, type PlanSlug } from "@/lib/pricing-plans";
import { getStripePublishableKey, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function BillingTrialExpiredPage() {
  const session = await requireSession();
  const organizationId = session.activeOrganizationId;

  if (await userHasAdminRole(session.userId)) {
    redirect("/billing-admin");
  }

  if (!organizationId) {
    redirect("/profile?error=organization_required");
  }

  const billing = await getOrgBilling(organizationId);
  if (!billing) {
    redirect("/profile?error=organization_required");
  }

  if (billing.billingStatus === "needs_plan") {
    redirect("/onboarding/plan");
  }

  if (isBillingAccessAllowed(billing.billingStatus)) {
    redirect("/dashboard");
  }

  if (billing.billingStatus !== "expired") {
    redirect("/billing");
  }

  const planName = billing.planSlug ? getPlanBySlug(billing.planSlug).name : "your plan";
  const workspaceName = session.activeOrganization?.name ?? "Workspace";
  const trialEndedLabel = billing.trialEndsAt
    ? billing.trialEndsAt.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const [{ plans }, stripeConfigured, billingConfigured, publishableKey] = await Promise.all([
    listCheckoutPlanOptions(),
    Promise.resolve(isStripeConfigured()),
    Promise.resolve(isBillingConfigured()),
    Promise.resolve(getStripePublishableKey()),
  ]);

  return (
    <div className="relative min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_srgb,var(--color-primary)_14%,transparent),transparent_50%)]"
        aria-hidden
      />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeSwitch />
      </div>

      <div className="relative grid min-h-[100dvh] w-full lg:grid-cols-[minmax(20rem,0.95fr)_minmax(0,1.15fr)]">
        <aside className="relative flex flex-col justify-between overflow-hidden border-b border-[var(--color-border)] px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-12 xl:px-16">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface)),var(--color-bg)_55%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-16 top-24 size-56 rounded-full bg-[color-mix(in_srgb,var(--color-grad-start)_18%,transparent)] blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:ml-auto lg:max-w-md xl:max-w-lg">
            <BrandLogo href="/" size="sm" primary={BRAND_NAME} secondary={PRODUCT_NAME} />

            <span className="mt-14 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-800 [[data-theme=dark]_&]:text-amber-200">
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
              Trial expired
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-[var(--color-text)] sm:text-5xl">
              Restore access to {workspaceName}.
            </h1>
            <p className="mt-5 text-base leading-7 text-[var(--color-text-muted)]">
              The {BILLING_RULES.trialDays}-day trial
              {planName ? ` for ${planName}` : ""} has ended
              {trialEndedLabel ? ` (${trialEndedLabel})` : ""}. Subscribe to unlock your workspace
              again.
            </p>

            <dl className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-4 py-4 backdrop-blur-sm">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
                  Workspace
                </dt>
                <dd className="mt-1.5 truncate text-lg font-semibold text-[var(--color-text)]">
                  {workspaceName}
                </dd>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-4 py-4 backdrop-blur-sm">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
                  Last plan
                </dt>
                <dd className="mt-1.5 truncate text-lg font-semibold text-[var(--color-text)]">
                  {planName}
                </dd>
              </div>
            </dl>
          </div>

          <p className="relative mx-auto mt-12 w-full max-w-lg text-xs text-[var(--color-text-subtle)] lg:mx-0 lg:ml-auto lg:mt-0 lg:max-w-md xl:max-w-lg">
            Need a different workspace or account settings?{" "}
            <Link
              href="/profile"
              className="font-semibold text-[var(--color-primary-h)] underline-offset-2 hover:underline"
            >
              Open profile
            </Link>
          </p>
        </aside>

        <main className="relative flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 lg:py-12 xl:px-16">
          <div className="mx-auto w-full max-w-xl lg:mx-0 lg:mr-auto">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                Select a plan
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                Subscribe to continue
              </h2>
            </div>

            <BillingExpiredPlanPicker
              plans={plans}
              initialPlanSlug={(billing.planSlug as PlanSlug | null) ?? null}
              initialInterval={billing.billingInterval === "monthly" ? "monthly" : "yearly"}
              publishableKey={publishableKey}
              stripeConfigured={stripeConfigured}
              billingConfigured={billingConfigured}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

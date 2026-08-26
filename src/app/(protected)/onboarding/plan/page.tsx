import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { OnboardingPlanPicker } from "@/components/onboarding-plan-picker";
import { ThemeSwitch } from "@/components/theme-switch";
import { requireSession } from "@/lib/auth-session";
import { getPublicLandingPlans } from "@/lib/billing-plan-repository";
import { BRAND_NAME, PRODUCT_NAME } from "@/lib/brand";
import { getOrgBilling } from "@/lib/entitlements";
import { BILLING_RULES } from "@/lib/pricing-plans";
import { mapCatalogNameToPlanSlug } from "@/lib/billing-checkout";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    plan?: string;
    error?: string;
    interval?: string;
    success?: string;
  }>;
};

export default async function OnboardingPlanPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const params = (await searchParams) ?? {};
  const organizationId = session.activeOrganizationId;

  if (!organizationId) {
    redirect("/profile?error=organization_required");
  }

  const billing = await getOrgBilling(organizationId);
  if (billing && billing.billingStatus !== "needs_plan" && billing.planSlug) {
    if (billing.billingStatus === "expired") redirect("/billing/expired");
    redirect("/dashboard");
  }

  const catalog = await getPublicLandingPlans().catch(() => []);
  const preselect = (params.plan || "") as string;
  const intervalDefault = params.interval === "monthly" ? "monthly" : "yearly";
  const workspaceName = session.activeOrganization?.name ?? "Your workspace";
  const justRegistered = params.success === "register";

  const plans = catalog
    .map((live) => {
      const slug =
        mapCatalogNameToPlanSlug(live.slug) ?? mapCatalogNameToPlanSlug(live.title);
      if (!slug) return null;
      return {
        slug,
        title: live.title,
        description: live.description,
        monthlyPrice: live.price ?? "—",
        yearlyMonthlyPrice: live.yearlyMonthlyPrice ?? "—",
        yearlyTotal: live.yearlyPrice ?? "—",
        featured: Boolean(live.featured),
        highlights: live.items.length ? [...live.items] : [],
        includedLocations: live.includedLocations,
        teamMemberLimit: live.teamMemberLimit,
        includedVoiceMinutes: live.includedVoiceMinutes,
      };
    })
    .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan));

  const errorMessage =
    params.error === "plan_invalid"
      ? "Choose a valid plan to continue."
      : params.error === "organization_required"
        ? "Create or select a workspace first."
        : catalog.length === 0
          ? "Plans are unavailable from Billing right now. Try again shortly."
          : null;

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
            <BrandLogo
              href="/"
              size="sm"
              primary={BRAND_NAME}
              secondary={PRODUCT_NAME}
            />

            <p className="mt-14 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary-h)]">
              {justRegistered ? "Account ready" : "Plan setup"}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--color-text)] sm:text-5xl">
              Choose how {workspaceName} starts.
            </h1>
            <p className="mt-5 text-base leading-7 text-[var(--color-text-muted)]">
              Every plan includes a {BILLING_RULES.trialDays}-day trial. No credit card. You can
              change plans later from billing.
            </p>

            <dl className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-4 py-4 backdrop-blur-sm">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
                  Trial
                </dt>
                <dd className="mt-1.5 text-lg font-semibold text-[var(--color-text)]">
                  {BILLING_RULES.trialDays} days free
                </dd>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-4 py-4 backdrop-blur-sm">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
                  Workspace
                </dt>
                <dd className="mt-1.5 truncate text-lg font-semibold text-[var(--color-text)]">
                  {workspaceName}
                </dd>
              </div>
            </dl>
          </div>

          <p className="relative mx-auto mt-12 w-full max-w-lg text-xs text-[var(--color-text-subtle)] lg:mx-0 lg:ml-auto lg:mt-0 lg:max-w-md xl:max-w-lg">
            Need a different workspace?{" "}
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
            {errorMessage ? (
              <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 [[data-theme=dark]_&]:border-red-900/50 [[data-theme=dark]_&]:bg-red-950/40 [[data-theme=dark]_&]:text-red-200">
                {errorMessage}
              </p>
            ) : null}

            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                Select a plan
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                Start your trial
              </h2>
            </div>

            <OnboardingPlanPicker
              plans={plans}
              preselect={preselect}
              intervalDefault={intervalDefault}
              trialDays={BILLING_RULES.trialDays}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

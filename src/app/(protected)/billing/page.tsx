import { redirect } from "next/navigation";
import { BillingCheckoutPanel } from "@/components/billing-checkout-panel";
import { requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { isBillingConfigured } from "@/lib/billing-client";
import { listCheckoutPlanOptions } from "@/lib/billing-checkout";
import { getOrgBilling, isBillingAccessAllowed } from "@/lib/entitlements";
import { BILLING_RULES, getPlanBySlug, type PlanSlug } from "@/lib/pricing-plans";
import { getStripePublishableKey, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string; feature?: string }>;
};

export default async function BillingPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const params = (await searchParams) ?? {};
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

  if (isBillingAccessAllowed(billing.billingStatus) && params.error !== "upgrade_required") {
    redirect("/dashboard");
  }

  const planName = billing.planSlug ? getPlanBySlug(billing.planSlug).name : "your plan";
  const workspaceName = session.activeOrganization?.name ?? "Workspace";
  const trialEnded =
    billing.billingStatus === "expired" || params.error === "trial_expired";
  const upgradeRequired = params.error === "upgrade_required";

  const title = trialEnded
    ? "Your trial has ended"
    : upgradeRequired
      ? "This feature needs a higher plan"
      : "Upgrade your workspace";

  const description = trialEnded
    ? `The ${BILLING_RULES.trialDays}-day trial for ${planName} on ${workspaceName} is over. Subscribe below to restore access.`
    : upgradeRequired
      ? `${planName} does not include this feature. Choose a higher plan and pay here to unlock it.`
      : "Choose a plan and complete payment without leaving this page.";

  const [{ plans }, stripeConfigured, billingConfigured, publishableKey] = await Promise.all([
    listCheckoutPlanOptions(),
    Promise.resolve(isStripeConfigured()),
    Promise.resolve(isBillingConfigured()),
    Promise.resolve(getStripePublishableKey()),
  ]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(125deg,#09101f_0%,#111a30_52%,#233b5b_100%)] px-5 py-7 text-white shadow-[var(--shadow-lg)] sm:px-8 sm:py-9">
        <div
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-sky-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-28 left-1/4 size-56 rounded-full bg-indigo-500/20 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/90">
              Billing
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-100">
              <span className="size-1.5 rounded-full bg-amber-300" aria-hidden />
              {trialEnded ? "Trial expired" : upgradeRequired ? "Upgrade needed" : "Payment required"}
            </span>
          </div>

          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-[2.15rem] sm:leading-tight">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
        <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
            Workspace status
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">{workspaceName}</h2>
        </div>

        <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-3">
          <div className="bg-[var(--color-bg)] px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Plan
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">{planName}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {billing.billingInterval ? `${billing.billingInterval} billing` : "No interval set"}
            </p>
          </div>
          <div className="bg-[var(--color-bg)] px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Status
            </p>
            <p className="mt-2 text-xl font-semibold capitalize text-[var(--color-text)]">
              {billing.billingStatus.replace("_", " ")}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {billing.paidAt ? "Payment on file" : "Not paid"}
            </p>
          </div>
          <div className="bg-[var(--color-bg)] px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Trial window
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">
              {billing.trialEndsAt
                ? billing.trialEndsAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {BILLING_RULES.trialDays} days from account creation
            </p>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <BillingCheckoutPanel
            plans={plans}
            initialPlanSlug={(billing.planSlug as PlanSlug | null) ?? null}
            initialInterval={billing.billingInterval === "yearly" ? "yearly" : "monthly"}
            publishableKey={publishableKey}
            stripeConfigured={stripeConfigured}
            billingConfigured={billingConfigured}
          />
        </div>
      </section>
    </div>
  );
}

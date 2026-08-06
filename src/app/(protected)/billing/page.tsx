import Link from "next/link";
import { redirect } from "next/navigation";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { BillingCheckoutPanel } from "@/components/billing-checkout-panel";
import { requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { isBillingConfigured } from "@/lib/billing-client";
import { listCheckoutPlanOptions } from "@/lib/billing-checkout";
import { getOrgBilling, isBillingAccessAllowed } from "@/lib/entitlements";
import { getPlanBySlug, type PlanSlug } from "@/lib/pricing-plans";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string; feature?: string }>;
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export default async function BillingPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const params = (await searchParams) ?? {};
  const organizationId = session.activeOrganizationId;
  const isAdmin = await userHasAdminRole(session.userId);

  // Admins manage catalog elsewhere, but can still open upgrade checkout for a workspace.
  if (isAdmin && params.error !== "upgrade_required") {
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

  if (billing.billingStatus === "expired" || params.error === "trial_expired") {
    redirect("/billing/expired");
  }

  if (
    !isAdmin &&
    isBillingAccessAllowed(billing.billingStatus) &&
    params.error !== "upgrade_required"
  ) {
    redirect("/dashboard");
  }

  const plan = billing.planSlug ? getPlanBySlug(billing.planSlug as PlanSlug) : null;
  const planName = plan?.name ?? "No plan";
  const workspaceName = session.activeOrganization?.name ?? "Workspace";
  const upgradeRequired = params.error === "upgrade_required";
  const billingStatusLabel = statusLabel(billing.billingStatus);

  const title = upgradeRequired ? "Upgrade your plan" : "Choose a plan";
  const description = upgradeRequired
    ? `${planName} doesn’t include this feature. Pick a higher plan for ${workspaceName} and continue to checkout.`
    : `Choose a plan for ${workspaceName} and complete payment on a secure checkout page.`;

  const [{ plans }, billingConfigured] = await Promise.all([
    listCheckoutPlanOptions(),
    Promise.resolve(isBillingConfigured()),
  ]);

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <AppointmentPageHeader
        variant="command"
        eyebrow="Billing"
        title={title}
        description={description}
        status={upgradeRequired ? "Upgrade needed" : "Payment required"}
        statusTone="warning"
        actions={[{ href: "/subscription", label: "Back to subscription" }]}
        metrics={[
          { label: "Plan", value: planName, hint: "current workspace plan" },
          {
            label: "Status",
            value: billingStatusLabel,
            hint: billing.paidAt ? "payment on file" : "not paid",
          },
          {
            label: "Interval",
            value: billing.billingInterval ?? "—",
            hint:
              billing.billingInterval === "yearly"
                ? "billed annually"
                : billing.billingInterval === "monthly"
                  ? "billed monthly"
                  : "no interval",
          },
          {
            label: "Period ends",
            value: billing.currentPeriodEndsAt
              ? billing.currentPeriodEndsAt.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })
              : "—",
            hint: "renewal or cutoff",
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.35fr)]">
        <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_8%,var(--color-bg)),var(--color-surface)_55%)] px-5 py-5 sm:px-6">
            <div
              className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
                Current plan
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
                {planName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                {plan?.positioning ?? `Active workspace: ${workspaceName}.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[var(--color-text-muted)]">
                  {billingStatusLabel}
                </span>
                {billing.billingInterval ? (
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[var(--color-text-muted)]">
                    {billing.billingInterval} billing
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <dl className="space-y-0 px-5 py-2 sm:px-6">
            {[
              { label: "Workspace", value: workspaceName },
              {
                label: "Paid at",
                value: billing.paidAt
                  ? billing.paidAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })
                  : "—",
              },
              {
                label: "Period ends",
                value: billing.currentPeriodEndsAt
                  ? billing.currentPeriodEndsAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })
                  : "—",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-3.5 last:border-0"
              >
                <dt className="text-xs font-semibold text-[var(--color-text-muted)]">{row.label}</dt>
                <dd className="text-right text-sm font-semibold text-[var(--color-text)]">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-[var(--color-border)] px-5 py-4 sm:px-6">
            <Link
              href="/subscription"
              className="text-sm font-semibold text-[var(--color-primary-h)] hover:underline"
            >
              View subscription details
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">
              Choose a plan
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">
              {upgradeRequired ? "Unlock the feature you need" : "Subscribe to continue"}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Secure checkout is hosted by Billing. You’ll return here after payment.
            </p>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <BillingCheckoutPanel
              plans={plans}
              initialPlanSlug={(billing.planSlug as PlanSlug | null) ?? null}
              initialInterval={billing.billingInterval === "yearly" ? "yearly" : "monthly"}
              billingConfigured={billingConfigured}
              mode={upgradeRequired ? "upgrade" : "subscribe"}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

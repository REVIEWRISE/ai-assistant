import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { PlatformNav } from "@/components/platform-nav";
import { BillingPlansManager } from "@/components/billing-plans-manager";
import { BillingPlansToasts } from "@/components/billing-plans-toasts";
import { requireAdminSession } from "@/lib/auth-session";
import { getBillingAdminUrl, isBillingConfigured } from "@/lib/billing-client";
import { getBillingCatalogPlans } from "@/lib/billing-plan-repository";

export const dynamic = "force-dynamic";

export default async function BillingPlansPage() {
  await requireAdminSession();

  const catalog = await getBillingCatalogPlans();
  const adminUrl = getBillingAdminUrl();
  const configured = isBillingConfigured();
  const linkedPriceCount = catalog.plans.reduce(
    (count, plan) => count + Number(Boolean(plan.stripePriceId)),
    0,
  );
  const trialDays =
    catalog.plans.find((plan) => plan.trialPeriodDays > 0)?.trialPeriodDays ?? 0;

  const status = catalog.error
    ? catalog.error === "not_configured"
      ? "API key missing"
      : catalog.error === "product_missing"
        ? "Product not found"
        : catalog.error === "empty"
          ? "No plans yet"
          : "Billing unavailable"
    : `${catalog.plans.length} plans synced`;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <BillingPlansToasts error={catalog.error} />

      <AppointmentPageHeader
        variant="command"
        eyebrow="Platform Settings"
        title="Billing plans"
        description="Plans and entitlements are owned by the Vyntrise Billing service. This page mirrors the live catalog for the agents product."
        status={status}
        statusTone={catalog.error ? "warning" : "success"}
        actions={[
          { href: "/platform", label: "Platform overview" },
          {
            href: adminUrl,
            label: "Billing Admin",
            primary: true,
            external: true,
          },
        ]}
        metrics={[
          {
            label: "Total plans",
            value: catalog.plans.length,
            hint: catalog.productDisplayName ?? "commercial offers",
          },
          {
            label: "Source",
            value: catalog.error ? "Unavailable" : "Billing API",
            hint: configured ? "BILLING_API_KEY set" : "configure BILLING_API_KEY",
          },
          {
            label: "Stripe prices",
            value: linkedPriceCount,
            hint: "linked references",
          },
          {
            label: "Trial",
            value: trialDays > 0 ? `${trialDays} days` : "None",
            hint: "from remote plans",
          },
        ]}
      />

      <PlatformNav showBilling />

      <BillingPlansManager
        plans={catalog.plans}
        productDisplayName={catalog.productDisplayName}
        adminUrl={adminUrl}
        error={catalog.error}
      />
    </div>
  );
}

import { Suspense } from "react";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { BillingPlansManager } from "@/components/billing-plans-manager";
import { BillingPlansToasts } from "@/components/billing-plans-toasts";
import { requireAdminSession } from "@/lib/auth-session";
import { isBillingConfigured } from "@/lib/billing-client";
import { getBillingCatalogPlans } from "@/lib/billing-plan-repository";
import {
  attachModuleToPlanAction,
  createModuleAction,
  createPlanAction,
  deleteModuleAction,
  detachModuleFromPlanAction,
  updateModuleAction,
  updatePlanAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function BillingPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ manage?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;

  const catalog = await getBillingCatalogPlans({ includeInactive: true });
  const configured = isBillingConfigured();
  const linkedPriceCount = catalog.plans.reduce(
    (count, plan) => count + Number(Boolean(plan.stripePriceId)),
    0,
  );
  const moduleCount = catalog.plans.reduce((count, plan) => count + plan.modules.length, 0);

  const status = catalog.error
    ? catalog.error === "not_configured"
      ? "API key missing"
      : catalog.error === "product_missing"
        ? "Product not found"
        : catalog.error === "empty"
          ? "No plans yet"
          : "Billing unavailable"
    : `${catalog.plans.length} plans · ${catalog.productModules.length} modules`;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        <BillingPlansToasts error={catalog.error} />
      </Suspense>

      <AppointmentPageHeader
        variant="command"
        eyebrow="Billing"
        title="Billing plans"
        description="Plans and modules come from the Vyntrise Billing service. Edit plan details and feature modules here — attached modules drive what’s included on pricing."
        status={status}
        statusTone={catalog.error ? "warning" : "success"}
        actions={[{ href: "/billing-admin", label: "Billing overview" }]}
        metrics={[
          {
            label: "Total plans",
            value: catalog.plans.length,
            hint: catalog.productDisplayName ?? "commercial offers",
          },
          {
            label: "Modules",
            value: catalog.productModules.length,
            hint: `${moduleCount} attached across plans`,
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
        ]}
      />

      <Suspense fallback={null}>
        <BillingPlansManager
          plans={catalog.plans}
          productModules={catalog.productModules}
          productId={catalog.productId}
          productDisplayName={catalog.productDisplayName}
          initialManagePlanId={params.manage ?? null}
          onCreateModule={createModuleAction}
          onUpdateModule={updateModuleAction}
          onDeleteModule={deleteModuleAction}
          onAttachModule={attachModuleToPlanAction}
          onDetachModule={detachModuleFromPlanAction}
          onUpdatePlan={updatePlanAction}
          onCreatePlan={createPlanAction}
        />
      </Suspense>
    </div>
  );
}

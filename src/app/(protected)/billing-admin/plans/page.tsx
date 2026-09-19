import { Suspense } from "react";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { BillingPlansManager } from "@/components/billing-plans-manager";
import { BillingPlansToasts } from "@/components/billing-plans-toasts";
import { requireAdminSession } from "@/lib/auth-session";
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
  const status = catalog.error
    ? catalog.error === "not_configured"
      ? "API key missing"
      : catalog.error === "product_missing"
        ? "Product not found"
        : catalog.error === "empty"
          ? "No plans yet"
          : "Billing unavailable"
    : `${catalog.plans.length} plan${catalog.plans.length === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <Suspense fallback={null}>
        <BillingPlansToasts error={catalog.error} />
      </Suspense>

      <AppointmentPageHeader
        variant="command"
        eyebrow="Billing"
        title="Plans"
        description="Set the price for each plan and choose which features it includes."
        status={status}
        statusTone={catalog.error ? "warning" : "success"}
        actions={[{ href: "/billing-admin", label: "Billing overview" }]}
      />

      <Suspense fallback={null}>
        <BillingPlansManager
          key={params.manage ?? "plans"}
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

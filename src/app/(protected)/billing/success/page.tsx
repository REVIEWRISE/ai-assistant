import { redirect } from "next/navigation";
import { BillingSuccessClient } from "@/components/billing-success-client";
import { requireSession } from "@/lib/auth-session";
import { getOrgBilling, isBillingAccessAllowed } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ session_id?: string }>;
};

export default async function BillingSuccessPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const params = (await searchParams) ?? {};
  const organizationId = session.activeOrganizationId;

  if (!organizationId) {
    redirect("/profile?error=organization_required");
  }

  const billing = await getOrgBilling(organizationId);
  if (billing && isBillingAccessAllowed(billing.billingStatus) && billing.billingStatus === "active") {
    redirect("/dashboard?success=subscription_active");
  }

  return (
    <div className="py-6">
      <BillingSuccessClient sessionId={params.session_id ?? null} />
    </div>
  );
}

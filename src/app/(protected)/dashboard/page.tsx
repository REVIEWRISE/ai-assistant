import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthSuccessToasts } from "@/components/auth-success-toasts";
import { DashboardView } from "@/components/dashboard-view";
import { getDashboardData } from "@/lib/dashboard-data";
import { requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { billingRedirectForStatus, getOrgBilling } from "@/lib/entitlements";

export default async function DashboardPage() {
  const session = await requireSession();
  if (session.activeOrganizationId && !(await userHasAdminRole(session.userId))) {
    const billing = await getOrgBilling(session.activeOrganizationId);
    const target = billing ? billingRedirectForStatus(billing.billingStatus) : null;
    if (target) redirect(target);
  }

  const data = await getDashboardData(session.userId, session.activeOrganizationId);

  return (
    <>
      <Suspense fallback={null}>
        <AuthSuccessToasts />
      </Suspense>
      <DashboardView data={data} />
    </>
  );
}

import { AuthSuccessToasts } from "@/components/auth-success-toasts";
import { DashboardView } from "@/components/dashboard-view";
import { getDashboardData } from "@/lib/dashboard-data";
import { requireSession } from "@/lib/auth-session";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.userId, session.activeOrganizationId);

  return (
    <>
      <AuthSuccessToasts />
      <DashboardView data={data} />
    </>
  );
}

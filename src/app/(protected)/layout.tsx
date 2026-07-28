import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  billingRedirectForStatus,
  getOrgBilling,
  isBillingBypassPath,
} from "@/lib/entitlements";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") || "";

  const adminRole = await prisma.userRole.findFirst({
    where: { userId: session.userId, role: { name: "Admin" } },
    select: { id: true },
  });
  const isAdmin = Boolean(adminRole);

  const onPlatform = pathname === "/platform" || pathname.startsWith("/platform/");
  const onBillingAdmin =
    pathname === "/billing-admin" || pathname.startsWith("/billing-admin/");
  const onAdminOnlySurface = onPlatform || onBillingAdmin;
  const bypass =
    isBillingBypassPath(pathname) &&
    (!onAdminOnlySurface || isAdmin);

  if (session.activeOrganizationId && pathname && !bypass) {
    // Non-admins should never stay on platform or billing-admin routes.
    if (onAdminOnlySurface && !isAdmin) {
      redirect("/dashboard");
    }

    // Platform admins are exempt from plan/trial billing lockouts.
    if (!isAdmin) {
      const billing = await getOrgBilling(session.activeOrganizationId);
      if (billing) {
        const target = billingRedirectForStatus(billing.billingStatus);
        if (target && target.split("?")[0] !== pathname) {
          redirect(target);
        }
      }
    }
  }

  return children;
}

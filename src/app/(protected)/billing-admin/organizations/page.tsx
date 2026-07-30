import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { BillingOrganizationsManager } from "@/components/billing-organizations-manager";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BillingAdminOrganizationsPage() {
  await requireAdminSession();

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      planSlug: true,
      billingStatus: true,
      billingInterval: true,
      trialEndsAt: true,
      paidAt: true,
      currentPeriodEndsAt: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });

  const counts = {
    active: 0,
    trialing: 0,
    needsPlan: 0,
    expired: 0,
  };
  for (const org of organizations) {
    const status = (org.billingStatus || "needs_plan").toLowerCase();
    if (status === "active") counts.active += 1;
    else if (status === "trialing") counts.trialing += 1;
    else if (status === "expired") counts.expired += 1;
    else counts.needsPlan += 1;
  }

  const rows = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    planSlug: org.planSlug,
    billingStatus: org.billingStatus,
    billingInterval: org.billingInterval,
    trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
    paidAt: org.paidAt?.toISOString() ?? null,
    currentPeriodEndsAt: org.currentPeriodEndsAt?.toISOString() ?? null,
    createdAt: org.createdAt.toISOString(),
    memberCount: org._count.members,
  }));

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <AppointmentPageHeader
        variant="command"
        eyebrow="Billing"
        title="Organizations"
        description="View workspace subscriptions and billing status. Plan changes come from customer checkout, not admin overrides."
        status={`${organizations.length} workspaces`}
        statusTone={counts.expired > 0 ? "warning" : "success"}
        actions={[{ href: "/billing-admin", label: "Billing overview" }]}
        metrics={[
          {
            label: "Active",
            value: counts.active,
            hint: "paid workspaces",
          },
          {
            label: "Trialing",
            value: counts.trialing,
            hint: "in trial window",
          },
          {
            label: "Needs plan",
            value: counts.needsPlan,
            hint: "awaiting selection",
          },
          {
            label: "Expired",
            value: counts.expired,
            hint: "trial or access ended",
          },
        ]}
      />

      <BillingOrganizationsManager organizations={rows} />
    </div>
  );
}

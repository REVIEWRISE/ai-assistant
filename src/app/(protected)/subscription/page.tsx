import { redirect } from "next/navigation";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { SubscriptionPanel } from "@/components/subscription-panel";
import { requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import {
  getBillingOrganizationCredits,
  getOrganizationBillingCustomerId,
} from "@/lib/billing-client";
import { getOrgBilling, isBillingAccessAllowed } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { canUpgradePlan, getPlanBySlug, type PlanSlug } from "@/lib/pricing-plans";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const session = await requireSession();
  if (await userHasAdminRole(session.userId)) {
    redirect("/billing-admin");
  }

  const organizationId = session.activeOrganizationId;
  if (!organizationId) {
    redirect("/appointments/organization");
  }

  const [billing, membership, organization, latestRefund, customerId] = await Promise.all([
    getOrgBilling(organizationId),
    prisma.organizationMember.findFirst({
      where: { userId: session.userId, organizationId },
      select: { role: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, paidAt: true, billingCustomerId: true },
    }),
    prisma.refundRequest.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        reason: true,
        notes: true,
        amountCents: true,
        currency: true,
        adminNote: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
    getOrganizationBillingCustomerId(organizationId).catch(() => null),
  ]);

  if (!billing || !organization) {
    redirect("/appointments/organization");
  }

  if (billing.billingStatus === "expired") {
    redirect("/billing/expired");
  }

  let credits = null;
  const resolvedCustomerId = organization.billingCustomerId || customerId;
  if (resolvedCustomerId) {
    credits = await getBillingOrganizationCredits(resolvedCustomerId).catch(() => null);
  }

  const isOwner = membership?.role === "owner";
  const canCancel =
    billing.billingStatus === "active" || billing.billingStatus === "trialing";
  const canRequestRefund =
    Boolean(organization.paidAt ?? billing.paidAt) &&
    (billing.billingStatus === "active" || billing.billingStatus === "trialing");

  const plan = billing.planSlug ? getPlanBySlug(billing.planSlug as PlanSlug) : null;
  const planName = plan?.name ?? "No plan";
  const statusLabel = billing.billingStatus.replace(/_/g, " ");
  const canUpgrade =
    isBillingAccessAllowed(billing.billingStatus) && canUpgradePlan(billing.planSlug);

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <AppointmentPageHeader
        variant="command"
        eyebrow="Billing"
        title="Your subscription"
        description={
          <>
            Plan and billing timeline for <span className="text-neutral-200">{organization.name}</span>.
            {billing.cancelAtPeriodEnd
              ? " Cancellation is scheduled. Access continues until the period ends."
              : canUpgrade
                ? " Upgrade anytime."
                : ""}
          </>
        }
        status={`${
          billing.cancelAtPeriodEnd ? "cancels" : statusLabel
        }${billing.billingInterval ? ` · ${billing.billingInterval}` : ""}`}
        statusTone={
          billing.billingStatus === "active"
            ? "success"
            : billing.billingStatus === "trialing"
              ? "neutral"
              : "warning"
        }
        actions={
          canUpgrade
            ? [{ href: "/billing?error=upgrade_required", label: "Upgrade plan", primary: true }]
            : []
        }
        metrics={[
          { label: "Plan", value: planName, hint: "workspace plan" },
          {
            label: "Status",
            value: statusLabel,
            hint: billing.paidAt ? "payment on file" : "free trial · not paid",
          },
          {
            label: billing.billingStatus === "trialing" ? "Bills as" : "Interval",
            value: billing.billingInterval ?? "—",
            hint:
              billing.billingStatus === "trialing"
                ? billing.billingInterval === "yearly"
                  ? "yearly after you subscribe"
                  : "monthly after you subscribe"
                : billing.billingInterval === "yearly"
                  ? "billed annually"
                  : "billed monthly",
          },
          {
            label:
              billing.billingStatus === "trialing"
                ? "Trial ends"
                : billing.currentPeriodEndsAt
                  ? "Period ends"
                  : "Next date",
            value: (
              billing.billingStatus === "trialing"
                ? billing.trialEndsAt
                : billing.currentPeriodEndsAt
            )
              ? (
                  billing.billingStatus === "trialing"
                    ? billing.trialEndsAt!
                    : billing.currentPeriodEndsAt!
                ).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })
              : "—",
            hint:
              billing.cancelAtPeriodEnd
                ? "won't renew"
                : billing.billingStatus === "trialing"
                  ? "14-day trial window"
                  : "renewal or cutoff",
          },
        ]}
      />

      <SubscriptionPanel
        subscription={{
          workspaceName: organization.name,
          planName,
          planPositioning: plan?.positioning ?? null,
          billingStatus: billing.billingStatus,
          billingInterval: billing.billingInterval,
          trialEndsAt: billing.trialEndsAt?.toISOString() ?? null,
          paidAt: billing.paidAt?.toISOString() ?? null,
          currentPeriodEndsAt: billing.currentPeriodEndsAt?.toISOString() ?? null,
          cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
          canCancel,
          canUpgrade,
          isOwner: Boolean(isOwner),
          refund: {
            canRequest: canRequestRefund,
            paidAt: organization.paidAt?.toISOString() ?? billing.paidAt?.toISOString() ?? null,
            planPriceCents: plan
              ? billing.billingInterval === "yearly"
                ? plan.yearlyPriceCents
                : plan.monthlyPriceCents
              : null,
            credits: credits
              ? {
                  totalBalanceCents: credits.totalBalanceCents,
                  expiring: credits.expiring,
                }
              : null,
            latest: latestRefund
              ? {
                  id: latestRefund.id,
                  status: latestRefund.status,
                  reason: latestRefund.reason,
                  notes: latestRefund.notes,
                  amountCents: latestRefund.amountCents,
                  currency: latestRefund.currency ?? "USD",
                  adminNote: latestRefund.adminNote,
                  createdAt: latestRefund.createdAt.toISOString(),
                  reviewedAt: latestRefund.reviewedAt?.toISOString() ?? null,
                }
              : null,
          },
        }}
      />
    </div>
  );
}

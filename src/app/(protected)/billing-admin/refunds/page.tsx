import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { BillingRefundsManager } from "@/components/billing-refunds-manager";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { syncPendingRefundRequests } from "@/lib/refund-sync";

export const dynamic = "force-dynamic";

export default async function BillingAdminRefundsPage() {
  await requireAdminSession();

  // Reconcile pending requests with live Billing service status
  await syncPendingRefundRequests();

  const [rows, totalCount] = await Promise.all([
    prisma.refundRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 500,
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
        organization: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.refundRequest.count(),
  ]);

  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const approvedCount = rows.filter((row) => row.status === "approved").length;
  const rejectedCount = rows.filter((row) => row.status === "rejected").length;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <AppointmentPageHeader
        variant="command"
        eyebrow="Billing"
        title="Refund requests"
        description="View customer refund requests and submission history. Financial refunds and subscription adjustments are processed directly in the Billing service."
        status={`${pendingCount} pending`}
        statusTone={pendingCount > 0 ? "warning" : "success"}
        actions={[{ href: "/billing-admin", label: "Billing overview" }]}
        metrics={[
          { label: "Pending", value: pendingCount, hint: "awaiting review" },
          { label: "Approved", value: approvedCount, hint: "refunds / credits issued" },
          { label: "Rejected", value: rejectedCount, hint: "declined" },
          {
            label: "Listed",
            value: rows.length,
            hint: totalCount > rows.length ? `${totalCount} total` : "all requests",
          },
        ]}
      />

      <BillingRefundsManager
        requests={rows.map((row) => ({
          id: row.id,
          status: row.status,
          reason: row.reason,
          notes: row.notes,
          amountCents: row.amountCents,
          currency: row.currency || "USD",
          adminNote: row.adminNote,
          createdAt: row.createdAt.toISOString(),
          reviewedAt: row.reviewedAt?.toISOString() ?? null,
          organization: row.organization,
          requestedBy: row.requestedBy,
          reviewedBy: row.reviewedBy,
        }))}
      />
    </div>
  );
}

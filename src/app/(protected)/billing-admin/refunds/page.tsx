import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { BillingRefundsManager } from "@/components/billing-refunds-manager";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BillingAdminRefundsPage() {
  await requireAdminSession();

  const rows = await prisma.refundRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      reason: true,
      notes: true,
      adminNote: true,
      createdAt: true,
      reviewedAt: true,
      organization: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, fullName: true, email: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });

  const pendingCount = rows.filter((row) => row.status === "pending").length;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <AppointmentPageHeader
        variant="command"
        eyebrow="Billing"
        title="Refund requests"
        description="Review customer refund requests. Approve submits the refund to Billing; reject leaves access unchanged."
        status={`${pendingCount} pending`}
        statusTone={pendingCount > 0 ? "warning" : "success"}
        actions={[{ href: "/billing-admin", label: "Billing overview" }]}
        metrics={[
          { label: "Pending", value: pendingCount, hint: "awaiting review" },
          { label: "Listed", value: rows.length, hint: "most recent 100" },
        ]}
      />

      <BillingRefundsManager
        requests={rows.map((row) => ({
          id: row.id,
          status: row.status,
          reason: row.reason,
          notes: row.notes,
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

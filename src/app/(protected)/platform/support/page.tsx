import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { SupportTicketsPanel } from "@/components/support-tickets-panel";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { supportTicketHasUnread } from "@/lib/support-tickets";

export const dynamic = "force-dynamic";

export default async function PlatformSupportPage() {
  await requireAdminSession();

  const tickets = await prisma.supportTicket.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 500,
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      requesterLastReadAt: true,
      adminLastReadAt: true,
      organization: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, authorRole: true },
      },
    },
  });

  const pendingCount = tickets.filter((ticket) => ticket.status === "pending").length;
  const inProgressCount = tickets.filter((ticket) => ticket.status === "in_progress").length;
  const completedCount = tickets.filter((ticket) => ticket.status === "completed").length;
  const unreadCount = tickets.filter((ticket) =>
    supportTicketHasUnread({
      viewer: "admin",
      lastMessageAt: ticket.messages[0]?.createdAt,
      lastMessageAuthorRole: ticket.messages[0]?.authorRole,
      requesterLastReadAt: ticket.requesterLastReadAt,
      adminLastReadAt: ticket.adminLastReadAt,
    }),
  ).length;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <AppointmentPageHeader
        variant="command"
        eyebrow="Platform"
        title="Support inbox"
        description="Review help requests from workspaces, reply in-thread, and move each request through progress, completion, or rejection."
        status={unreadCount > 0 ? `${unreadCount} unread` : `${pendingCount} pending`}
        statusTone={unreadCount > 0 || pendingCount > 0 ? "warning" : "success"}
        metrics={[
          { label: "Unread", value: unreadCount, hint: "needs attention" },
          { label: "Pending", value: pendingCount, hint: "awaiting reply" },
          { label: "Active", value: inProgressCount, hint: "in progress" },
          { label: "Completed", value: completedCount, hint: "resolved" },
        ]}
      />
      <SupportTicketsPanel
        mode="admin"
        detailBasePath="/platform/support"
        tickets={tickets.map((ticket) => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          organization: ticket.organization,
          createdBy: ticket.createdBy,
          unread: supportTicketHasUnread({
            viewer: "admin",
            lastMessageAt: ticket.messages[0]?.createdAt,
            lastMessageAuthorRole: ticket.messages[0]?.authorRole,
            requesterLastReadAt: ticket.requesterLastReadAt,
            adminLastReadAt: ticket.adminLastReadAt,
          }),
        }))}
      />
    </div>
  );
}

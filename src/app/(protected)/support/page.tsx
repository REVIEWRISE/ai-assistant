import { redirect } from "next/navigation";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { SupportTicketsPanel } from "@/components/support-tickets-panel";
import { requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { prisma } from "@/lib/prisma";
import { supportTicketHasUnread } from "@/lib/support-tickets";
import { createSupportTicket } from "./actions";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const session = await requireSession();
  if (await userHasAdminRole(session.userId)) {
    redirect("/platform/support");
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { createdByUserId: session.userId },
    orderBy: { updatedAt: "desc" },
    take: 200,
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

  const openCount = tickets.filter((ticket) =>
    ["pending", "in_progress"].includes(ticket.status),
  ).length;
  const completedCount = tickets.filter((ticket) => ticket.status === "completed").length;
  const pendingCount = tickets.filter((ticket) => ticket.status === "pending").length;
  const unreadCount = tickets.filter((ticket) =>
    supportTicketHasUnread({
      viewer: "user",
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
        title="Support"
        description="Ask for help from the platform team. You can follow the conversation and status updates here."
        status={unreadCount > 0 ? `${unreadCount} unread` : `${openCount} open`}
        statusTone={unreadCount > 0 || openCount > 0 ? "warning" : "success"}
        metrics={[
          { label: "Unread", value: unreadCount, hint: "new replies" },
          { label: "Pending", value: pendingCount, hint: "awaiting review" },
          { label: "Open", value: openCount, hint: "in conversation" },
          { label: "Completed", value: completedCount, hint: "resolved" },
        ]}
      />
      <SupportTicketsPanel
        mode="user"
        detailBasePath="/support"
        onCreate={createSupportTicket}
        tickets={tickets.map((ticket) => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          organization: ticket.organization,
          createdBy: ticket.createdBy,
          unread: supportTicketHasUnread({
            viewer: "user",
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

import { notFound, redirect } from "next/navigation";
import { SupportTicketThread } from "@/components/support-ticket-thread";
import { requireSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { prisma } from "@/lib/prisma";
import { canUserReplyToSupportTicket } from "@/lib/support-tickets";
import { markSupportTicketRead, replyToSupportTicket } from "../actions";

export const dynamic = "force-dynamic";

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  if (await userHasAdminRole(session.userId)) {
    redirect(`/platform/support/${id}`);
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      createdByUserId: true,
      organization: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          authorRole: true,
          createdAt: true,
          author: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });

  if (!ticket) notFound();
  if (ticket.createdByUserId !== session.userId) {
    redirect("/support");
  }

  await markSupportTicketRead(ticket.id);

  return (
    <div className="mx-auto max-w-[92rem]">
      <SupportTicketThread
        mode="user"
        backHref="/support"
        canReply={canUserReplyToSupportTicket(ticket.status)}
        onReply={replyToSupportTicket}
        ticket={{
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          rejectionReason: ticket.rejectionReason,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          organization: ticket.organization,
          createdBy: ticket.createdBy,
          assignedTo: ticket.assignedTo,
          messages: ticket.messages.map((message) => ({
            id: message.id,
            body: message.body,
            authorRole: message.authorRole,
            createdAt: message.createdAt.toISOString(),
            author: message.author,
          })),
        }}
      />
    </div>
  );
}

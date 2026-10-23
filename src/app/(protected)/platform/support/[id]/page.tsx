import { notFound } from "next/navigation";
import { SupportTicketThread } from "@/components/support-ticket-thread";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { canAdminReplyToSupportTicket } from "@/lib/support-tickets";
import {
  adminReplyToSupportTicket,
  adminUpdateSupportTicketStatus,
  markAdminSupportTicketRead,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function PlatformSupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
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

  await markAdminSupportTicketRead(ticket.id);

  return (
    <div className="mx-auto max-w-[92rem]">
      <SupportTicketThread
        mode="admin"
        backHref="/platform/support"
        canReply={canAdminReplyToSupportTicket(ticket.status)}
        onReply={adminReplyToSupportTicket}
        onStatusChange={adminUpdateSupportTicketStatus}
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

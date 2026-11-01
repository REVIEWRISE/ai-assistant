"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdminSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { writePlatformAudit } from "@/lib/platform-audit";
import {
  asSupportTicketStatus,
  canAdminReplyToSupportTicket,
  canAdminTransitionSupportTicket,
} from "@/lib/support-tickets";

export type AdminSupportActionResult =
  | { ok: true; ticketId?: string }
  | { ok: false; error: string };

function cleanBody(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

export async function adminReplyToSupportTicket(
  formData: FormData,
): Promise<AdminSupportActionResult> {
  const session = await requireAdminSession();
  const ticketId = String(formData.get("ticket_id") ?? "").trim();
  const body = cleanBody(formData.get("body"), 5000);
  if (!ticketId) return { ok: false, error: "Ticket is required." };
  if (body.length < 1) return { ok: false, error: "Write a message before sending." };

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true, organizationId: true },
  });
  if (!ticket) return { ok: false, error: "Ticket not found." };
  if (!canAdminReplyToSupportTicket(ticket.status)) {
    return { ok: false, error: "This request is closed." };
  }

  const now = new Date();
  await prisma.supportTicketMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: session.userId,
      authorRole: "admin",
      body,
    },
  });
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      updatedAt: now,
      assignedToUserId: session.userId,
      adminLastReadAt: now,
    },
  });

  await writePlatformAudit({
    actorId: session.userId,
    organizationId: ticket.organizationId,
    action: "support.ticket_replied",
    metadata: { ticketId: ticket.id, role: "admin" },
  });

  revalidatePath("/support");
  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/platform/support");
  revalidatePath(`/platform/support/${ticket.id}`);
  return { ok: true, ticketId: ticket.id };
}

export async function adminUpdateSupportTicketStatus(
  formData: FormData,
): Promise<AdminSupportActionResult> {
  const session = await requireAdminSession();
  const ticketId = String(formData.get("ticket_id") ?? "").trim();
  const nextStatus = asSupportTicketStatus(String(formData.get("status") ?? "").trim());
  const rejectionReason = cleanBody(formData.get("rejection_reason"), 2000);
  const note = cleanBody(formData.get("note"), 5000);

  if (!ticketId) return { ok: false, error: "Ticket is required." };
  if (!nextStatus) return { ok: false, error: "Choose a valid status." };

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true, organizationId: true },
  });
  if (!ticket) return { ok: false, error: "Ticket not found." };
  if (!canAdminTransitionSupportTicket(ticket.status, nextStatus)) {
    return {
      ok: false,
      error: `Cannot move from ${ticket.status} to ${nextStatus}.`,
    };
  }
  if (nextStatus === "rejected" && rejectionReason.length < 3) {
    return { ok: false, error: "Add a rejection reason." };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        rejectionReason: nextStatus === "rejected" ? rejectionReason : null,
        assignedToUserId: session.userId,
        statusChangedAt: now,
        updatedAt: now,
        adminLastReadAt: now,
      },
    });

    if (note) {
      await tx.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: session.userId,
          authorRole: "admin",
          body: note,
        },
      });
    } else if (nextStatus === "rejected") {
      await tx.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: session.userId,
          authorRole: "admin",
          body: `Request rejected: ${rejectionReason}`,
        },
      });
    }
  });

  await writePlatformAudit({
    actorId: session.userId,
    organizationId: ticket.organizationId,
    action: "support.ticket_status_changed",
    metadata: {
      ticketId: ticket.id,
      from: ticket.status,
      to: nextStatus,
      rejectionReason: nextStatus === "rejected" ? rejectionReason : undefined,
    },
  });

  revalidatePath("/support");
  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/platform/support");
  revalidatePath(`/platform/support/${ticket.id}`);
  return { ok: true, ticketId: ticket.id };
}

export async function markAdminSupportTicketRead(ticketId: string): Promise<void> {
  await requireAdminSession();
  const id = ticketId.trim();
  if (!id) return;

  await prisma.supportTicket.updateMany({
    where: { id },
    data: { adminLastReadAt: new Date() },
  });
  // Called from the detail page render — defer cache bust until after the response.
  after(() => {
    revalidatePath("/platform/support");
  });
}

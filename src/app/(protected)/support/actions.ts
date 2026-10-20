"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { writePlatformAudit } from "@/lib/platform-audit";
import { canUserReplyToSupportTicket } from "@/lib/support-tickets";

export type SupportActionResult = { ok: true; ticketId?: string } | { ok: false; error: string };

function cleanText(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function cleanBody(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

export async function createSupportTicket(formData: FormData): Promise<SupportActionResult> {
  const session = await requireSession();
  const organizationId = session.activeOrganizationId;
  if (!organizationId) {
    return { ok: false, error: "Select a workspace before contacting support." };
  }

  const subject = cleanText(formData.get("subject"), 160);
  const body = cleanBody(formData.get("body"), 5000);
  if (!subject) return { ok: false, error: "Add a short subject." };
  if (body.length < 10) return { ok: false, error: "Describe your request in a bit more detail." };

  const now = new Date();
  const ticket = await prisma.supportTicket.create({
    data: {
      organizationId,
      createdByUserId: session.userId,
      subject,
      status: "pending",
      requesterLastReadAt: now,
      messages: {
        create: {
          authorId: session.userId,
          authorRole: "user",
          body,
        },
      },
    },
    select: { id: true },
  });

  await writePlatformAudit({
    actorId: session.userId,
    organizationId,
    action: "support.ticket_created",
    metadata: { ticketId: ticket.id, subject },
  });

  revalidatePath("/support");
  revalidatePath("/platform/support");
  return { ok: true, ticketId: ticket.id };
}

export async function replyToSupportTicket(formData: FormData): Promise<SupportActionResult> {
  const session = await requireSession();
  const ticketId = String(formData.get("ticket_id") ?? "").trim();
  const body = cleanBody(formData.get("body"), 5000);
  if (!ticketId) return { ok: false, error: "Ticket is required." };
  if (body.length < 1) return { ok: false, error: "Write a message before sending." };

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      createdByUserId: true,
    },
  });
  if (!ticket) return { ok: false, error: "Ticket not found." };
  if (ticket.createdByUserId !== session.userId) {
    return { ok: false, error: "You can only reply to your own support requests." };
  }
  if (!canUserReplyToSupportTicket(ticket.status)) {
    return { ok: false, error: "This request is closed. Open a new one if you still need help." };
  }

  const now = new Date();
  await prisma.supportTicketMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: session.userId,
      authorRole: "user",
      body,
    },
  });
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { updatedAt: now, requesterLastReadAt: now },
  });

  await writePlatformAudit({
    actorId: session.userId,
    organizationId: ticket.organizationId,
    action: "support.ticket_replied",
    metadata: { ticketId: ticket.id, role: "user" },
  });

  revalidatePath("/support");
  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/platform/support");
  revalidatePath(`/platform/support/${ticket.id}`);
  return { ok: true, ticketId: ticket.id };
}

export async function markSupportTicketRead(ticketId: string): Promise<void> {
  const session = await requireSession();
  const id = ticketId.trim();
  if (!id) return;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, createdByUserId: true },
  });
  if (!ticket || ticket.createdByUserId !== session.userId) return;

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { requesterLastReadAt: new Date() },
  });
  // Called from the detail page render — defer cache bust until after the response.
  after(() => {
    revalidatePath("/support");
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { writePlatformAudit } from "@/lib/platform-audit";
import { postSupportAiAutoReply } from "@/lib/support-ai-auto-reply";
import { canUserReplyToSupportTicket } from "@/lib/support-tickets";

export type SupportActionResult = { ok: true; ticketId?: string } | { ok: false; error: string };

export type SupportChatMessage = {
  id: string;
  body: string;
  authorRole: string;
  createdAt: string;
};

export type SupportChatTicket = {
  id: string;
  subject: string;
  status: string;
  messages: SupportChatMessage[];
};

export type SupportChatResult =
  | { ok: true; ticket: SupportChatTicket | null }
  | { ok: false; error: string };

const messageSelect = {
  id: true,
  body: true,
  authorRole: true,
  createdAt: true,
} as const;

function mapChatTicket(ticket: {
  id: string;
  subject: string;
  status: string;
  messages: Array<{
    id: string;
    body: string;
    authorRole: string;
    createdAt: Date;
  }>;
}): SupportChatTicket {
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    messages: ticket.messages.map((message) => ({
      id: message.id,
      body: message.body,
      authorRole: message.authorRole,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

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
  if (await userHasAdminRole(session.userId)) {
    return { ok: false, error: "Platform admins handle the inbox — they can’t open new requests." };
  }
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
  after(() => {
    void postSupportAiAutoReply(ticket.id);
  });
  return { ok: true, ticketId: ticket.id };
}

export async function replyToSupportTicket(formData: FormData): Promise<SupportActionResult> {
  const session = await requireSession();
  if (await userHasAdminRole(session.userId)) {
    return { ok: false, error: "Use the platform support inbox to reply as support." };
  }
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
  after(() => {
    void postSupportAiAutoReply(ticket.id);
  });
  return { ok: true, ticketId: ticket.id };
}

export async function getSupportChatTicket(
  ticketId?: string | null,
): Promise<SupportChatResult> {
  const session = await requireSession();
  if (await userHasAdminRole(session.userId)) {
    return { ok: true, ticket: null };
  }

  const preferredId = String(ticketId ?? "").trim();
  if (preferredId) {
    const preferred = await prisma.supportTicket.findFirst({
      where: {
        id: preferredId,
        createdByUserId: session.userId,
      },
      select: {
        id: true,
        subject: true,
        status: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: messageSelect,
        },
      },
    });
    if (preferred && canUserReplyToSupportTicket(preferred.status)) {
      return { ok: true, ticket: mapChatTicket(preferred) };
    }
  }

  const open = await prisma.supportTicket.findFirst({
    where: {
      createdByUserId: session.userId,
      status: { in: ["pending", "in_progress"] },
      ...(session.activeOrganizationId
        ? { organizationId: session.activeOrganizationId }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      subject: true,
      status: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: messageSelect,
      },
    },
  });

  return { ok: true, ticket: open ? mapChatTicket(open) : null };
}

/** Floating chat helper: continue an open ticket or create one from the first message. */
export async function sendSupportChatMessage(
  message: string,
  ticketId?: string | null,
): Promise<SupportChatResult> {
  const session = await requireSession();
  if (await userHasAdminRole(session.userId)) {
    return { ok: false, error: "Platform admins use the support inbox." };
  }
  const organizationId = session.activeOrganizationId;
  if (!organizationId) {
    return { ok: false, error: "Select a workspace before contacting support." };
  }

  const body = cleanBody(message, 5000);
  if (body.length < 1) return { ok: false, error: "Write a message before sending." };

  const preferredId = String(ticketId ?? "").trim();
  let ticket =
    preferredId
      ? await prisma.supportTicket.findFirst({
          where: { id: preferredId, createdByUserId: session.userId },
          select: { id: true, status: true, organizationId: true, subject: true },
        })
      : null;

  if (ticket && !canUserReplyToSupportTicket(ticket.status)) {
    ticket = null;
  }

  if (!ticket) {
    const existingOpen = await prisma.supportTicket.findFirst({
      where: {
        createdByUserId: session.userId,
        organizationId,
        status: { in: ["pending", "in_progress"] },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, status: true, organizationId: true, subject: true },
    });
    ticket = existingOpen;
  }

  const now = new Date();

  if (!ticket) {
    const subject =
      cleanText(body.slice(0, 80), 160) || "Support chat";
    const created = await prisma.supportTicket.create({
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
      select: {
        id: true,
        subject: true,
        status: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: messageSelect,
        },
      },
    });

    await writePlatformAudit({
      actorId: session.userId,
      organizationId,
      action: "support.ticket_created",
      metadata: { ticketId: created.id, subject: created.subject, source: "chat_widget" },
    });

    revalidatePath("/support");
    revalidatePath("/platform/support");
    after(() => {
      void postSupportAiAutoReply(created.id);
    });
    return { ok: true, ticket: mapChatTicket(created) };
  }

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
    metadata: { ticketId: ticket.id, role: "user", source: "chat_widget" },
  });

  const refreshed = await prisma.supportTicket.findUnique({
    where: { id: ticket.id },
    select: {
      id: true,
      subject: true,
      status: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: messageSelect,
      },
    },
  });

  revalidatePath("/support");
  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/platform/support");
  revalidatePath(`/platform/support/${ticket.id}`);
  after(() => {
    void postSupportAiAutoReply(ticket.id);
  });

  return {
    ok: true,
    ticket: refreshed ? mapChatTicket(refreshed) : null,
  };
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

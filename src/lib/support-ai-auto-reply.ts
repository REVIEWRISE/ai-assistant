import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateSupportAiReplyText } from "@/lib/support-ai-reply";
import {
  isSupportTicketOpen,
  SUPPORT_AI_USER_EMAIL,
  SUPPORT_AI_USER_ID,
} from "@/lib/support-tickets";

async function ensureSupportAiUserId(): Promise<string | null> {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ id: SUPPORT_AI_USER_ID }, { email: SUPPORT_AI_USER_EMAIL }],
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await prisma.user.create({
      data: {
        id: SUPPORT_AI_USER_ID,
        email: SUPPORT_AI_USER_EMAIL,
        fullName: "Support AI",
        passwordHash: null,
        accountStatus: "active",
        emailVerified: true,
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    console.warn("[support-ai] failed to ensure system user:", err);
    const fallback = await prisma.user.findUnique({
      where: { email: SUPPORT_AI_USER_EMAIL },
      select: { id: true },
    });
    return fallback?.id ?? null;
  }
}

/**
 * Generates and posts an AI reply for an open ticket whose latest message is from the user.
 * Safe to call from `after()` — failures are logged and do not throw to the caller path.
 */
export async function postSupportAiAutoReply(ticketId: string): Promise<void> {
  const id = ticketId.trim();
  if (!id) return;

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        status: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            authorRole: true,
            body: true,
          },
        },
      },
    });
    if (!ticket) return;
    if (!isSupportTicketOpen(ticket.status)) return;

    const last = ticket.messages[ticket.messages.length - 1];
    if (!last || last.authorRole !== "user") return;

    const authorId = await ensureSupportAiUserId();
    if (!authorId) {
      console.warn("[support-ai] no system user; skipping auto-reply");
      return;
    }

    const result = await generateSupportAiReplyText({
      subject: ticket.subject,
      messages: ticket.messages,
    });
    if (!result.text) {
      console.warn("[support-ai] no reply generated:", result.errorHint ?? "unknown");
      return;
    }

    // Re-check so we do not double-post if another reply landed first.
    const latest = await prisma.supportTicketMessage.findFirst({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "desc" },
      select: { authorRole: true },
    });
    if (!latest || latest.authorRole !== "user") return;

    const stillOpen = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      select: { status: true },
    });
    if (!stillOpen || !isSupportTicketOpen(stillOpen.status)) return;

    const now = new Date();
    await prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId,
        authorRole: "ai",
        body: result.text,
      },
    });
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: now },
    });

    revalidatePath("/support");
    revalidatePath(`/support/${ticket.id}`);
    revalidatePath("/platform/support");
    revalidatePath(`/platform/support/${ticket.id}`);
  } catch (err) {
    console.warn("[support-ai] auto-reply failed:", err);
  }
}

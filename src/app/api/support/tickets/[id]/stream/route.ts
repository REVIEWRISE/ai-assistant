import { getValidSession } from "@/lib/auth-session";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 1500;
const HEARTBEAT_MS = 15000;
const MAX_STREAM_MS = 10 * 60 * 1000;

type TicketSnap = {
  fingerprint: string;
};

async function authorizeTicketAccess(
  ticketId: string,
  userId: string,
): Promise<boolean> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { createdByUserId: true },
  });
  if (!ticket) return false;
  if (ticket.createdByUserId === userId) return true;
  return userHasAdminRole(userId);
}

async function readTicketSnap(ticketId: string): Promise<TicketSnap | null> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      status: true,
      updatedAt: true,
      rejectionReason: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true },
      },
      _count: { select: { messages: true } },
    },
  });
  if (!ticket) return null;

  const lastMessageId = ticket.messages[0]?.id ?? "none";
  const fingerprint = [
    ticket.status,
    ticket.updatedAt.toISOString(),
    ticket.rejectionReason ?? "",
    String(ticket._count.messages),
    lastMessageId,
  ].join("|");

  return { fingerprint };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getValidSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: ticketId } = await context.params;
  if (!ticketId) {
    return new Response("Not found", { status: 404 });
  }

  const allowed = await authorizeTicketAccess(ticketId, session.userId);
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let interval: ReturnType<typeof setInterval> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      const comment = (text: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ${text}\n\n`));
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (interval) clearInterval(interval);
        if (heartbeat) clearInterval(heartbeat);
        if (maxTimer) clearTimeout(maxTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      let lastFingerprint: string | null = null;
      let primed = false;

      const tick = async () => {
        if (closed) return;
        try {
          const snap = await readTicketSnap(ticketId);
          if (!snap) {
            send("gone", { ticketId });
            close();
            return;
          }
          if (!primed) {
            lastFingerprint = snap.fingerprint;
            primed = true;
            return;
          }
          if (snap.fingerprint !== lastFingerprint) {
            lastFingerprint = snap.fingerprint;
            send("ticket", { ticketId, fingerprint: snap.fingerprint });
          }
        } catch (err) {
          console.warn("[support-sse] poll failed:", err);
        }
      };

      await tick();
      interval = setInterval(() => {
        void tick();
      }, POLL_MS);
      heartbeat = setInterval(() => {
        comment(`hb ${Date.now()}`);
      }, HEARTBEAT_MS);
      maxTimer = setTimeout(() => {
        send("reconnect", { reason: "max_duration" });
        close();
      }, MAX_STREAM_MS);

      _request.signal.addEventListener("abort", close);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
      if (heartbeat) clearInterval(heartbeat);
      if (maxTimer) clearTimeout(maxTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

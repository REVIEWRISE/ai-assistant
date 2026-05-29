import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  crmIntegrationIsDispatchReady,
  resolveCrmIntegrationConfig,
  type CrmIntegrationConfig,
} from "@/lib/crm-integration";

export type BookingCrmWebhookPayload = {
  event: "booking.created";
  sentAt: string;
  organization: {
    id: string;
    name: string;
  };
  appointment: {
    id: string;
    customerName: string;
    customerEmail: string | null;
    startTime: string;
    endTime: string;
    status: string;
    source: string;
    serviceDescription: string | null;
    partySize: number | null;
    bookingFlowQa: Array<{ question: string; answer: string }> | null;
    rawMessage: string | null;
  };
};

export type DispatchBookingCrmWebhookParams = {
  organizationId: string;
  organizationName: string;
  crmIntegration?: unknown;
  appointment: {
    id: string;
    customerName: string;
    customerEmail: string | null;
    startTime: Date;
    endTime: Date;
    status: string;
    source: string;
    serviceDescription: string | null;
    partySize: number | null;
    bookingFlowQa: Array<{ question: string; answer: string }> | null;
    rawMessage: string | null;
  };
};

function signPayload(body: string, secret: string): string {
  const digest = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${digest}`;
}

export async function dispatchBookingCrmWebhook(
  params: DispatchBookingCrmWebhookParams,
): Promise<{ dispatched: boolean; ok?: boolean; status?: number; error?: string }> {
  const config: CrmIntegrationConfig = resolveCrmIntegrationConfig(params.crmIntegration);
  if (!crmIntegrationIsDispatchReady(config)) {
    return { dispatched: false };
  }
  if (!config.events.includes("booking.created")) {
    return { dispatched: false };
  }

  const payload: BookingCrmWebhookPayload = {
    event: "booking.created",
    sentAt: new Date().toISOString(),
    organization: {
      id: params.organizationId,
      name: params.organizationName,
    },
    appointment: {
      id: params.appointment.id,
      customerName: params.appointment.customerName,
      customerEmail: params.appointment.customerEmail,
      startTime: params.appointment.startTime.toISOString(),
      endTime: params.appointment.endTime.toISOString(),
      status: params.appointment.status,
      source: params.appointment.source,
      serviceDescription: params.appointment.serviceDescription,
      partySize: params.appointment.partySize,
      bookingFlowQa: params.appointment.bookingFlowQa,
      rawMessage: params.appointment.rawMessage,
    },
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "VyntRise-Booking-Webhook/1.0",
    "X-VyntRise-Event": "booking.created",
  };
  if (config.signingSecret) {
    headers["X-VyntRise-Signature"] = signPayload(body, config.signingSecret);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        dispatched: true,
        ok: false,
        status: res.status,
        error: text.slice(0, 500) || res.statusText,
      };
    }
    return { dispatched: true, ok: true, status: res.status };
  } catch (err) {
    return {
      dispatched: true,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Fire-and-forget CRM webhook with audit logging (matches email/calendar pattern). */
export function enqueueBookingCrmWebhook(params: DispatchBookingCrmWebhookParams): void {
  void dispatchBookingCrmWebhook(params)
    .then(async (result) => {
      if (!result.dispatched) return;

      await prisma.auditEvent.create({
        data: {
          organizationId: params.organizationId,
          actorId: null,
          action: result.ok ? "chatbot_crm_webhook_delivered" : "chatbot_crm_webhook_failed",
          metadata: {
            appointmentId: params.appointment.id,
            status: result.status ?? null,
            error: result.error ?? null,
          },
        },
      });
    })
    .catch((err) => {
      console.warn(
        "booking crm webhook exception",
        err instanceof Error ? err.message : String(err),
      );
    });
}

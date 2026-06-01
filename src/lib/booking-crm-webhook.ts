import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  crmIntegrationIsDispatchReady,
  resolveCrmIntegrationConfig,
  type CrmIntegrationConfig,
} from "@/lib/crm-integration";
import { resolveBookingFlowConfig, type BookingFlowConfig } from "@/lib/chatbot-config";
import { parseBookingFlowQaPayload, type BookingFlowQaItem } from "@/lib/booking-flow-qa";

export type BookingFlowSnapshot = {
  version: 1;
  slotDurationMinutes: number;
  minGapMinutes: number;
  steps: Array<{
    id: string;
    question: string;
    inputType: string;
  }>;
};

export function buildBookingFlowSnapshot(flow: BookingFlowConfig): BookingFlowSnapshot {
  return {
    version: flow.version,
    slotDurationMinutes: flow.slotDurationMinutes,
    minGapMinutes: flow.minGapMinutes,
    steps: flow.steps.map((step) => ({
      id: step.id,
      question: step.question,
      inputType: step.inputType ?? "options",
    })),
  };
}

export type BookingCrmWebhookPayload = {
  event: "booking.created";
  sentAt: string;
  organization: {
    id: string;
    name: string;
  };
  bookingFlow: BookingFlowSnapshot;
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
    bookingFlowQa: BookingFlowQaItem[] | null;
    rawMessage: string | null;
  };
};

export type DispatchBookingCrmWebhookParams = {
  organizationId: string;
  organizationName: string;
  crmIntegration?: unknown;
  bookingFlow?: unknown;
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
    bookingFlowQa: BookingFlowQaItem[] | null;
    rawMessage: string | null;
  };
};

export type CrmWebhookDeliveryResult = {
  dispatched: boolean;
  ok?: boolean;
  status?: number;
  error?: string;
  attempts?: number;
};

const CRM_WEBHOOK_MAX_ATTEMPTS = 3;
const CRM_WEBHOOK_RETRY_DELAYS_MS = [0, 1500, 4000];

function signPayload(body: string, secret: string): string {
  const digest = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${digest}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchBookingCrmWebhook(
  params: DispatchBookingCrmWebhookParams,
): Promise<Omit<CrmWebhookDeliveryResult, "attempts">> {
  const config: CrmIntegrationConfig = resolveCrmIntegrationConfig(params.crmIntegration);
  if (!crmIntegrationIsDispatchReady(config)) {
    return { dispatched: false };
  }
  if (!config.events.includes("booking.created")) {
    return { dispatched: false };
  }

  const flowSnapshot = buildBookingFlowSnapshot(resolveBookingFlowConfig(params.bookingFlow));

  const payload: BookingCrmWebhookPayload = {
    event: "booking.created",
    sentAt: new Date().toISOString(),
    organization: {
      id: params.organizationId,
      name: params.organizationName,
    },
    bookingFlow: flowSnapshot,
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

export async function markAppointmentCrmSyncSkipped(
  appointmentId: string,
  organizationId: string,
): Promise<void> {
  await prisma.appointment.updateMany({
    where: { id: appointmentId, organizationId },
    data: {
      crmSyncStatus: "skipped_no_integration",
      crmSyncError: null,
    },
  });
}

export async function markAppointmentCrmSyncSucceeded(
  appointmentId: string,
  organizationId: string,
  attempts: number,
): Promise<void> {
  await prisma.appointment.updateMany({
    where: { id: appointmentId, organizationId },
    data: {
      crmSyncStatus: "synced",
      crmSyncError: null,
      crmSyncAttempts: attempts,
    },
  });
}

export async function markAppointmentCrmSyncFailed(
  appointmentId: string,
  organizationId: string,
  errorMessage: string,
  attempts: number,
): Promise<void> {
  await prisma.appointment.updateMany({
    where: { id: appointmentId, organizationId },
    data: {
      crmSyncStatus: "failed",
      crmSyncError: errorMessage.slice(0, 2000),
      crmSyncAttempts: attempts,
    },
  });
}

async function logCrmWebhookAudit(
  organizationId: string,
  appointmentId: string,
  ok: boolean,
  metadata: { status?: number; error?: string | null; attempts?: number },
): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      organizationId,
      actorId: null,
      action: ok ? "chatbot_crm_webhook_delivered" : "chatbot_crm_webhook_failed",
      metadata: {
        appointmentId,
        status: metadata.status ?? null,
        error: metadata.error ?? null,
        attempts: metadata.attempts ?? null,
      },
    },
  });
}

/** POST to CRM with automatic retries; updates appointment sync columns. */
export async function deliverAppointmentCrmWebhook(
  params: DispatchBookingCrmWebhookParams,
): Promise<CrmWebhookDeliveryResult> {
  const config = resolveCrmIntegrationConfig(params.crmIntegration);
  if (!crmIntegrationIsDispatchReady(config)) {
    await markAppointmentCrmSyncSkipped(params.appointment.id, params.organizationId);
    return { dispatched: false };
  }

  let lastError = "CRM webhook failed";
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= CRM_WEBHOOK_MAX_ATTEMPTS; attempt++) {
    const delay = CRM_WEBHOOK_RETRY_DELAYS_MS[attempt - 1] ?? 0;
    if (delay > 0) await sleep(delay);

    const result = await dispatchBookingCrmWebhook(params);
    if (!result.dispatched) {
      await markAppointmentCrmSyncSkipped(params.appointment.id, params.organizationId);
      return { dispatched: false };
    }

    if (result.ok) {
      await markAppointmentCrmSyncSucceeded(
        params.appointment.id,
        params.organizationId,
        attempt,
      );
      await logCrmWebhookAudit(params.organizationId, params.appointment.id, true, {
        status: result.status,
        attempts: attempt,
      });
      return { dispatched: true, ok: true, status: result.status, attempts: attempt };
    }

    lastError = result.error ?? "CRM webhook failed";
    lastStatus = result.status;
  }

  await markAppointmentCrmSyncFailed(
    params.appointment.id,
    params.organizationId,
    lastError,
    CRM_WEBHOOK_MAX_ATTEMPTS,
  );
  await logCrmWebhookAudit(params.organizationId, params.appointment.id, false, {
    status: lastStatus,
    error: lastError,
    attempts: CRM_WEBHOOK_MAX_ATTEMPTS,
  });

  return {
    dispatched: true,
    ok: false,
    status: lastStatus,
    error: lastError,
    attempts: CRM_WEBHOOK_MAX_ATTEMPTS,
  };
}

/** Fire-and-forget CRM delivery with retries (booking API). */
export function enqueueBookingCrmWebhook(params: DispatchBookingCrmWebhookParams): void {
  void deliverAppointmentCrmWebhook(params).catch((err) => {
    console.warn(
      "booking crm webhook exception",
      err instanceof Error ? err.message : String(err),
    );
  });
}

/** Load appointment + org settings and re-deliver (manual retry from overview). */
export async function retryAppointmentCrmWebhookDelivery(
  appointmentId: string,
  organizationId: string,
): Promise<CrmWebhookDeliveryResult> {
  const [appointment, org, chatbotSettings] = await Promise.all([
    prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        startTime: true,
        endTime: true,
        status: true,
        source: true,
        serviceDescription: true,
        partySize: true,
        bookingFlowQa: true,
        rawMessage: true,
        crmSyncStatus: true,
      },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    prisma.organizationChatbotSettings.findUnique({
      where: { organizationId },
      select: { crmIntegration: true, bookingFlow: true },
    }),
  ]);

  if (!appointment || !org) {
    return { dispatched: false, error: "Appointment not found" };
  }

  if (appointment.crmSyncStatus === "synced") {
    return { dispatched: true, ok: true };
  }

  return deliverAppointmentCrmWebhook({
    organizationId,
    organizationName: org.name,
    crmIntegration: chatbotSettings?.crmIntegration,
    bookingFlow: chatbotSettings?.bookingFlow,
    appointment: {
      id: appointment.id,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      source: appointment.source,
      serviceDescription: appointment.serviceDescription,
      partySize: appointment.partySize,
      bookingFlowQa: parseBookingFlowQaPayload(appointment.bookingFlowQa),
      rawMessage: appointment.rawMessage,
    },
  });
}

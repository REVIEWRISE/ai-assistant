import type { BookingFlowConfig, BookingFlowStep } from "@/lib/chatbot-config";
import type { BookingFlowQaItem } from "@/lib/booking-flow-qa";
import {
  buildBookingFlowSnapshot,
  type BookingCrmWebhookPayload,
} from "@/lib/booking-crm-webhook";

function sampleAnswerForStep(step: BookingFlowStep): string {
  switch (step.inputType) {
    case "datetime":
      return "Sun, Jun 1, 7:30 PM";
    case "email":
      return "jane@example.com";
    case "text":
      return "Any special requests noted here";
    case "options":
      return step.options[0]?.label ?? "First option";
    default:
      return step.options[0]?.label ?? "Sample answer";
  }
}

export function buildExampleBookingFlowQa(flow: BookingFlowConfig): BookingFlowQaItem[] {
  return flow.steps.map((step) => ({
    stepId: step.id,
    question: step.question || step.id,
    answer: sampleAnswerForStep(step),
  }));
}

/** Example webhook body for this organization's current booking flow (documentation / UI). */
export function buildBookingCrmWebhookExamplePayload(params: {
  organizationId: string;
  organizationName: string;
  bookingFlow: BookingFlowConfig;
}): BookingCrmWebhookPayload {
  const bookingFlowQa = buildExampleBookingFlowQa(params.bookingFlow);
  const start = new Date("2026-06-01T19:30:00.000Z");
  const end = new Date(
    start.getTime() + params.bookingFlow.slotDurationMinutes * 60 * 1000,
  );

  const serviceFromQa =
    bookingFlowQa.find((qa) => /service|meal|visit|type|book/i.test(qa.question))?.answer ??
    bookingFlowQa[0]?.answer ??
    null;

  return {
    event: "booking.created",
    sentAt: new Date().toISOString(),
    organization: {
      id: params.organizationId,
      name: params.organizationName,
    },
    bookingFlow: buildBookingFlowSnapshot(params.bookingFlow),
    appointment: {
      id: "00000000-0000-4000-8000-000000000001",
      customerName: "Jane Doe",
      customerEmail: bookingFlowQa.find((qa) => qa.stepId.includes("email") || /email/i.test(qa.question))
        ?.answer ?? "jane@example.com",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: "requested",
      source: "chatbot_embed",
      serviceDescription: serviceFromQa,
      partySize: bookingFlowQa.find((qa) => /party|guest|people/i.test(qa.question))
        ? 4
        : null,
      bookingFlowQa: bookingFlowQa.length > 0 ? bookingFlowQa : null,
      rawMessage: "Completed guided booking flow",
    },
  };
}

export function formatBookingCrmWebhookExampleJson(payload: BookingCrmWebhookPayload): string {
  return JSON.stringify(payload, null, 2);
}

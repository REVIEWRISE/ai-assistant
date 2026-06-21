import { NextResponse } from "next/server";
import {
  executeVoiceRetellBooking,
  extractRetellToolArgs,
  parseVoiceRetellBookingArgs,
  resolveRetellPhoneBookingContext,
} from "@/lib/voice-retell-booking";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const context = await resolveRetellPhoneBookingContext(
    rawBody,
    body,
    request.headers.get("x-retell-signature"),
  );
  if ("status" in context) {
    return NextResponse.json(context.body, { status: context.status });
  }

  const args = parseVoiceRetellBookingArgs(extractRetellToolArgs(body));
  if (!args) {
    return NextResponse.json(
      {
        success: false,
        result:
          "Missing booking details. Ask each organization booking-flow question, collect answers, then call book_appointment with booking_flow_answers.",
      },
      { status: 200 },
    );
  }

  const result = await executeVoiceRetellBooking({
    organizationId: context.organizationId,
    organizationName: context.organizationName,
    bookingArgs: args,
    callId: context.callId || undefined,
  });

  return NextResponse.json({
    success: result.ok,
    result: result.message,
    appointment_id: result.ok ? result.appointmentId : undefined,
  });
}

import { NextResponse } from "next/server";
import {
  executeVoiceRetellBooking,
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
    body,
    request.headers.get("x-retell-signature"),
  );
  if ("status" in context) {
    return NextResponse.json(context.body, { status: context.status });
  }

  const args = parseVoiceRetellBookingArgs(body.args);
  if (!args) {
    return NextResponse.json(
      {
        result:
          "Missing booking details. Collect customer name, service, party size, and start time, then try again.",
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

  return NextResponse.json({ result: result.message });
}

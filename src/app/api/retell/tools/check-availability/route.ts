import { NextResponse } from "next/server";
import {
  executeVoiceRetellAvailabilityCheck,
  extractRetellToolArgs,
  parseVoiceRetellAvailabilityArgs,
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

  const args = parseVoiceRetellAvailabilityArgs(extractRetellToolArgs(body));
  if (!args) {
    return NextResponse.json(
      {
        success: false,
        available: false,
        result: "Provide a valid start_time_iso to check availability.",
      },
      { status: 200 },
    );
  }

  const result = await executeVoiceRetellAvailabilityCheck({
    organizationId: context.organizationId,
    availabilityArgs: args,
  });

  return NextResponse.json({
    success: true,
    result: result.message,
    available: result.available,
  });
}

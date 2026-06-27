import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRetellApiKey } from "@/lib/retell-api";
import { verifyRetellWebhookSignature } from "@/lib/retell-webhook-verify";
import { findVoiceAgentOrgByRetellAgentId } from "@/lib/voice-retell-booking";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-retell-signature");

  const apiKey = getRetellApiKey();
  if (apiKey) {
    const sig = signature?.trim() ?? "";
    if (!sig) {
      console.warn("[retell-webhook] Missing x-retell-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    if (!verifyRetellWebhookSignature(rawBody, sig, apiKey)) {
      console.warn("[retell-webhook] Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = typeof payload.event === "string" ? payload.event.trim() : "";
  if (event !== "call_analyzed") {
    // Retell sends call_started, call_ended, and call_analyzed.
    // We only process call_analyzed because it has the complete summary, sentiment, and cost.
    return NextResponse.json({ received: true, skippedEvent: event }, { status: 200 });
  }

  const call = payload.call && typeof payload.call === "object" && !Array.isArray(payload.call)
    ? (payload.call as Record<string, unknown>)
    : null;

  if (!call) {
    return NextResponse.json({ error: "Missing call object in payload" }, { status: 400 });
  }

  const callId = typeof call.call_id === "string" ? call.call_id.trim() : "";
  const agentId = typeof call.agent_id === "string" ? call.agent_id.trim() : "";

  if (!callId || !agentId) {
    return NextResponse.json({ error: "Missing call_id or agent_id" }, { status: 400 });
  }

  const orgMatch = await findVoiceAgentOrgByRetellAgentId(agentId);
  if (!orgMatch) {
    console.warn(`[retell-webhook] Call ${callId} has untracked agent_id: ${agentId}`);
    // Return 200 so Retell doesn't keep retrying requests for deleted/unknown agents
    return NextResponse.json({ success: false, reason: "Agent not found in database" }, { status: 200 });
  }

  // Parse duration
  const durationMs = typeof call.duration_ms === "number" ? call.duration_ms : 0;
  const durationSeconds = Math.round(durationMs / 1000);

  // Parse cost safely
  let costVal = 0;
  if (typeof call.combined_cost === "number") {
    costVal = call.combined_cost;
  } else if (typeof call.combinedCost === "number") {
    costVal = call.combinedCost;
  } else {
    const callCost = call.call_cost && typeof call.call_cost === "object" && !Array.isArray(call.call_cost)
      ? (call.call_cost as Record<string, unknown>)
      : null;
    if (callCost) {
      if (typeof callCost.combined_cost === "number") {
        costVal = callCost.combined_cost;
      } else if (typeof callCost.combinedCost === "number") {
        costVal = callCost.combinedCost;
      }
    }
  }

  // Parse analysis details
  const analysis = call.call_analysis && typeof call.call_analysis === "object" && !Array.isArray(call.call_analysis)
    ? (call.call_analysis as Record<string, unknown>)
    : null;

  const summary = analysis && typeof analysis.call_summary === "string" ? analysis.call_summary : "";
  const sentiment = analysis && typeof analysis.user_sentiment === "string" ? analysis.user_sentiment : "neutral";

  // Parse transcript
  const transcript = call.transcript_object || [];

  // Upsert the call log
  await prisma.retellCall.upsert({
    where: { callId },
    create: {
      callId,
      organizationId: orgMatch.organizationId,
      agentId,
      callStatus: typeof call.call_status === "string" ? call.call_status : "completed",
      direction: typeof call.direction === "string" ? call.direction : "inbound",
      fromNumber: typeof call.from_number === "string" ? call.from_number : null,
      toNumber: typeof call.to_number === "string" ? call.to_number : null,
      durationSeconds,
      cost: costVal,
      recordingUrl: typeof call.recording_url === "string" ? call.recording_url : null,
      summary,
      sentiment,
      transcript: transcript as any,
    },
    update: {
      callStatus: typeof call.call_status === "string" ? call.call_status : "completed",
      durationSeconds,
      cost: costVal,
      recordingUrl: typeof call.recording_url === "string" ? call.recording_url : null,
      summary,
      sentiment,
      transcript: transcript as any,
    },
  });

  return NextResponse.json({ success: true, callId }, { status: 200 });
}

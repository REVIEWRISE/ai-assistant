import {
  executeVoiceRetellAvailabilityCheck,
  executeVoiceRetellBooking,
  parseVoiceRetellAvailabilityArgs,
  parseVoiceRetellBookingArgs,
  VOICE_RETELL_BOOK_APPOINTMENT_PARAMETERS,
  VOICE_RETELL_CHECK_AVAILABILITY_PARAMETERS,
} from "@/lib/voice-retell-booking";
import type { VoiceAgentKnowledgeConfig } from "@/lib/retell-voice-agent";

export type OpenAiChatTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export function buildOpenAiVoiceBookingTools(
  knowledge: VoiceAgentKnowledgeConfig,
): OpenAiChatTool[] {
  if (!knowledge.enablePhoneBooking) return [];

  return [
    {
      type: "function",
      function: {
        name: "check_availability",
        description:
          "Check whether a requested appointment start time is available before confirming the booking with the caller.",
        parameters: structuredClone(VOICE_RETELL_CHECK_AVAILABILITY_PARAMETERS) as Record<string, unknown>,
      },
    },
    {
      type: "function",
      function: {
        name: "book_appointment",
        description:
          "Create a confirmed appointment after check_availability passes, all organization booking-flow questions are answered, and the caller confirms.",
        parameters: structuredClone(VOICE_RETELL_BOOK_APPOINTMENT_PARAMETERS) as Record<string, unknown>,
      },
    },
  ];
}

export async function executeOpenAiVoiceBookingTool(args: {
  toolName: string;
  rawArguments: string;
  organizationId: string;
  organizationName: string;
  callId: string;
}): Promise<string> {
  let parsedArgs: unknown;
  try {
    parsedArgs = JSON.parse(args.rawArguments || "{}");
  } catch {
    return "Invalid tool arguments JSON.";
  }

  if (args.toolName === "check_availability") {
    const availabilityArgs = parseVoiceRetellAvailabilityArgs(parsedArgs);
    if (!availabilityArgs) {
      return "Provide a valid start_time_iso to check availability.";
    }
    const result = await executeVoiceRetellAvailabilityCheck({
      organizationId: args.organizationId,
      availabilityArgs,
    });
    return result.message;
  }

  if (args.toolName === "book_appointment") {
    const bookingArgs = parseVoiceRetellBookingArgs(parsedArgs);
    if (!bookingArgs) {
      return "Missing booking details. Ask each organization booking-flow question, collect answers, then call book_appointment with booking_flow_answers.";
    }
    const result = await executeVoiceRetellBooking({
      organizationId: args.organizationId,
      organizationName: args.organizationName,
      bookingArgs,
      callId: args.callId || undefined,
    });
    return result.message;
  }

  return `Unknown tool: ${args.toolName}`;
}

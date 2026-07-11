export type RetellUtterance = {
  role: "agent" | "user" | "system";
  content: string;
};

export type RetellCustomLlmRequest =
  | { interaction_type: "ping_pong"; timestamp: number }
  | { interaction_type: "call_details"; call: Record<string, unknown> }
  | {
      interaction_type: "update_only";
      transcript: RetellUtterance[];
      turntaking?: "agent_turn" | "user_turn";
    }
  | {
      interaction_type: "response_required";
      transcript: RetellUtterance[];
      response_id: number;
    }
  | {
      interaction_type: "reminder_required";
      transcript: RetellUtterance[];
      response_id: number;
    };

export type RetellCustomLlmResponse =
  | {
      response_type: "config";
      config: { auto_reconnect: boolean; call_details: boolean };
    }
  | { response_type: "ping_pong"; timestamp: number }
  | {
      response_type: "tool_call_invocation";
      tool_call_id: string;
      name: string;
      arguments: string;
    }
  | { response_type: "tool_call_result"; tool_call_id: string; content: string }
  | {
      response_type: "response";
      response_id: number;
      content: string;
      content_complete: boolean;
      no_interruption_allowed?: boolean;
      end_call?: boolean;
      transfer_number?: string;
    };

export type CustomLlmFunctionCall = {
  id: string;
  funcName: string;
  arguments: Record<string, unknown>;
  result?: string;
};

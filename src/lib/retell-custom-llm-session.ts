import type { WebSocket } from "ws";
import { getOpenAiApiKey } from "@/lib/openai-chat-reply";
import {
  buildOpenAiVoiceBookingTools,
  executeOpenAiVoiceBookingTool,
} from "@/lib/retell-custom-llm-tools";
import type {
  CustomLlmFunctionCall,
  RetellCustomLlmRequest,
  RetellCustomLlmResponse,
  RetellUtterance,
} from "@/lib/retell-custom-llm-types";
import {
  buildVoiceAgentPromptPayload,
  VOICE_LLM_STYLE_GUARDRAILS,
} from "@/lib/retell-voice-llm-prompt";
import { findVoiceAgentOrgByRetellAgentId } from "@/lib/voice-retell-booking";
import type { RetellVoiceAgentConfig } from "@/lib/retell-voice-agent";

const DEFAULT_MODEL = "gpt-4o-mini";

type OpenAiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

type SessionContext = {
  organizationId: string;
  organizationName: string;
  callId: string;
  retell: RetellVoiceAgentConfig;
  systemPrompt: string;
  openingMessage: string;
  tools: ReturnType<typeof buildOpenAiVoiceBookingTools>;
};

function readRetellAgentId(call: Record<string, unknown>): string {
  const agentId = call.agent_id ?? call.agentId;
  return typeof agentId === "string" ? agentId.trim() : "";
}

function readCallId(call: Record<string, unknown>, fallback: string): string {
  const callId = call.call_id ?? call.callId;
  return typeof callId === "string" && callId.trim() ? callId.trim() : fallback;
}

function transcriptToOpenAiMessages(transcript: RetellUtterance[]): OpenAiMessage[] {
  return transcript.map((turn) => ({
    role: turn.role === "agent" ? "assistant" : turn.role === "user" ? "user" : "system",
    content: turn.content,
  }));
}

function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

function sendJson(ws: WebSocket, payload: RetellCustomLlmResponse): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export class RetellCustomLlmSession {
  private context: SessionContext | null = null;
  private initialized = false;

  constructor(
    private readonly ws: WebSocket,
    private readonly callIdFromPath: string,
  ) {}

  start(): void {
    sendJson(this.ws, {
      response_type: "config",
      config: { auto_reconnect: true, call_details: true },
    });

    this.ws.on("message", (data, isBinary) => {
      void this.handleMessage(data, isBinary);
    });
  }

  private async handleMessage(data: WebSocket.RawData, isBinary: boolean): Promise<void> {
    if (isBinary) {
      this.ws.close(1007, "Binary payloads are not supported.");
      return;
    }

    let request: RetellCustomLlmRequest;
    try {
      request = JSON.parse(data.toString()) as RetellCustomLlmRequest;
    } catch {
      return;
    }

    if (request.interaction_type === "ping_pong") {
      sendJson(this.ws, {
        response_type: "ping_pong",
        timestamp: request.timestamp,
      });
      return;
    }

    if (request.interaction_type === "call_details") {
      await this.handleCallDetails(request.call);
      return;
    }

    if (
      request.interaction_type === "response_required" ||
      request.interaction_type === "reminder_required"
    ) {
      if (!this.context) return;
      await this.draftResponse(request, this.context);
    }
  }

  private async handleCallDetails(call: Record<string, unknown>): Promise<void> {
    if (this.initialized) return;

    const agentId = readRetellAgentId(call);
    if (!agentId) {
      this.ws.close(1008, "Missing agent_id on call.");
      return;
    }

    const orgMatch = await findVoiceAgentOrgByRetellAgentId(agentId);
    if (!orgMatch) {
      this.ws.close(1008, "Unknown Retell agent.");
      return;
    }

    const promptResult = await buildVoiceAgentPromptPayload({
      basePrompt: orgMatch.retell.systemPrompt,
      knowledge: orgMatch.knowledge,
      organizationId: orgMatch.organizationId,
      includeRetellHttpTools: false,
    });

    if (!promptResult.ok) {
      this.ws.close(1011, promptResult.error);
      return;
    }

    const systemPrompt = `${promptResult.generalPrompt}\n\n${VOICE_LLM_STYLE_GUARDRAILS}`;
    const openingMessage = orgMatch.retell.openingMessage.trim();

    this.context = {
      organizationId: orgMatch.organizationId,
      organizationName: orgMatch.organizationName,
      callId: readCallId(call, this.callIdFromPath),
      retell: orgMatch.retell,
      systemPrompt,
      openingMessage,
      tools: buildOpenAiVoiceBookingTools(orgMatch.knowledge),
    };
    this.initialized = true;

    if (openingMessage) {
      sendJson(this.ws, {
        response_type: "response",
        response_id: 0,
        content: openingMessage,
        content_complete: true,
        end_call: false,
      });
    }
  }

  private buildOpenAiMessages(
    request: Extract<
      RetellCustomLlmRequest,
      { interaction_type: "response_required" | "reminder_required" }
    >,
    context: SessionContext,
    funcResult?: CustomLlmFunctionCall,
  ): OpenAiMessage[] {
    const messages: OpenAiMessage[] = [{ role: "system", content: context.systemPrompt }];
    messages.push(...transcriptToOpenAiMessages(request.transcript));

    if (funcResult) {
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: funcResult.id,
            type: "function",
            function: {
              name: funcResult.funcName,
              arguments: JSON.stringify(funcResult.arguments),
            },
          },
        ],
      });
      messages.push({
        role: "tool",
        tool_call_id: funcResult.id,
        content: funcResult.result || "",
      });
    }

    if (request.interaction_type === "reminder_required") {
      messages.push({
        role: "user",
        content: "(The caller has been silent. Briefly check in in one short sentence.)",
      });
    }

    return messages;
  }

  private async draftResponse(
    request: Extract<
      RetellCustomLlmRequest,
      { interaction_type: "response_required" | "reminder_required" }
    >,
    context: SessionContext,
    funcResult?: CustomLlmFunctionCall,
  ): Promise<void> {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
      sendJson(this.ws, {
        response_type: "response",
        response_id: request.response_id,
        content: "I'm having trouble connecting right now. Please try again later.",
        content_complete: true,
        end_call: false,
      });
      return;
    }

    const messages = this.buildOpenAiMessages(request, context, funcResult);
    const body: Record<string, unknown> = {
      model: getOpenAiModel(),
      messages,
      stream: true,
      temperature: 0.4,
      max_tokens: 300,
    };
    if (context.tools.length) {
      body.tools = context.tools;
    }

    let funcCall: CustomLlmFunctionCall | undefined;
    let funcArguments = "";

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        console.warn("[retell-custom-llm] OpenAI error:", res.status, errText.slice(0, 300));
        sendJson(this.ws, {
          response_type: "response",
          response_id: request.response_id,
          content: "Sorry, I hit a snag. Could you repeat that?",
          content_complete: true,
          end_call: false,
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          let event: {
            choices?: Array<{
              delta?: {
                content?: string;
                tool_calls?: Array<{
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
            }>;
          };

          try {
            event = JSON.parse(payload) as typeof event;
          } catch {
            continue;
          }

          const delta = event.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.tool_calls?.length) {
            const toolDelta = delta.tool_calls[0];
            if (toolDelta.id) {
              if (funcCall) break;
              funcCall = {
                id: toolDelta.id,
                funcName: toolDelta.function?.name || "",
                arguments: {},
              };
            } else {
              funcArguments += toolDelta.function?.arguments || "";
            }
          } else if (delta.content) {
            sendJson(this.ws, {
              response_type: "response",
              response_id: request.response_id,
              content: delta.content,
              content_complete: false,
              end_call: false,
            });
          }
        }
      }
    } catch (err) {
      console.warn("[retell-custom-llm] stream error:", err);
      sendJson(this.ws, {
        response_type: "response",
        response_id: request.response_id,
        content: "Sorry, something went wrong. Please try again.",
        content_complete: true,
        end_call: false,
      });
      return;
    }

    if (funcCall) {
      try {
        funcCall.arguments = JSON.parse(funcArguments || "{}") as Record<string, unknown>;
      } catch {
        funcCall.arguments = {};
      }

      sendJson(this.ws, {
        response_type: "tool_call_invocation",
        tool_call_id: funcCall.id,
        name: funcCall.funcName,
        arguments: funcArguments || JSON.stringify(funcCall.arguments),
      });

      funcCall.result = await executeOpenAiVoiceBookingTool({
        toolName: funcCall.funcName,
        rawArguments: funcArguments || JSON.stringify(funcCall.arguments),
        organizationId: context.organizationId,
        organizationName: context.organizationName,
        callId: context.callId,
      });

      sendJson(this.ws, {
        response_type: "tool_call_result",
        tool_call_id: funcCall.id,
        content: funcCall.result,
      });

      await this.draftResponse(request, context, funcCall);
      return;
    }

    sendJson(this.ws, {
      response_type: "response",
      response_id: request.response_id,
      content: "",
      content_complete: true,
      end_call: false,
    });
  }
}

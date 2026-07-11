import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { WebSocketServer } from "ws";
import { getRetellCustomLlmListenHost, getRetellCustomLlmListenPort } from "@/lib/retell-custom-llm-config";
import { RetellCustomLlmSession } from "@/lib/retell-custom-llm-session";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function readCallIdFromUrl(url: string | undefined): string {
  if (!url) return "";
  const match = url.match(/\/llm-websocket\/([^/?]+)/);
  return match?.[1]?.trim() || "";
}

loadEnvLocal();

const port = getRetellCustomLlmListenPort();
const host = getRetellCustomLlmListenHost();
const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Retell custom LLM WebSocket server");
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const pathname = request.url?.split("?")[0] ?? "";
  if (!pathname.startsWith("/llm-websocket/")) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    const callId = readCallIdFromUrl(request.url);
    const session = new RetellCustomLlmSession(ws, callId);
    session.start();
  });
});

server.listen(port, host, () => {
  console.log(`[retell-custom-llm] Listening on ws://${host === "0.0.0.0" ? "localhost" : host}:${port}/llm-websocket/:call_id`);
  console.log(
    `[retell-custom-llm] Set RETELL_CUSTOM_LLM_WS_URL to your public wss URL (e.g. wss://your-domain/llm-websocket)`,
  );
});

process.on("SIGINT", () => {
  wss.close();
  server.close(() => process.exit(0));
});

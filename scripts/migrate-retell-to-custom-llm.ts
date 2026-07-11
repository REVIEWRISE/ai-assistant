import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isRetellApiConfigured } from "@/lib/retell-api";
import {
  getRetellCustomLlmWebSocketUrl,
  isRetellCustomLlmEnabled,
} from "@/lib/retell-custom-llm-config";
import { migrateVoiceAgentToCustomLlm } from "@/lib/retell-voice-sync";
import {
  resolveRetellVoiceAgentConfig,
  resolveVoiceAgentKnowledgeConfig,
  resolveVoiceAgentPhoneConfig,
} from "@/lib/retell-voice-agent";
import { getOpenAiApiKey } from "@/lib/openai-chat-reply";

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

async function main(): Promise<void> {
  loadEnvLocal();

  if (!isRetellApiConfigured()) {
    console.error("RETELL_API_KEY is not set.");
    process.exit(1);
  }

  if (!getOpenAiApiKey()) {
    console.error("OPENAI_API_KEY is not set.");
    process.exit(1);
  }

  if (!isRetellCustomLlmEnabled()) {
    console.error("Set RETELL_USE_CUSTOM_LLM=true (or RETELL_CUSTOM_LLM_WS_URL) first.");
    process.exit(1);
  }

  const wsUrl = getRetellCustomLlmWebSocketUrl();
  if (!wsUrl) {
    console.error(
      "Could not resolve WebSocket URL. Set RETELL_CUSTOM_LLM_WS_URL or NEXT_PUBLIC_APP_URL with nginx proxying /llm-websocket.",
    );
    process.exit(1);
  }

  console.log(`[retell:migrate] Custom LLM URL: ${wsUrl}`);

  const rows = await prisma.organizationVoiceAgentSettings.findMany({
    select: {
      organizationId: true,
      retellConfig: true,
      phoneConfig: true,
      knowledgeConfig: true,
      organization: { select: { name: true } },
    },
  });

  const targets = rows
    .map((row) => ({
      organizationId: row.organizationId,
      organizationName: row.organization.name,
      retell: resolveRetellVoiceAgentConfig(row.retellConfig),
      phone: resolveVoiceAgentPhoneConfig(row.phoneConfig),
      knowledge: resolveVoiceAgentKnowledgeConfig(row.knowledgeConfig),
    }))
    .filter((row) => row.retell.retellAgentId.trim());

  if (!targets.length) {
    console.log("[retell:migrate] No organizations with a Retell agent ID found.");
    return;
  }

  let ok = 0;
  let failed = 0;

  for (const target of targets) {
    const oldId = target.retell.retellAgentId;
    const label = `${target.organizationName} (${oldId})`;
    console.log(`[retell:migrate] Migrating ${label}…`);

    const result = await migrateVoiceAgentToCustomLlm({
      organizationId: target.organizationId,
      retell: target.retell,
      knowledge: target.knowledge,
      phone: target.phone,
    });

    if (!result.ok) {
      failed += 1;
      console.error(`[retell:migrate] FAILED — ${label}: ${result.error}`);
      continue;
    }

    const newId = result.agentId;
    if (newId && newId !== oldId) {
      const updatedRetell = { ...target.retell, retellAgentId: newId };
      await prisma.organizationVoiceAgentSettings.update({
        where: { organizationId: target.organizationId },
        data: {
          retellConfig: updatedRetell as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
      console.log(`[retell:migrate] OK — ${label} → new agent ${newId}`);
    } else {
      console.log(`[retell:migrate] OK — ${label} (already custom LLM)`);
    }

    ok += 1;
  }

  console.log(`[retell:migrate] Done. ${ok} succeeded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error("[retell:migrate] Unexpected error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

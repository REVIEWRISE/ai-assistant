"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isRetellApiConfigured } from "@/lib/retell-api";
import {
  createVoiceAgentInRetell,
  fetchRetellVoiceAgentConfig,
  fetchRetellVoiceCatalog,
  linkVoiceAgentPhoneInRetell,
  syncVoiceAgentToRetell,
} from "@/lib/retell-voice-sync";
import {
  generateVoiceAgentOpeningMessage,
  generateVoiceAgentSystemPrompt,
  type VoiceAgentAiResult,
} from "@/lib/voice-agent-ai";
import {
  parseRetellVoiceAgentForm,
  parseVoiceAgentKnowledgeForm,
  parseVoiceAgentPhoneForm,
  resolveVoiceAgentSettings,
} from "@/lib/retell-voice-agent";

const VOICE_AGENT_ROUTE = "/voice-agent";

async function requireVoiceAgentOrgSession(organizationId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: {
      userId: true,
      activeOrganizationId: true,
    },
  });
  if (!session) redirect("/login");
  if (!session.activeOrganizationId || session.activeOrganizationId !== organizationId) {
    redirect(`${VOICE_AGENT_ROUTE}?error=organization_required`);
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.userId, organizationId },
    select: { id: true },
  });
  if (!membership) {
    redirect(`${VOICE_AGENT_ROUTE}?error=organization_required`);
  }

  return session;
}

function formEntries(formData: FormData): Record<string, unknown> {
  return Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, String(value)]));
}

async function loadVoiceAgentSettings(organizationId: string) {
  const voices = await fetchRetellVoiceCatalog();
  const row = await prisma.organizationVoiceAgentSettings.findUnique({
    where: { organizationId },
    select: {
      retellConfig: true,
      phoneConfig: true,
      knowledgeConfig: true,
    },
  });
  return {
    voices,
    settings: resolveVoiceAgentSettings(row, voices),
  };
}

function redirectRetellSyncFailure(tab: string, error: string) {
  const params = new URLSearchParams({
    error: "retell_sync_failed",
    tab,
    detail: error.slice(0, 300),
  });
  redirect(`${VOICE_AGENT_ROUTE}?${params.toString()}`);
}

export async function saveRetellVoiceAgentSettings(formData: FormData) {
  const organizationId = String(formData.get("organization_id") || "").trim();
  if (!organizationId) redirect(`${VOICE_AGENT_ROUTE}?error=organization_required`);

  await requireVoiceAgentOrgSession(organizationId);

  const { settings: stored, voices } = await loadVoiceAgentSettings(organizationId);
  if (!stored.phone.twilioPhoneNumber.trim()) {
    redirect(`${VOICE_AGENT_ROUTE}?tab=phone&error=phone_required_for_agent`);
  }
  const phone = stored.phone;
  const knowledgeConfig = parseVoiceAgentKnowledgeForm(formEntries(formData));
  let retellConfig = parseRetellVoiceAgentForm(formEntries(formData), voices);

  if (isRetellApiConfigured() && !retellConfig.retellAgentId.trim()) {
    const created = await createVoiceAgentInRetell({
      organizationId,
      retell: retellConfig,
      knowledge: knowledgeConfig,
      phone,
    });
    if (!created.ok) {
      redirectRetellSyncFailure("agent", created.error);
      return;
    }
    retellConfig = { ...retellConfig, retellAgentId: created.agentId };

    await prisma.organizationVoiceAgentSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        retellConfig: retellConfig as unknown as Prisma.InputJsonValue,
        knowledgeConfig: knowledgeConfig as unknown as Prisma.InputJsonValue,
      },
      update: {
        retellConfig: retellConfig as unknown as Prisma.InputJsonValue,
        knowledgeConfig: knowledgeConfig as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    revalidatePath(VOICE_AGENT_ROUTE);
    redirect(`${VOICE_AGENT_ROUTE}?success=retell_created`);
  }

  await prisma.organizationVoiceAgentSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      retellConfig: retellConfig as unknown as Prisma.InputJsonValue,
      knowledgeConfig: knowledgeConfig as unknown as Prisma.InputJsonValue,
    },
    update: {
      retellConfig: retellConfig as unknown as Prisma.InputJsonValue,
      knowledgeConfig: knowledgeConfig as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  if (isRetellApiConfigured() && retellConfig.retellAgentId.trim()) {
    const sync = await syncVoiceAgentToRetell({
      organizationId,
      retell: retellConfig,
      knowledge: knowledgeConfig,
      phone,
    });
    if (!sync.ok) redirectRetellSyncFailure("agent", sync.error);
    if (sync.ok && sync.agentId && sync.agentId !== retellConfig.retellAgentId) {
      retellConfig = { ...retellConfig, retellAgentId: sync.agentId };
      await prisma.organizationVoiceAgentSettings.update({
        where: { organizationId },
        data: {
          retellConfig: retellConfig as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    }
    revalidatePath(VOICE_AGENT_ROUTE);
    redirect(`${VOICE_AGENT_ROUTE}?success=retell_saved_synced`);
  }

  revalidatePath(VOICE_AGENT_ROUTE);
  redirect(`${VOICE_AGENT_ROUTE}?success=retell_saved`);
}

export async function saveVoiceAgentPhoneSettings(formData: FormData) {
  const organizationId = String(formData.get("organization_id") || "").trim();
  if (!organizationId) redirect(`${VOICE_AGENT_ROUTE}?error=organization_required`);

  await requireVoiceAgentOrgSession(organizationId);

  const phoneConfig = parseVoiceAgentPhoneForm(formEntries(formData));
  const { settings: stored } = await loadVoiceAgentSettings(organizationId);

  await prisma.organizationVoiceAgentSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      phoneConfig: phoneConfig as unknown as Prisma.InputJsonValue,
    },
    update: {
      phoneConfig: phoneConfig as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  if (
    isRetellApiConfigured() &&
    stored.retell.retellAgentId.trim() &&
    phoneConfig.twilioPhoneNumber.trim()
  ) {
    const link = await linkVoiceAgentPhoneInRetell({
      agentId: stored.retell.retellAgentId,
      phoneNumber: phoneConfig.twilioPhoneNumber,
    });
    if (!link.ok) redirectRetellSyncFailure("phone", link.error);
    revalidatePath(VOICE_AGENT_ROUTE);
    redirect(`${VOICE_AGENT_ROUTE}?tab=phone&success=phone_saved_synced`);
  }

  revalidatePath(VOICE_AGENT_ROUTE);
  redirect(`${VOICE_AGENT_ROUTE}?tab=phone&success=phone_saved`);
}

export async function pullRetellVoiceAgentSettings(formData: FormData) {
  const organizationId = String(formData.get("organization_id") || "").trim();
  const agentId = String(formData.get("retell_agent_id") || "").trim();
  if (!organizationId) redirect(`${VOICE_AGENT_ROUTE}?error=organization_required`);

  await requireVoiceAgentOrgSession(organizationId);

  const { settings: stored } = await loadVoiceAgentSettings(organizationId);
  const local = stored.retell;
  const imported = await fetchRetellVoiceAgentConfig({
    ...local,
    retellAgentId: agentId || local.retellAgentId,
  });
  if (!imported.ok) {
    redirectRetellSyncFailure("agent", imported.error);
    return;
  }

  const importedConfig = imported.config;

  await prisma.organizationVoiceAgentSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      retellConfig: importedConfig as unknown as Prisma.InputJsonValue,
    },
    update: {
      retellConfig: importedConfig as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  redirect(`${VOICE_AGENT_ROUTE}?tab=agent&success=retell_imported`);
}

export async function generateVoiceAgentOpeningMessageAction(
  formData: FormData,
): Promise<VoiceAgentAiResult> {
  const organizationId = String(formData.get("organization_id") || "").trim();
  if (!organizationId) return { ok: false, error: "failed" };

  await requireVoiceAgentOrgSession(organizationId);

  const org = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { name: true },
  });

  return generateVoiceAgentOpeningMessage({
    organizationId,
    organizationName: org?.name ?? "",
    agentName: String(formData.get("agent_name") || "").trim(),
  });
}

export async function generateVoiceAgentSystemPromptAction(
  formData: FormData,
): Promise<VoiceAgentAiResult> {
  const organizationId = String(formData.get("organization_id") || "").trim();
  if (!organizationId) return { ok: false, error: "failed" };

  await requireVoiceAgentOrgSession(organizationId);

  const org = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { name: true },
  });

  return generateVoiceAgentSystemPrompt({
    organizationId,
    organizationName: org?.name ?? "",
    agentName: String(formData.get("agent_name") || "").trim(),
  });
}

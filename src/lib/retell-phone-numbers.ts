import { prisma } from "@/lib/prisma";
import {
  createRetellPhoneNumber,
  getRetellPhoneNumber,
  readRetellInboundAgentIds,
  readRetellPhoneNumberField,
  updateRetellPhoneNumber,
  type RetellPhoneNumberRecord,
} from "@/lib/retell-api";
import { linkVoiceAgentPhoneInRetell } from "@/lib/retell-voice-sync";

export type OrgRetellPhoneNumber = {
  id: string;
  phoneNumber: string;
  phoneNumberPretty: string | null;
  nickname: string | null;
  retellAgentId: string | null;
  phoneNumberType: string | null;
  areaCode: number | null;
  isPrimary: boolean;
  createdAt: string;
};

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function mapDbPhone(row: {
  id: string;
  phoneNumber: string;
  phoneNumberPretty: string | null;
  nickname: string | null;
  retellAgentId: string | null;
  phoneNumberType: string | null;
  areaCode: number | null;
  isPrimary: boolean;
  createdAt: Date;
}): OrgRetellPhoneNumber {
  return {
    id: row.id,
    phoneNumber: row.phoneNumber,
    phoneNumberPretty: row.phoneNumberPretty,
    nickname: row.nickname,
    retellAgentId: row.retellAgentId,
    phoneNumberType: row.phoneNumberType,
    areaCode: row.areaCode,
    isPrimary: row.isPrimary,
    createdAt: row.createdAt.toISOString(),
  };
}

async function syncPrimaryPhoneConfig(organizationId: string, phoneNumber: string): Promise<void> {
  const normalized = phoneNumber.trim();
  if (!normalized) return;

  const row = await prisma.organizationVoiceAgentSettings.findUnique({
    where: { organizationId },
    select: { phoneConfig: true },
  });

  const existing =
    row?.phoneConfig && typeof row.phoneConfig === "object" && !Array.isArray(row.phoneConfig)
      ? (row.phoneConfig as Record<string, unknown>)
      : {};

  await prisma.organizationVoiceAgentSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      phoneConfig: { ...existing, twilioPhoneNumber: normalized },
    },
    update: {
      phoneConfig: { ...existing, twilioPhoneNumber: normalized },
      updatedAt: new Date(),
    },
  });
}

async function upsertPhoneFromRetellRecord(args: {
  organizationId: string;
  record: RetellPhoneNumberRecord;
  retellAgentId?: string;
  isPrimary?: boolean;
  areaCode?: number | null;
}): Promise<OrgRetellPhoneNumber> {
  const phoneNumber = readRetellPhoneNumberField(args.record);
  if (!phoneNumber) {
    throw new Error("Retell did not return a phone number.");
  }

  const inboundAgentIds = readRetellInboundAgentIds(args.record);
  const agentId = args.retellAgentId?.trim() || inboundAgentIds[0] || null;
  const pretty =
    readString(args.record.phone_number_pretty) || readString(args.record.phoneNumberPretty) || null;
  const nickname = readString(args.record.nickname) || null;
  const phoneNumberType =
    readString(args.record.phone_number_type) || readString(args.record.phoneNumberType) || null;

  const row = await prisma.retellPhoneNumber.upsert({
    where: {
      organizationId_phoneNumber: {
        organizationId: args.organizationId,
        phoneNumber,
      },
    },
    create: {
      organizationId: args.organizationId,
      phoneNumber,
      phoneNumberPretty: pretty,
      nickname,
      retellAgentId: agentId,
      phoneNumberType,
      areaCode: args.areaCode ?? null,
      isPrimary: args.isPrimary ?? false,
    },
    update: {
      phoneNumberPretty: pretty,
      nickname: nickname || undefined,
      retellAgentId: agentId,
      phoneNumberType: phoneNumberType || undefined,
      areaCode: args.areaCode ?? undefined,
      updatedAt: new Date(),
    },
  });

  return mapDbPhone(row);
}

export async function ensureLegacyPrimaryPhoneImported(args: {
  organizationId: string;
  legacyPhoneNumber: string;
  retellAgentId: string;
}): Promise<void> {
  const phoneNumber = args.legacyPhoneNumber.trim();
  if (!phoneNumber) return;

  const existing = await prisma.retellPhoneNumber.findFirst({
    where: { organizationId: args.organizationId },
  });
  if (existing) return;

  const verify = await getRetellPhoneNumber(phoneNumber);
  if (!verify.ok) return;

  await upsertPhoneFromRetellRecord({
    organizationId: args.organizationId,
    record: verify.data,
    retellAgentId: args.retellAgentId.trim() || undefined,
    isPrimary: true,
  });
}

export async function listOrgRetellPhoneNumbers(organizationId: string): Promise<OrgRetellPhoneNumber[]> {
  const rows = await prisma.retellPhoneNumber.findMany({
    where: { organizationId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(mapDbPhone);
}

export async function buyOrgRetellPhoneNumber(args: {
  organizationId: string;
  retellAgentId: string;
  areaCode?: number;
  nickname?: string;
  makePrimary?: boolean;
}): Promise<{ ok: true; phone: OrgRetellPhoneNumber } | { ok: false; error: string }> {
  const agentId = args.retellAgentId.trim();
  if (!agentId) {
    return { ok: false, error: "Create or save a voice agent before buying a phone number." };
  }

  const body: Record<string, unknown> = {
    inbound_agents: [{ agent_id: agentId, agent_version: "latest", weight: 1 }],
  };

  if (args.areaCode != null && Number.isFinite(args.areaCode)) {
    body.area_code = Math.floor(args.areaCode);
  }
  if (args.nickname?.trim()) {
    body.nickname = args.nickname.trim().slice(0, 80);
  }

  const created = await createRetellPhoneNumber(body);
  if (!created.ok) {
    return { ok: false, error: created.error };
  }

  const makePrimary = args.makePrimary !== false;
  if (makePrimary) {
    await prisma.retellPhoneNumber.updateMany({
      where: { organizationId: args.organizationId, isPrimary: true },
      data: { isPrimary: false, updatedAt: new Date() },
    });
  }

  const phone = await upsertPhoneFromRetellRecord({
    organizationId: args.organizationId,
    record: created.data,
    retellAgentId: agentId,
    isPrimary: makePrimary,
    areaCode: args.areaCode ?? null,
  });

  if (makePrimary) {
    await syncPrimaryPhoneConfig(args.organizationId, phone.phoneNumber);
  }

  return { ok: true, phone };
}

export async function linkOrgRetellPhoneNumber(args: {
  organizationId: string;
  phoneNumber: string;
  retellAgentId: string;
  nickname?: string;
  makePrimary?: boolean;
}): Promise<{ ok: true; phone: OrgRetellPhoneNumber } | { ok: false; error: string }> {
  const phoneNumber = args.phoneNumber.trim();
  const agentId = args.retellAgentId.trim();
  if (!phoneNumber) return { ok: false, error: "Phone number is required." };
  if (!agentId) return { ok: false, error: "Voice agent ID is required to link a phone number." };

  const verify = await getRetellPhoneNumber(phoneNumber);
  if (!verify.ok) {
    return {
      ok: false,
      error: verify.error || "Phone number not found. Buy a new number here or link one already on your account.",
    };
  }

  const link = await linkVoiceAgentPhoneInRetell({ agentId, phoneNumber });
  if (!link.ok) return { ok: false, error: link.error };

  const makePrimary = args.makePrimary !== false;
  if (makePrimary) {
    await prisma.retellPhoneNumber.updateMany({
      where: { organizationId: args.organizationId, isPrimary: true },
      data: { isPrimary: false, updatedAt: new Date() },
    });
  }

  const phone = await upsertPhoneFromRetellRecord({
    organizationId: args.organizationId,
    record: verify.data,
    retellAgentId: agentId,
    isPrimary: makePrimary,
  });

  if (args.nickname?.trim()) {
    await updateRetellPhoneNumber(phoneNumber, { nickname: args.nickname.trim().slice(0, 80) });
    await prisma.retellPhoneNumber.update({
      where: { id: phone.id },
      data: { nickname: args.nickname.trim().slice(0, 80), updatedAt: new Date() },
    });
    phone.nickname = args.nickname.trim().slice(0, 80);
  }

  if (makePrimary) {
    await syncPrimaryPhoneConfig(args.organizationId, phone.phoneNumber);
  }

  return { ok: true, phone };
}

export async function assignOrgRetellPhoneAgent(args: {
  organizationId: string;
  phoneNumber: string;
  retellAgentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const phoneNumber = args.phoneNumber.trim();
  const agentId = args.retellAgentId.trim();
  if (!phoneNumber || !agentId) {
    return { ok: false, error: "Phone number and agent ID are required." };
  }

  const row = await prisma.retellPhoneNumber.findFirst({
    where: { organizationId: args.organizationId, phoneNumber },
  });
  if (!row) return { ok: false, error: "Phone number not found for this organization." };

  const link = await linkVoiceAgentPhoneInRetell({ agentId, phoneNumber });
  if (!link.ok) return { ok: false, error: link.error };

  await prisma.retellPhoneNumber.update({
    where: { id: row.id },
    data: { retellAgentId: agentId, updatedAt: new Date() },
  });

  if (row.isPrimary) {
    await syncPrimaryPhoneConfig(args.organizationId, phoneNumber);
  }

  return { ok: true };
}

export async function setOrgPrimaryRetellPhoneNumber(args: {
  organizationId: string;
  phoneNumber: string;
  retellAgentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const phoneNumber = args.phoneNumber.trim();
  const row = await prisma.retellPhoneNumber.findFirst({
    where: { organizationId: args.organizationId, phoneNumber },
  });
  if (!row) return { ok: false, error: "Phone number not found for this organization." };

  await prisma.retellPhoneNumber.updateMany({
    where: { organizationId: args.organizationId, isPrimary: true },
    data: { isPrimary: false, updatedAt: new Date() },
  });

  await prisma.retellPhoneNumber.update({
    where: { id: row.id },
    data: { isPrimary: true, updatedAt: new Date() },
  });

  const agentId = args.retellAgentId.trim() || row.retellAgentId?.trim() || "";
  if (agentId) {
    const link = await linkVoiceAgentPhoneInRetell({ agentId, phoneNumber });
    if (!link.ok) return { ok: false, error: link.error };
  }

  await syncPrimaryPhoneConfig(args.organizationId, phoneNumber);
  return { ok: true };
}

export async function refreshOrgRetellPhoneNumbersFromRetell(
  organizationId: string,
  retellAgentId: string,
): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  const agentId = retellAgentId.trim();
  if (!agentId) return { ok: false, error: "Voice agent ID is required to refresh phone numbers." };

  const { listRetellPhoneNumbers } = await import("@/lib/retell-api");
  const list = await listRetellPhoneNumbers();
  if (!list.ok) return { ok: false, error: list.error };

  let imported = 0;
  for (const item of list.data) {
    if (!item.inboundAgentIds.includes(agentId)) continue;
    const detail = await getRetellPhoneNumber(item.phoneNumber);
    if (!detail.ok) continue;

    const isPrimary = imported === 0;
    if (isPrimary) {
      await prisma.retellPhoneNumber.updateMany({
        where: { organizationId, isPrimary: true },
        data: { isPrimary: false, updatedAt: new Date() },
      });
    }

    await upsertPhoneFromRetellRecord({
      organizationId,
      record: detail.data,
      retellAgentId: agentId,
      isPrimary,
    });
    imported += 1;
  }

  if (imported > 0) {
    const primary = await prisma.retellPhoneNumber.findFirst({
      where: { organizationId, isPrimary: true },
      select: { phoneNumber: true },
    });
    if (primary) {
      await syncPrimaryPhoneConfig(organizationId, primary.phoneNumber);
    }
  }

  return { ok: true, imported };
}

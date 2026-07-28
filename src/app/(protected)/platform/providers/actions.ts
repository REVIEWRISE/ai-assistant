"use server";

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth-session";

async function saveProviderLogo(file: File, providerId?: string) {
  if (!file || file.size === 0) {
    return null;
  }

  const ext = path.extname(file.name || "").toLowerCase() || ".png";
  const safeExt = [".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)
    ? ext
    : ".png";
  const filename = `${providerId ?? crypto.randomUUID()}-${Date.now()}${safeExt}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "providers");
  const filePath = path.join(uploadDir, filename);

  await fs.mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return `/uploads/providers/${filename}`;
}

function parseProviderConfig(configRaw: string): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (!configRaw) {
    return {};
  }

  const parsed = JSON.parse(configRaw) as Prisma.InputJsonValue | null;
  return parsed === null ? Prisma.JsonNull : parsed;
}

export async function createProvider(formData: FormData) {
  await requireAdminSession();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const apiUrl = String(formData.get("api_url") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const configRaw = String(formData.get("config_json") || "").trim();
  const logoFile = formData.get("logo");

  if (!name) {
    redirect("/platform/providers?error=missing");
  }

  let config: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput = {};
  try {
    config = parseProviderConfig(configRaw);
  } catch {
    redirect("/platform/providers?error=invalid_json");
  }

  try {
    const provider = await prisma.provider.create({
      data: {
        name,
        type: type || "review",
        apiUrl: apiUrl || null,
        status: status || "enabled",
        config,
        description: description || null,
      },
    });

    if (logoFile instanceof File && logoFile.size > 0) {
      const logoUrl = await saveProviderLogo(logoFile, provider.id);
      if (logoUrl) {
        await prisma.provider.update({
          where: { id: provider.id },
          data: { logoUrl },
        });
      }
    }
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        redirect("/platform/providers?error=exists");
      }
    }
    redirect("/platform/providers?error=unknown");
  }

  redirect("/platform/providers?success=created");
}

export async function updateProvider(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const apiUrl = String(formData.get("api_url") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const configRaw = String(formData.get("config_json") || "").trim();
  const logoFile = formData.get("logo");

  if (!id || !name) {
    redirect("/platform/providers?error=missing");
  }

  let config: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput = {};
  try {
    config = parseProviderConfig(configRaw);
  } catch {
    redirect("/platform/providers?error=invalid_json");
  }

  try {
    const data: Prisma.ProviderUpdateInput = {
      name,
      type: type || "review",
      apiUrl: apiUrl || null,
      status: status || "enabled",
      config,
      description: description || null,
      updatedAt: new Date(),
    };

    if (logoFile instanceof File && logoFile.size > 0) {
      const logoUrl = await saveProviderLogo(logoFile, id);
      if (logoUrl) {
        data.logoUrl = logoUrl;
      }
    }

    await prisma.provider.update({
      where: { id },
      data: {
        ...data,
      },
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        redirect("/platform/providers?error=exists");
      }
    }
    redirect("/platform/providers?error=unknown");
  }

  redirect("/platform/providers?success=updated");
}

export async function deleteProvider(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/platform/providers?error=missing");
  }

  try {
    await prisma.provider.delete({ where: { id } });
  } catch {
    redirect("/platform/providers?error=delete_failed");
  }

  redirect("/platform/providers?success=deleted");
}

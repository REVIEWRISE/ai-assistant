import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

export async function saveOrganizationLogo(
  file: File,
  organizationId?: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const ext = path.extname(file.name || "").toLowerCase() || ".png";
  const safeExt = ALLOWED_EXT.has(ext) ? ext : ".png";
  const filename = `${organizationId ?? crypto.randomUUID()}-${Date.now()}${safeExt}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "organizations");
  const filePath = path.join(uploadDir, filename);

  await fs.mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return `/uploads/organizations/${filename}`;
}

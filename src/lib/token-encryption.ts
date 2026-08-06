/**
 * AES-256-GCM envelope encryption for OAuth token_data stored in the DB.
 *
 * Setup:
 *   1. Generate a 32-byte key:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *   2. Add to .env.production:  TOKEN_ENCRYPTION_KEY=<hex-string>
 *
 * The encrypted envelope is a JSON object:
 *   { v: 1, iv: "<hex>", tag: "<hex>", data: "<hex>" }
 *
 * In development/test, if TOKEN_ENCRYPTION_KEY is not set the module falls back to
 * storing tokens in plaintext (keeps local setup friction-free). In production the
 * key is required — assertTokenEncryptionConfigured() (called from instrumentation.ts)
 * throws at startup if it's missing or malformed, so the app fails closed rather than
 * silently persisting OAuth tokens unencrypted.
 *
 * SOC 2 CC6.1 — Protection of sensitive credentials at rest.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { createLogger } from "@/lib/logger";

const log = createLogger("token-encryption");

const ALGORITHM = "aes-256-gcm";
const ENVELOPE_VERSION = 1;

type EncryptedEnvelope = {
  v: number;
  iv: string;
  tag: string;
  data: string;
};

function getKey(): Buffer | null {
  const isProd = process.env.NODE_ENV === "production";
  const hex = process.env.TOKEN_ENCRYPTION_KEY?.trim();

  if (!hex) {
    if (isProd) {
      throw new Error(
        "[token-encryption] TOKEN_ENCRYPTION_KEY is not set. Refusing to start in production " +
          "to avoid storing OAuth tokens unencrypted at rest (SOC 2 CC6.1).",
      );
    }
    return null;
  }

  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    const message = "TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars).";
    if (isProd) {
      throw new Error(`[token-encryption] ${message} Refusing to start in production.`);
    }
    log.error(`${message} Token encryption is DISABLED.`);
    return null;
  }
  return buf;
}

/**
 * Validate the token-encryption key at process startup (called from instrumentation.ts).
 * Throws in production if TOKEN_ENCRYPTION_KEY is missing or malformed — fail closed
 * rather than silently persisting OAuth tokens unencrypted (SOC 2 CC6.1).
 */
export function assertTokenEncryptionConfigured(): void {
  getKey();
}

/**
 * Encrypt a token data object before persisting to the database.
 * Returns the original value unchanged if TOKEN_ENCRYPTION_KEY is not set.
 */
export function encryptTokenData(tokenData: Record<string, unknown>): Record<string, unknown> {
  // In production, getKey() throws rather than returning null — see assertTokenEncryptionConfigured().
  const key = getKey();
  if (!key) return tokenData;

  const plaintext = JSON.stringify(tokenData);
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const envelope: EncryptedEnvelope = {
    v: ENVELOPE_VERSION,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted.toString("hex"),
  };

  // Store envelope as a wrapper object so Prisma can still persist it as JSONB
  return { __enc: envelope };
}

/**
 * Decrypt token data read from the database.
 * Handles both encrypted envelopes and legacy plaintext values transparently.
 */
export function decryptTokenData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const obj = raw as Record<string, unknown>;

  // Not an encrypted envelope — return as-is (legacy plaintext)
  if (!("__enc" in obj)) return obj;

  const key = getKey();
  if (!key) {
    log.error("Encrypted token found in DB but TOKEN_ENCRYPTION_KEY is not set — cannot decrypt, returning empty token.");
    return {};
  }

  const env = obj.__enc as EncryptedEnvelope;
  if (!env?.iv || !env?.tag || !env?.data) {
    log.error("Malformed encrypted envelope.");
    return {};
  }

  try {
    const iv = Buffer.from(env.iv, "hex");
    const tag = Buffer.from(env.tag, "hex");
    const encryptedData = Buffer.from(env.data, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    return JSON.parse(decrypted.toString("utf8")) as Record<string, unknown>;
  } catch (err) {
    log.error("Decryption failed", { error: err instanceof Error ? err.message : String(err) });
    return {};
  }
}

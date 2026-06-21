import crypto from "crypto";

const SIGNATURE_PATTERN = /^v=(\d+),d=(.+)$/;

/** Retell custom tool / webhook signature (HMAC-SHA256 of rawBody + timestamp). */
export function verifyRetellWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  apiKey: string,
): boolean {
  const trimmed = signatureHeader.trim();
  const match = SIGNATURE_PATTERN.exec(trimmed);
  if (!match) return false;

  const timestamp = match[1];
  const expectedDigest = match[2].trim();
  const tsMs = Number(timestamp);
  if (!Number.isFinite(tsMs)) return false;

  const ageMs = Math.abs(Date.now() - tsMs);
  if (ageMs > 5 * 60 * 1000) return false;

  const computed = crypto
    .createHmac("sha256", apiKey)
    .update(`${rawBody}${timestamp}`)
    .digest("hex");

  const computedBuf = Buffer.from(computed, "utf8");
  const expectedBuf = Buffer.from(expectedDigest, "utf8");
  if (computedBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(computedBuf, expectedBuf);
}

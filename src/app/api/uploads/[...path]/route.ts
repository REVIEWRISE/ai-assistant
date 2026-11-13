import { promises as fs } from "fs";
import path from "path";

/**
 * Serves files uploaded at runtime (organization and provider logos).
 *
 * Next.js in production only serves `public/` files that existed when the server
 * started, so a logo uploaded afterwards would 404 until the next restart.
 * `/uploads/*` is rewritten here only when no static file matched (see the
 * fallback rewrite in next.config.ts), so stored URLs keep working unchanged.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// turbopackIgnore keeps the build from bundling the whole project for this runtime path.
const UPLOADS_ROOT = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

/** Resolves the request to a file inside the uploads folder, or null if it would escape it. */
function resolveUploadPath(segments: string[]): string | null {
  if (segments.length === 0) return null;
  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || /[\\/\0]/.test(segment)) return null;
  }
  const resolved = path.resolve(/*turbopackIgnore: true*/ UPLOADS_ROOT, ...segments);
  return resolved.startsWith(UPLOADS_ROOT + path.sep) ? resolved : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const filePath = resolveUploadPath(segments ?? []);
  if (!filePath) return notFound();

  const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()];
  if (!contentType) return notFound();

  let body: Buffer;
  try {
    const stat = await fs.stat(/*turbopackIgnore: true*/ filePath);
    if (!stat.isFile()) return notFound();
    body = await fs.readFile(/*turbopackIgnore: true*/ filePath);
  } catch {
    return notFound();
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Length": String(body.byteLength),
    // Every upload gets a new timestamped filename, so a URL's content never changes.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (contentType === "image/svg+xml") {
    // Uploaded SVGs are user content: render as an image only, never run scripts.
    headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }

  return new Response(new Uint8Array(body), { status: 200, headers });
}

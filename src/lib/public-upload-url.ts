/** Turn a stored public path (/uploads/...) into an absolute URL for email clients. */
export function toAbsolutePublicAssetUrl(relativePath: string | null | undefined): string | null {
  const path = String(relativePath ?? "").trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const base = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "").replace(/\/$/, "");
  if (!base) return null;

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

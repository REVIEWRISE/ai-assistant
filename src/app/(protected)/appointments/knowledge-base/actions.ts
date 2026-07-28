"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  KNOWLEDGE_APPEND_SECTION_MARKER,
  truncateKnowledgeRawTextForPrompt,
} from "@/lib/knowledge-base-raw-truncate";
import {
  KNOWLEDGE_CRAWL_MAX_COMBINED_CHARS,
  KNOWLEDGE_CRAWL_MAX_PAGES,
  KNOWLEDGE_LLM_FORMATTED_PREVIEW_MAX_CHARS,
  KNOWLEDGE_LLM_MAX_OUTPUT_TOKENS,
  KNOWLEDGE_LLM_PREVIEW_MAX_CHARS,
  KNOWLEDGE_LLM_PROMPT_SOURCE_MAX_CHARS,
  KNOWLEDGE_STORED_RAW_TEXT_MAX_CHARS,
} from "@/lib/knowledge-base-limits";
import { getOpenAiApiKey } from "@/lib/openai-chat-reply";
import { requireOrgFeature } from "@/lib/entitlements";

const KB_ROUTE = "/appointments/knowledge-base";

function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function stripHtml(input: string): string {
  const noScripts = input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  return collapseWhitespace(noScripts.replace(/<[^>]+>/g, " "));
}

function normalizeCrawlUrl(url: URL): string {
  const normalized = new URL(url.toString());
  normalized.hash = "";
  return normalized.toString();
}

function extractSameOriginLinks(html: string, currentUrl: URL, origin: string): string[] {
  const out: string[] = [];
  const hrefMatches = html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi);
  for (const match of hrefMatches) {
    const href = (match[1] || "").trim();
    if (!href) continue;
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    let next: URL;
    try {
      next = new URL(href, currentUrl);
    } catch {
      continue;
    }
    if (next.origin !== origin) continue;
    if (!/^https?:$/i.test(next.protocol)) continue;
    out.push(normalizeCrawlUrl(next));
  }
  return out;
}

async function crawlWebsite(seedUrl: URL): Promise<{
  combinedText: string;
  pageCount: number;
  primaryTitle: string;
}> {
  const maxPages = KNOWLEDGE_CRAWL_MAX_PAGES;
  const maxCombinedChars = KNOWLEDGE_CRAWL_MAX_COMBINED_CHARS;
  const origin = seedUrl.origin;
  const queue: string[] = [normalizeCrawlUrl(seedUrl)];
  const visited = new Set<string>();
  const textBlocks: string[] = [];
  let primaryTitle = "";

  while (queue.length > 0 && visited.size < maxPages) {
    const nextUrl = queue.shift()!;
    if (visited.has(nextUrl)) continue;
    visited.add(nextUrl);

    let html = "";
    try {
      const response = await fetch(nextUrl, {
        headers: { "User-Agent": "VyntRise-Agent-Knowledge-Importer/1.0" },
        cache: "no-store",
      });
      if (!response.ok) continue;
      html = await response.text();
    } catch {
      continue;
    }

    const current = new URL(nextUrl);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? collapseWhitespace(stripHtml(titleMatch[1])) : "";
    if (!primaryTitle && title) primaryTitle = title;

    const pageText = stripHtml(html);
    if (pageText) {
      const sectionHeader = title ? `${title} (${current.pathname || "/"})` : current.pathname || "/";
      textBlocks.push(`${sectionHeader}\n${pageText}`);
    }

    for (const discovered of extractSameOriginLinks(html, current, origin)) {
      if (!visited.has(discovered) && !queue.includes(discovered)) queue.push(discovered);
    }

    const combinedLength = textBlocks.reduce((sum, block) => sum + block.length, 0);
    if (combinedLength >= maxCombinedChars) break;
  }

  return {
    combinedText: textBlocks.join("\n\n").slice(0, maxCombinedChars),
    pageCount: visited.size,
    primaryTitle,
  };
}

function buildFormattedPreview(input: string): string {
  const sentences = collapseWhitespace(input)
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 120);

  const chunks: string[] = [];
  for (let index = 0; index < sentences.length; index += 3) {
    chunks.push(sentences.slice(index, index + 3).join(" "));
  }
  return chunks.join("\n\n");
}

function buildFallbackParsedData(
  rawText: string,
  sourceType: string,
  metadata?: Record<string, string>,
  aiError?: string,
) {
  const normalized = collapseWhitespace(rawText);
  const preview = normalized.slice(0, KNOWLEDGE_LLM_PREVIEW_MAX_CHARS);
  const lines = preview
    .split(/[.!?]\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  return {
    sourceType,
    preview,
    formattedPreview: buildFormattedPreview(rawText).slice(0, KNOWLEDGE_LLM_FORMATTED_PREVIEW_MAX_CHARS),
    highlights: lines,
    aiUsed: false,
    aiError: aiError ?? null,
    metadata: metadata ?? {},
  };
}

async function buildParsedData(rawText: string, sourceType: string, metadata?: Record<string, string>) {
  const fallback = buildFallbackParsedData(rawText, sourceType, metadata);
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return fallback;

  const prompt = `Transform this business knowledge into a concise, human-readable booking assistant draft.
Return strict JSON with this exact shape:
{
  "preview": string,
  "formattedPreview": string,
  "highlights": string[]
}

Rules:
- Use only facts present in the source text. The SOURCE may include "[… omitted portion of source …]" gaps between excerpts (beginning, middle, and end of the import); treat all excerpts as one business corpus and do not quote the gap markers as content.
- Keep "preview" under ${KNOWLEDGE_LLM_PREVIEW_MAX_CHARS} chars.
- Keep "formattedPreview" under ${KNOWLEDGE_LLM_FORMATTED_PREVIEW_MAX_CHARS} chars. Use clear sections and bullets, and cover the main factual topics from the excerpts (services, pricing, hours, policies, service areas, contact, etc.), not only a short marketing blurb.
- "highlights" should be 4-8 short, important points.
- No markdown code fences.
- Do not use markdown heading markers (#, ##, ###). Use plain section titles on their own line or short bold labels (**like this**) instead.

SOURCE:
${truncateKnowledgeRawTextForPrompt(rawText, KNOWLEDGE_LLM_PROMPT_SOURCE_MAX_CHARS)}`;

  try {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: KNOWLEDGE_LLM_MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a data formatter for business knowledge. Output valid JSON only and never invent facts.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return fallback;

    const parsed = JSON.parse(content) as {
      preview?: unknown;
      formattedPreview?: unknown;
      highlights?: unknown;
    };

    const preview = typeof parsed.preview === "string"
      ? collapseWhitespace(parsed.preview).slice(0, KNOWLEDGE_LLM_PREVIEW_MAX_CHARS)
      : "";
    const formattedPreview =
      typeof parsed.formattedPreview === "string"
        ? parsed.formattedPreview.trim().slice(0, KNOWLEDGE_LLM_FORMATTED_PREVIEW_MAX_CHARS)
        : buildFormattedPreview(rawText).slice(0, KNOWLEDGE_LLM_FORMATTED_PREVIEW_MAX_CHARS);
    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights
          .map((x) => collapseWhitespace(String(x)))
          .filter(Boolean)
          .slice(0, 8)
      : fallback.highlights;

    return {
      sourceType,
      preview: (preview || fallback.preview).slice(0, KNOWLEDGE_LLM_PREVIEW_MAX_CHARS),
      formattedPreview: (formattedPreview || fallback.formattedPreview).slice(
        0,
        KNOWLEDGE_LLM_FORMATTED_PREVIEW_MAX_CHARS,
      ),
      highlights: highlights.length > 0 ? highlights : fallback.highlights,
      aiUsed: true,
      aiError: null,
      metadata: metadata ?? {},
    };
  } catch {
    return fallback;
  }
}

async function requireActiveOrganization() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = (await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { activeOrganizationId: true },
  })) as { activeOrganizationId: string | null } | null;

  if (!session) redirect("/login");
  if (!session.activeOrganizationId) redirect(`${KB_ROUTE}?error=organization_required`);

  await requireOrgFeature(session.activeOrganizationId, "knowledge_base");

  return session.activeOrganizationId;
}

function requireTargetOrganization(formData: FormData, activeOrganizationId: string) {
  const targetOrganizationId = String(formData.get("organization_id") || "").trim();
  if (!targetOrganizationId) {
    redirect(`${KB_ROUTE}?error=organization_context_missing`);
  }
  if (targetOrganizationId !== activeOrganizationId) {
    redirect(`${KB_ROUTE}?error=organization_context_mismatch`);
  }
}

async function upsertKnowledgeBase(args: {
  organizationId: string;
  sourceType: "website" | "text" | "file";
  rawText: string;
  sourceUrl?: string | null;
  sourceFileName?: string | null;
  metadata?: Record<string, string>;
}) {
  const parsedData = await buildParsedData(args.rawText, args.sourceType, args.metadata);
  await prisma.organizationKnowledgeBase.upsert({
    where: { organizationId: args.organizationId },
    create: {
      organizationId: args.organizationId,
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl ?? null,
      sourceFileName: args.sourceFileName ?? null,
      status: "draft",
      rawText: args.rawText,
      parsedData,
      lastImportedAt: new Date(),
    },
    update: {
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl ?? null,
      sourceFileName: args.sourceFileName ?? null,
      status: "draft",
      rawText: args.rawText,
      parsedData,
      lastImportedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function importFromWebsite(formData: FormData) {
  const organizationId = await requireActiveOrganization();
  requireTargetOrganization(formData, organizationId);
  const websiteUrl = String(formData.get("website_url") || "").trim();
  if (!websiteUrl) redirect(`${KB_ROUTE}?error=kb_missing_url`);

  let url: URL;
  try {
    url = new URL(websiteUrl);
  } catch {
    redirect(`${KB_ROUTE}?error=kb_invalid_url`);
  }

  let crawlResult:
    | {
        combinedText: string;
        pageCount: number;
        primaryTitle: string;
      }
    | undefined;
  try {
    crawlResult = await crawlWebsite(url);
  } catch {
    redirect(`${KB_ROUTE}?error=kb_website_fetch`);
  }
  const title = crawlResult?.primaryTitle ?? "";
  const rawText = (crawlResult?.combinedText ?? "").slice(0, KNOWLEDGE_STORED_RAW_TEXT_MAX_CHARS);
  if (!rawText) redirect(`${KB_ROUTE}?error=kb_website_empty`);

  await upsertKnowledgeBase({
    organizationId,
    sourceType: "website",
    rawText,
    sourceUrl: url.toString(),
    metadata: {
      title,
      pageCount: String(crawlResult?.pageCount ?? 1),
      crawlOrigin: url.origin,
    },
  });

  redirect(`${KB_ROUTE}?success=kb_imported_website`);
}

export async function approveKnowledgeBase(formData: FormData) {
  const organizationId = await requireActiveOrganization();
  requireTargetOrganization(formData, organizationId);
  await prisma.organizationKnowledgeBase.update({
    where: { organizationId },
    data: { status: "approved", updatedAt: new Date() },
  }).catch(() => {
    redirect(`${KB_ROUTE}?error=kb_missing`);
  });

  redirect(`${KB_ROUTE}?success=kb_approved`);
}

export async function clearKnowledgeBase(formData: FormData) {
  const organizationId = await requireActiveOrganization();
  requireTargetOrganization(formData, organizationId);
  await prisma.organizationKnowledgeBase.delete({
    where: { organizationId },
  }).catch(() => {
    redirect(`${KB_ROUTE}?error=kb_missing`);
  });

  redirect(`${KB_ROUTE}?success=kb_cleared`);
}

export async function appendKnowledgeBaseNotes(formData: FormData) {
  const organizationId = await requireActiveOrganization();
  requireTargetOrganization(formData, organizationId);
  const supplement = String(formData.get("additional_notes") || "").trim();
  if (!supplement) redirect(`${KB_ROUTE}?error=kb_missing_supplement`);

  const existing = await prisma.organizationKnowledgeBase.findUnique({
    where: { organizationId },
  });
  if (!existing) redirect(`${KB_ROUTE}?error=kb_missing`);

  const base = String(existing.rawText ?? "").trim();
  const combined = (base ? `${base}${KNOWLEDGE_APPEND_SECTION_MARKER}${supplement}` : supplement).slice(
    0,
    KNOWLEDGE_STORED_RAW_TEXT_MAX_CHARS,
  );

  const prevParsed = existing.parsedData as Record<string, unknown> | null;
  const prevMeta =
    prevParsed &&
    typeof prevParsed.metadata === "object" &&
    prevParsed.metadata !== null &&
    !Array.isArray(prevParsed.metadata)
      ? { ...(prevParsed.metadata as Record<string, string>) }
      : {};

  const parsedData = await buildParsedData(combined, String(existing.sourceType || "text"), {
    ...prevMeta,
    lastSupplementedAt: new Date().toISOString(),
  });

  await prisma.organizationKnowledgeBase.update({
    where: { organizationId },
    data: {
      rawText: combined,
      parsedData,
      status: "draft",
      updatedAt: new Date(),
    },
  });

  redirect(`${KB_ROUTE}?success=kb_appended`);
}


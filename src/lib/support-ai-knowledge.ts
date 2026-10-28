import { promises as fs } from "fs";
import path from "path";

const MAX_CORPUS_CHARS = 16_000;

function supportDocsRoot(): string {
  return path.join(process.cwd(), "docs", "support");
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(full)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(full);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

/**
 * Loads all editable markdown files under docs/support as one knowledge corpus.
 * Missing folder or empty set returns an empty string (caller should still
 * ask the model to say it does not know / escalate to humans).
 */
export async function loadSupportAiKnowledge(): Promise<string> {
  const root = supportDocsRoot();
  let files: string[];
  try {
    files = await collectMarkdownFiles(root);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
    if (code === "ENOENT") {
      console.warn("[support-ai] docs/support not found at", root);
      return "";
    }
    throw err;
  }

  if (files.length === 0) {
    console.warn("[support-ai] no markdown files under", root);
    return "";
  }

  const sections: string[] = [];
  let used = 0;
  for (const file of files) {
    if (used >= MAX_CORPUS_CHARS) break;
    const relative = path.relative(root, file).replace(/\\/g, "/");
    let body: string;
    try {
      body = await fs.readFile(file, "utf8");
    } catch (err) {
      console.warn("[support-ai] failed to read", file, err);
      continue;
    }
    const trimmed = body.trim();
    if (!trimmed) continue;
    const header = `### ${relative}\n`;
    const remaining = MAX_CORPUS_CHARS - used - header.length;
    if (remaining <= 0) break;
    const slice = trimmed.length > remaining ? `${trimmed.slice(0, remaining)}\n...` : trimmed;
    sections.push(`${header}${slice}`);
    used += header.length + slice.length + 2;
  }

  return sections.join("\n\n");
}

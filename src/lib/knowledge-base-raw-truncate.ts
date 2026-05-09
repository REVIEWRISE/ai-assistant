/** Must match the separator used when merging manual notes in knowledge-base actions. */
export const KNOWLEDGE_APPEND_SECTION_MARKER = "\n\n--- Additional information ---\n\n";

/** Shown between excerpt windows so the model knows text was omitted (not real page content). */
const PROMPT_EXCERPT_GAP = "\n\n[… omitted portion of source …]\n\n";

/**
 * Samples up to `maxChars` from long text using head + middle + tail windows so later
 * pages (often in the middle of concatenated crawls) can inform summarization, not only
 * the opening and very end.
 */
function sampleHeadMiddleTail(text: string, maxChars: number): string {
  const gapLen = PROMPT_EXCERPT_GAP.length * 2;
  const body = maxChars - gapLen;
  if (body < 400) {
    const head = Math.floor(maxChars * 0.45);
    const tail = maxChars - head - 45;
    return `${text.slice(0, head)}\n...[truncated middle]...\n${text.slice(-tail)}`;
  }

  const h = Math.floor(body / 3);
  const m = Math.floor(body / 3);
  const t = body - h - m;
  const head = text.slice(0, h);
  const tail = text.slice(-t);
  const midStartBound = h;
  const midEndBound = text.length - t;
  const midRegionLen = midEndBound - midStartBound;

  let middle: string;
  if (midRegionLen <= 0) {
    return `${head}${PROMPT_EXCERPT_GAP}${tail}`;
  }
  if (midRegionLen <= m) {
    middle = text.slice(midStartBound, midEndBound);
  } else {
    const midStart = midStartBound + Math.floor((midRegionLen - m) / 2);
    middle = text.slice(midStart, midStart + m);
  }

  return `${head}${PROMPT_EXCERPT_GAP}${middle}${PROMPT_EXCERPT_GAP}${tail}`;
}

/**
 * Long KB text is truncated for LLM prompts and corpus checks. User notes are appended
 * after {@link KNOWLEDGE_APPEND_SECTION_MARKER}, so we always keep that tail in full when
 * possible. For the main body, long text uses head + middle + tail excerpts so summaries
 * are not driven only by the first and last slices of a multi-page crawl.
 */
export function truncateKnowledgeRawTextForPrompt(rawText: string, maxChars: number): string {
  const text = rawText ?? "";
  if (text.length <= maxChars) return text;

  const markerIdx = text.indexOf(KNOWLEDGE_APPEND_SECTION_MARKER);
  if (markerIdx >= 0) {
    const main = text.slice(0, markerIdx);
    const additions = text.slice(markerIdx);
    if (main.length + additions.length <= maxChars) return text;

    const budgetMain = maxChars - additions.length - 1;
    if (budgetMain < 200) {
      return additions.length <= maxChars ? additions : additions.slice(-maxChars);
    }
    return `${sampleHeadMiddleTail(main, budgetMain)}\n...[truncated imported source]...${additions}`;
  }

  return sampleHeadMiddleTail(text, maxChars);
}

export const RETELL_KNOWLEDGE_PROMPT_MARKER = "\n\n--- BUSINESS KNOWLEDGE ---\n";

export function splitRetellGeneralPrompt(generalPrompt: string): string {
  const idx = generalPrompt.indexOf(RETELL_KNOWLEDGE_PROMPT_MARKER);
  if (idx === -1) return generalPrompt.trim();
  return generalPrompt.slice(0, idx).trim();
}

export function buildRetellGeneralPromptWithKnowledge(
  basePrompt: string,
  corpus: string,
): string {
  const base = basePrompt.trim();
  const knowledge = corpus.trim();
  if (!knowledge) return base;
  return `${base}${RETELL_KNOWLEDGE_PROMPT_MARKER}${knowledge.slice(0, 12_000)}`;
}

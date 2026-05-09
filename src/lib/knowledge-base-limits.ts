/**
 * Central caps for knowledge-base import, storage, and downstream use.
 * Postgres `text` is effectively unbounded; these values prevent runaway memory
 * or absurdly large OpenAI requests while keeping multi-page crawls usable.
 */

/** Max pages to visit per website import (breadth-first, same-origin). */
export const KNOWLEDGE_CRAWL_MAX_PAGES = 250;

/** Max total characters collected across all crawled pages. */
export const KNOWLEDGE_CRAWL_MAX_COMBINED_CHARS = 2_000_000;

/** Max characters stored in `organization_knowledge_bases.raw_text`. */
export const KNOWLEDGE_STORED_RAW_TEXT_MAX_CHARS = 2_000_000;

/** Max source characters from raw text included in the OpenAI formatting prompt. */
export const KNOWLEDGE_LLM_PROMPT_SOURCE_MAX_CHARS = 96_000;

/** Max length for the short `preview` field in parsed JSON. */
export const KNOWLEDGE_LLM_PREVIEW_MAX_CHARS = 8_000;

/** Max length for the longer `formattedPreview` field in parsed JSON (digest, not full raw). */
export const KNOWLEDGE_LLM_FORMATTED_PREVIEW_MAX_CHARS = 48_000;

/** Max tokens for the OpenAI completion when building parsed data. */
export const KNOWLEDGE_LLM_MAX_OUTPUT_TOKENS = 12_288;

/** Dashboard preview card: max characters of formatted preview or raw fallback. */
export const KNOWLEDGE_UI_PREVIEW_MAX_CHARS = 80_000;

/** Raw-text budget when validating booking utterances against KB text. */
export const KNOWLEDGE_BOOKING_CORPUS_RAW_MAX_CHARS = 96_000;

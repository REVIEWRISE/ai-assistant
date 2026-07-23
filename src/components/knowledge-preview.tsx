"use client";

import { KNOWLEDGE_UI_PREVIEW_MAX_CHARS } from "@/lib/knowledge-base-limits";

type KnowledgePreviewProps = {
  rawText: string;
  formattedPreview?: string;
};

function renderBoldSegments(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={`${keyPrefix}-b-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-t-${index}`}>{part}</span>;
  });
}

/** ### Title → visual heading; - bullets → list; **bold** preserved. */
function FormattedPreviewBody({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bulletLines: string[] = [];
  let blockKey = 0;

  const flushBullets = () => {
    if (bulletLines.length === 0) return;
    const key = `ul-${blockKey++}`;
    blocks.push(
      <ul key={key} className="my-1 list-disc space-y-0.5 pl-5 marker:text-[var(--color-text-subtle)]">
        {bulletLines.map((b, i) => (
          <li key={i} className="text-[var(--color-text)]">
            {renderBoldSegments(b, `${key}-li-${i}`)}
          </li>
        ))}
      </ul>,
    );
    bulletLines = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(#{1,6})\s*(.+)$/);

    if (headingMatch) {
      flushBullets();
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const cls =
        level === 1
          ? "text-base font-semibold tracking-tight text-[var(--color-text)]"
          : level === 2
            ? "text-[15px] font-semibold text-[var(--color-text)]"
            : "text-sm font-semibold text-[var(--color-text)]";
      blocks.push(
        <div
          key={`hd-${idx}-${blockKey++}`}
          className={`${cls} mt-3 border-b border-[var(--color-border-muted)] pb-1 first:mt-0`}
        >
          {renderBoldSegments(title, `hd-${idx}`)}
        </div>,
      );
      return;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      bulletLines.push(bulletMatch[1]);
      return;
    }

    flushBullets();

    if (trimmed === "") {
      blocks.push(<div key={`sp-${idx}`} className="h-1.5" aria-hidden />);
      return;
    }

    blocks.push(
      <p key={`p-${idx}`} className="my-0.5 text-[var(--color-text)]">
        {renderBoldSegments(line.trimEnd(), `p-${idx}`)}
      </p>,
    );
  });

  flushBullets();

  return <div className="text-sm leading-relaxed">{blocks}</div>;
}

export function KnowledgePreview({
  rawText,
  formattedPreview,
}: KnowledgePreviewProps) {
  const raw = String(rawText ?? "");
  const formatted = String(formattedPreview ?? "").trim();
  const hasDigest = Boolean(formatted);
  const digestText = (hasDigest ? formatted : raw || "").slice(0, KNOWLEDGE_UI_PREVIEW_MAX_CHARS);
  const rawLen = raw.length;
  const showRawPanel = rawLen > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {hasDigest ? "Formatted digest" : "Preview"}
          </p>
          {hasDigest ? (
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--color-text-muted)]">
              This is an AI-generated digest for quick reading and chat context. It is meant to be shorter than the
              import. The complete scrape ({rawLen.toLocaleString()} characters) is stored as{" "}
              <span className="font-semibold text-[var(--color-text)]">imported text</span> below—nothing was dropped from the
              crawl when building that field.
            </p>
          ) : (
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--color-text-muted)]">
              Showing the start of your imported text. Open “Full imported text” to see everything that was saved.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
        <FormattedPreviewBody text={digestText} />
      </div>

      {showRawPanel ? (
        <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5">
          <summary className="cursor-pointer select-none text-sm font-semibold text-[var(--color-text)]">
            Full imported text
            <span className="ml-2 font-normal text-[var(--color-text-muted)]">({rawLen.toLocaleString()} characters)</span>
          </summary>
          <div className="mt-2 max-h-[min(28rem,65vh)] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs leading-relaxed text-[var(--color-text)] whitespace-pre-wrap break-words">
            {raw}
          </div>
        </details>
      ) : null}
    </div>
  );
}

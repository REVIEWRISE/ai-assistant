"use client";

import { useCallback, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";
import { BookingChatbotIcon } from "@/components/floating-booking-chatbot";
import { normalizeQuickActionsArray, type BookingFlowConfig, type ChatbotConfigData } from "@/lib/chatbot-config";
import { CHATBOT_EMBED_IFRAME_OPEN } from "@/lib/chatbot-embed-layout";
import type { GenerateBookingFlowResult } from "@/app/(protected)/appointments/chatbot/actions";

type BookingFlowDraftStep = {
  id: string;
  question: string;
  helperText: string;
  inputType: "options" | "datetime" | "text";
  optionsText: string;
};

type QuickActionDraft = {
  label: string;
  startsBookingFlow: boolean;
};

function slugifyStepId(value: string, index: number): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `step_${index + 1}`;
}

function SaveBookingFlowSubmitButton({ idleLabel }: { idleLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : idleLabel}
    </button>
  );
}

function ChatbotEmbedSnippet({
  embedBaseUrl,
  organizationId,
  organizationName,
}: {
  embedBaseUrl: string;
  organizationId: string;
  organizationName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<"html" | "jsx">("html");
  const snippet = useMemo(() => {
    if (!embedBaseUrl) return "";
    const origin = embedBaseUrl.replace(/\/$/, "");
    const src = `${origin}/embed/chatbot?org=${encodeURIComponent(organizationId)}`;
    const iframeId = `ai-assistant-chatbot-${organizationId.slice(0, 8)}`;
    const safeLabel = organizationName
      .replace(/\s+/g, " ")
      .replace(/--+/g, "—")
      .replace(/[<>]/g, "")
      .slice(0, 64);
    const resizeJs = `(function(){\n  var iframe = document.getElementById("${iframeId}");\n  if (!iframe) return;\n  function resize(isOpen){\n    iframe.style.width = isOpen ? "${CHATBOT_EMBED_IFRAME_OPEN.width}" : "80px";\n    iframe.style.height = isOpen ? "${CHATBOT_EMBED_IFRAME_OPEN.height}" : "80px";\n  }\n  resize(false);\n  window.addEventListener("message", function(event){\n    if (!event || !event.data) return;\n    if (event.source !== iframe.contentWindow) return;\n    if (event.data.type !== "ai-assistant-chatbot-state") return;\n    resize(Boolean(event.data.open));\n  });\n})();`;
    if (format === "jsx") {
      return `import { useEffect } from "react";\n\n{/* ${safeLabel} — AI Assistant booking chatbot */}\n<iframe\n  id="${iframeId}"\n  src="${src}"\n  title="Booking assistant"\n  style={{\n    position: "fixed",\n    right: 16,\n    bottom: 16,\n    width: 80,\n    height: 80,\n    maxWidth: "calc(100vw - 32px)",\n    border: 0,\n    background: "transparent",\n    zIndex: 2147483647,\n  }}\n  loading="lazy"\n/>\n\nuseEffect(() => {\n  const iframe = document.getElementById("${iframeId}") as HTMLIFrameElement | null;\n  if (!iframe) return;\n  const onMessage = (event: MessageEvent) => {\n    if (!event.data || event.source !== iframe.contentWindow) return;\n    if (event.data.type !== "ai-assistant-chatbot-state") return;\n    const open = Boolean(event.data.open);\n    iframe.style.width = open ? "${CHATBOT_EMBED_IFRAME_OPEN.width}" : "80px";\n    iframe.style.height = open ? "${CHATBOT_EMBED_IFRAME_OPEN.height}" : "80px";\n  };\n  window.addEventListener("message", onMessage);\n  return () => window.removeEventListener("message", onMessage);\n}, []);`;
    }
    return `<!-- ${safeLabel} — AI Assistant booking chatbot. Paste before </body>. -->\n<iframe\n  id="${iframeId}"\n  src="${src}"\n  title="Booking assistant"\n  style="position:fixed;right:16px;bottom:16px;width:80px;height:80px;max-width:calc(100vw - 32px);border:0;background:transparent;z-index:2147483647"\n  loading="lazy"\n></iframe>\n<script>\n${resizeJs}\n</script>`;
  }, [embedBaseUrl, organizationId, organizationName, format]);

  async function copySnippet() {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">Embed on your website</p>
      {!embedBaseUrl ? (
        <p className="mt-2 text-xs text-amber-800">
          Set{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-[11px]">NEXT_PUBLIC_APP_URL</code> to your public app URL
          (for example{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-[11px]">https://app.yoursite.com</code>) so the snippet
          points at the right host in production.
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-600">
          Paste into your site HTML (for example before{" "}
          <code className="rounded bg-slate-200/90 px-1 py-0.5 text-[11px]">&lt;/body&gt;</code>). This loads the assistant
          for <span className="font-semibold text-slate-800">{organizationName}</span>.
        </p>
      )}
      {embedBaseUrl ? (
        <>
          <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setFormat("html")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                format === "html"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              HTML
            </button>
            <button
              type="button"
              onClick={() => setFormat("jsx")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                format === "jsx"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              React/Next.js
            </button>
          </div>
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-[11px] leading-relaxed text-slate-800">
            {snippet}
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copySnippet}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              {copied ? "Copied" : "Copy embed code"}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            The link includes your organization id. Anyone who can read your page HTML can reuse it—treat it like a public
            widget key.
          </p>
        </>
      ) : null}
    </div>
  );
}

export type ChatbotOrgRow = {
  id: string;
  name: string;
  createdAt: string;
  isActive: boolean;
  config: ChatbotConfigData;
};

type ChatbotOrganizationsTableProps = {
  embedBaseUrl: string;
  rows: ChatbotOrgRow[];
  onSaveChatbot: (formData: FormData) => void | Promise<void>;
  onGenerateChatbot: (formData: FormData) => Promise<GenerateBookingFlowResult>;
};

export function ChatbotOrganizationsTable({
  embedBaseUrl,
  rows,
  onSaveChatbot,
  onGenerateChatbot,
}: ChatbotOrganizationsTableProps) {
  const [configureModalOrg, setConfigureModalOrg] = useState<ChatbotOrgRow | null>(null);
  const [flowModalOrg, setFlowModalOrg] = useState<ChatbotOrgRow | null>(null);
  const [previewTheme, setPreviewTheme] = useState("#22c55e");
  const [previewIcon, setPreviewIcon] = useState("#0f172a");
  const [previewWelcome, setPreviewWelcome] = useState("");
  const [idleHelperText, setIdleHelperText] = useState("");
  const [quickActionItems, setQuickActionItems] = useState<QuickActionDraft[]>([]);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState("30");
  const [minGapMinutes, setMinGapMinutes] = useState("0");
  const [flowSteps, setFlowSteps] = useState<BookingFlowDraftStep[]>([]);
  const [flowGeneratePending, setFlowGeneratePending] = useState(false);
  const [flowGenerateActiveScope, setFlowGenerateActiveScope] = useState<"intro" | "opening" | "steps" | null>(null);
  const [flowGenerateError, setFlowGenerateError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  function openConfigure(row: ChatbotOrgRow) {
    const { config } = row;
    setPreviewTheme(config.themeColor);
    setPreviewIcon(config.iconColor);
    setPreviewWelcome(config.welcomeMessage);
    setConfigureModalOrg(row);
  }

  const applyBookingFlowToEditors = useCallback((flow: BookingFlowConfig) => {
    setIdleHelperText(flow.idleHelperText ?? "");
    setQuickActionItems(normalizeQuickActionsArray(flow.quickActions ?? []));
    setSlotDurationMinutes(String(flow.slotDurationMinutes ?? 30));
    setMinGapMinutes(String(flow.minGapMinutes ?? 0));
    const draftSteps = flow.steps.map((step, idx) => ({
      id: step.id || `step_${idx + 1}`,
      question: step.question || "",
      helperText: step.helperText || "",
      inputType: (step.inputType === "datetime" ? "datetime" : step.inputType === "text" ? "text" : "options") as
        | "options"
        | "datetime"
        | "text",
      optionsText: step.options.map((o) => o.label).join("\n"),
    }));
    setFlowSteps(draftSteps);
  }, []);

  function openBookingFlow(row: ChatbotOrgRow) {
    setFlowGenerateError(null);
    applyBookingFlowToEditors(row.config.bookingFlow);
    setFlowModalOrg(row);
  }

  async function runFlowGenerate(scope: "intro" | "opening" | "steps") {
    if (!flowModalOrg) return;
    setFlowGenerateError(null);
    setFlowGeneratePending(true);
    setFlowGenerateActiveScope(scope);
    try {
      const fd = new FormData();
      fd.set("organization_id", flowModalOrg.id);
      fd.set("generate_scope", scope);
      const res = await onGenerateChatbot(fd);
      if (res.ok) {
        applyBookingFlowToEditors(res.bookingFlow);
        setFlowModalOrg((prev) =>
          prev
            ? {
                ...prev,
                config: { ...prev.config, bookingFlow: res.bookingFlow },
              }
            : null,
        );
      } else {
        const msg: Record<string, string> = {
          org_missing: "Missing organization.",
          denied: "You do not have access to this organization.",
          no_api_key: "Add OPENAI_API_KEY to your environment to generate a flow.",
          no_kb: "Import a knowledge base with enough text first, then try again.",
          failed: "Generation failed. Try again in a moment.",
        };
        setFlowGenerateError(msg[res.error] ?? "Something went wrong.");
      }
    } catch {
      setFlowGenerateError("Generation failed. Try again in a moment.");
    } finally {
      setFlowGeneratePending(false);
      setFlowGenerateActiveScope(null);
    }
  }

  const bookingFlowJson = useMemo(() => {
    const steps = flowSteps
      .map((step, idx) => {
        const question = step.question.trim();
        const helperText = step.helperText.trim() || "Choose one option.";
        const options =
          step.inputType === "datetime" || step.inputType === "text"
            ? []
            : step.optionsText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => ({ label: line, value: line }));
        if (!question || (step.inputType === "options" && options.length === 0)) return null;
        return {
          id: slugifyStepId(step.id || question, idx),
          question,
          helperText,
          inputType: step.inputType,
          options,
        };
      })
      .filter(
        (
          s,
        ): s is {
          id: string;
          question: string;
          helperText: string;
          inputType: "options" | "datetime" | "text";
          options: Array<{ label: string; value: string }>;
        } => Boolean(s),
      );

    const quickActions = quickActionItems
      .map(({ label, startsBookingFlow }) => ({
        label: label.trim(),
        startsBookingFlow,
      }))
      .filter((x) => x.label)
      .slice(0, 8);
    return JSON.stringify({
      version: 1,
      idleHelperText: idleHelperText.trim(),
      quickActions,
      slotDurationMinutes: Math.min(240, Math.max(15, parseInt(slotDurationMinutes || "30", 10) || 30)),
      minGapMinutes: Math.min(180, Math.max(0, parseInt(minGapMinutes || "0", 10) || 0)),
      steps,
    });
  }, [flowSteps, idleHelperText, minGapMinutes, quickActionItems, slotDurationMinutes]);

  const sorted = useMemo(
    () => rows.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return sorted.slice(start, start + perPage);
  }, [sorted, currentPage, perPage]);

  return (
    <Panel
      title="All your organizations"
      subtitle="Every workspace you created or were added to appears here. Open Configure for any row—settings are saved per organization."
    >
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[72px_1fr_140px_260px] items-center gap-2 bg-[linear-gradient(120deg,#0f172a,#1e293b_55%,#334155)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 lg:grid">
          <div>#</div>
          <div>Organization</div>
          <div>Session</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {paged.map((row, index) => (
            <div
              key={row.id}
              className="grid items-center gap-2 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50 lg:grid-cols-[72px_1fr_140px_260px]"
            >
              <div className="text-xs font-semibold text-slate-500">
                <span className="inline-flex min-w-[40px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                  {String((currentPage - 1) * perPage + index + 1).padStart(2, "0")}
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{row.name}</p>
                <p className="text-xs text-slate-500">
                  Created {new Date(row.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                {row.isActive ? (
                  <span className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Active session
                  </span>
                ) : (
                  <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Not active
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => openConfigure(row)}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Configure
                </button>
                <button
                  type="button"
                  onClick={() => openBookingFlow(row)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Booking flow
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{" "}
          <span className="font-semibold text-slate-900">
            {sorted.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-slate-900">
            {Math.min(currentPage * perPage, sorted.length)}
          </span>{" "}
          of <span className="font-semibold text-slate-900">{sorted.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Per page
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
            >
              {[5, 10, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {configureModalOrg
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
              <div className="max-h-[92vh] w-full max-w-[min(96vw,90rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="max-h-[92vh] overflow-y-auto p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                        Configure chatbot
                      </p>
                      <h2 className="mt-2 text-lg font-semibold text-slate-900">Configure {configureModalOrg.name}</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Name comes from the organization record and cannot be changed here.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfigureModalOrg(null)}
                      className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
                      aria-label="Close"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 6l12 12M6 18L18 6" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
                    <form
                      action={onSaveChatbot}
                      className="min-w-0 flex-1 space-y-4 lg:basis-0 lg:flex-[2]"
                    >
                      <input type="hidden" name="organization_id" value={configureModalOrg.id} />
                      <label className="text-sm font-semibold text-slate-700">
                        Organization
                        <input
                          value={configureModalOrg.name}
                          readOnly
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Theme color
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="color"
                            name="theme_color"
                            value={previewTheme}
                            onChange={(e) => setPreviewTheme(e.target.value)}
                            className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                          />
                          <span className="text-xs text-slate-500">{previewTheme}</span>
                        </div>
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Icon color
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="color"
                            name="icon_color"
                            value={previewIcon}
                            onChange={(e) => setPreviewIcon(e.target.value)}
                            className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                          />
                          <span className="text-xs text-slate-500">{previewIcon}</span>
                        </div>
                        <p className="mt-1 text-xs font-normal text-slate-500">
                          Used for the chat bubble icon (e.g. floating button and panel header).
                        </p>
                      </label>
                      <label className="block text-sm font-semibold text-slate-700">
                        Welcome message
                        <textarea
                          name="welcome_message"
                          value={previewWelcome}
                          onChange={(e) => setPreviewWelcome(e.target.value)}
                          rows={3}
                          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-cyan-300/50"
                        />
                      </label>
                      <p className="text-xs text-slate-500">
                        The embed only saves bookings when the knowledge base is approved and the visitor’s request
                        matches services or offerings described there. Optional strict allowlist: JSON array in chatbot
                        settings column{" "}
                        <code className="rounded bg-slate-100 px-1 text-[11px]">services</code>. If a workspace member
                        connects a calendar under Appointments, new requests are linked to that provider for follow-up.
                      </p>
                      <ChatbotEmbedSnippet
                        embedBaseUrl={embedBaseUrl}
                        organizationId={configureModalOrg.id}
                        organizationName={configureModalOrg.name}
                      />
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setConfigureModalOrg(null)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Save
                        </button>
                      </div>
                    </form>

                    <aside className="w-full min-w-0 flex-1 lg:sticky lg:top-0 lg:basis-0 lg:flex-[5]">
                      <div className="h-full rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Live preview</p>
                        <p className="mt-1 text-xs text-slate-500">Marketing-page widget: launcher and open panel are shown separately below.</p>

                        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Floating chat button
                            </p>
                            <p className="mt-1 text-[11px] leading-snug text-slate-500">
                              Fixed to the corner of the page; theme fills the circle, icon uses your icon color.
                            </p>
                            <div
                              className="relative mt-3 h-[240px] overflow-hidden rounded-xl border border-slate-200/80 bg-[linear-gradient(145deg,#e2e8f0_0%,#f1f5f9_45%,#e2e8f0_100%)] shadow-inner"
                              aria-hidden
                            >
                              <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:20px_20px]" />
                              <div className="absolute bottom-5 right-5">
                                <div
                                  style={{ backgroundColor: previewTheme, color: previewIcon }}
                                  className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
                                >
                                  <BookingChatbotIcon className="h-7 w-7" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Open chat panel
                            </p>
                            <p className="mt-1 text-[11px] leading-snug text-slate-500">
                              The conversation UI visitors see after they tap the floating button.
                            </p>
                            <div
                              className="relative mt-3 min-h-[260px] overflow-hidden rounded-xl border border-slate-200/80 bg-[linear-gradient(145deg,#e2e8f0_0%,#f1f5f9_45%,#e2e8f0_100%)] p-4 shadow-inner"
                              aria-hidden
                            >
                              <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:20px_20px]" />
                              <div className="relative mx-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-white/15 bg-[#0b1122]/95 text-left text-slate-100 shadow-xl backdrop-blur">
                                <div className="flex items-start justify-between gap-2 border-b border-white/10 px-3.5 py-3">
                                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                    <span
                                      style={{
                                        backgroundColor: previewTheme,
                                        color: previewIcon,
                                        border: `1px solid ${previewTheme}`,
                                        boxShadow: "none",
                                      }}
                                      className="box-border flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                                    >
                                      <BookingChatbotIcon className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-[10px] uppercase tracking-[0.12em] text-cyan-200/90">
                                        Booking Assistant
                                      </p>
                                      <p className="truncate text-sm font-semibold text-white">{configureModalOrg.name}</p>
                                    </div>
                                  </div>
                                  <span className="shrink-0 text-slate-400" aria-hidden>
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    >
                                      <path d="M6 6l12 12M6 18L18 6" />
                                    </svg>
                                  </span>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto border-b border-white/10 px-3.5 py-3">
                                  <div className="flex flex-col gap-3">
                                    <div className="max-w-[92%] rounded-lg bg-white/10 px-2.5 py-2 text-xs leading-relaxed text-slate-100">
                                      {previewWelcome.trim() || "Welcome message appears here."}
                                    </div>
                                    <div className="ml-auto max-w-[92%] rounded-lg bg-cyan-300 px-2.5 py-2 text-xs font-medium leading-relaxed text-slate-900">
                                      Tomorrow 7:30 PM, party of 4
                                    </div>
                                    <div className="max-w-[92%] rounded-lg bg-white/10 px-2.5 py-2 text-xs leading-relaxed text-slate-100">
                                      Thanks — we can use your knowledge base to answer questions about what you
                                      offer and your policies too.
                                    </div>
                                  </div>
                                </div>
                                <div className="px-3.5 py-2.5">
                                  <p className="mb-2 text-[11px] text-slate-300">
                                    Add date, time, party size, or any question.
                                  </p>
                                  <div className="flex gap-2">
                                    <div className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs text-slate-400">
                                      Tomorrow 7:30 PM for 4
                                    </div>
                                    <span
                                      style={{ backgroundColor: previewTheme, color: previewIcon }}
                                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                      aria-hidden
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M22 2 11 13" />
                                        <path d="M22 2 15 22 11 13 2 9 22 2z" />
                                      </svg>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {flowModalOrg
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
              <div className="max-h-[92vh] w-full max-w-[min(96vw,64rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="max-h-[92vh] overflow-y-auto p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                        Booking flow
                      </p>
                      <h2 className="mt-2 text-lg font-semibold text-slate-900">
                        Booking flow for {flowModalOrg.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        AI options: intro line, quick-action chips, and question steps (Section 1 and 3)—all inside{" "}
                        <span className="font-semibold">Review &amp; edit</span>. Drafts stay in this form until you{" "}
                        <span className="font-semibold">Save booking flow</span>. Welcome message and theme colors stay
                        as set in Configure chatbot.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFlowModalOrg(null)}
                      className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
                      aria-label="Close"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 6l12 12M6 18L18 6" />
                      </svg>
                    </button>
                  </div>

                  <form action={onSaveChatbot} className="mt-5 space-y-4">
                    <input type="hidden" name="organization_id" value={flowModalOrg.id} />
                    <input type="hidden" name="welcome_message" value={flowModalOrg.config.welcomeMessage} />
                    <input type="hidden" name="theme_color" value={flowModalOrg.config.themeColor} />
                    <input type="hidden" name="icon_color" value={flowModalOrg.config.iconColor} />
                    <input type="hidden" name="booking_flow" value={bookingFlowJson} />
                    <p className="text-sm font-semibold text-slate-900">Review &amp; edit</p>
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold">Generate intro</span> updates only the intro line.{" "}
                      <span className="font-semibold">Generate quick actions</span> fills only the shortcut chips.{" "}
                      <span className="font-semibold">Generate question steps</span> updates the questionnaire only. AI
                      fills the form only—nothing is stored until you click{" "}
                      <span className="font-semibold">Save booking flow</span>.
                    </p>
                    {flowGenerateError ? (
                      <p className="text-xs font-medium text-rose-700">{flowGenerateError}</p>
                    ) : null}

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white px-4 py-3 sm:px-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                          Section 1
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">Opening experience</h3>
                        <p className="mt-1 text-xs text-slate-600">
                          Intro line plus optional quick-action chips. Use AI for the intro, for chips only, or both—or
                          type chips manually. You can clear everything for a minimal widget.
                        </p>
                      </div>
                      <div className="space-y-3 p-4 sm:p-5">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-700">Intro message</span>
                            <button
                              type="button"
                              disabled={flowGeneratePending}
                              onClick={() => void runFlowGenerate("intro")}
                              className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {flowGeneratePending && flowGenerateActiveScope === "intro"
                                ? "Generating…"
                                : "Generate intro"}
                            </button>
                          </div>
                          <input
                            value={idleHelperText}
                            onChange={(e) => setIdleHelperText(e.target.value)}
                            placeholder="Welcome! Choose an option below to get started."
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-800">Quick actions (manual)</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                              Shortcut chips under the intro. For each row, turn on{" "}
                              <span className="font-medium text-slate-700">Starts booking flow</span> only if that chip
                              should open your guided questions (requires saved steps). Leave it off for FAQ-style
                              chips so the label is sent as a normal chat message. Draft here or use{" "}
                              <span className="font-medium text-slate-700">Generate quick actions</span> below (new chips
                              default to starting the flow—turn off as needed; intro unchanged).
                            </p>
                          </div>
                          <div className="space-y-2">
                            {quickActionItems.map((item, idx) => (
                              <div
                                key={`qa-${idx}-${item.label}`}
                                className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 sm:flex-row sm:items-center sm:gap-2"
                              >
                                <input
                                  value={item.label}
                                  onChange={(e) =>
                                    setQuickActionItems((prev) =>
                                      prev.map((x, i) =>
                                        i === idx ? { ...x, label: e.target.value } : x,
                                      ),
                                    )
                                  }
                                  placeholder="Short label, e.g. Book an appointment"
                                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                                />
                                <label className="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-[11px] font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={item.startsBookingFlow}
                                    onChange={(e) =>
                                      setQuickActionItems((prev) =>
                                        prev.map((x, i) =>
                                          i === idx ? { ...x, startsBookingFlow: e.target.checked } : x,
                                        ),
                                      )
                                    }
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-amber-800 focus:ring-amber-600"
                                  />
                                  Starts booking flow
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQuickActionItems((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                setQuickActionItems((prev) => [
                                  ...prev,
                                  { label: "", startsBookingFlow: true },
                                ])
                              }
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Add quick action
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <p className="min-w-0 text-[11px] leading-snug text-amber-950">
                            <span className="font-semibold">AI:</span> shortcut chips only from your knowledge import.
                            Your intro line stays as-is (use <span className="font-semibold">Generate intro</span> above to
                            change it). Does not change question steps.
                          </p>
                          <button
                            type="button"
                            disabled={flowGeneratePending}
                            onClick={() => void runFlowGenerate("opening")}
                            className="shrink-0 rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {flowGeneratePending && flowGenerateActiveScope === "opening"
                              ? "Generating…"
                              : "Generate quick actions"}
                          </button>
                        </div>
                      </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-3 sm:px-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          Section 2
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">Booking timing rules</h3>
                        <p className="mt-1 text-xs text-slate-600">
                          Set default booking duration and gap between consecutive bookings.
                        </p>
                      </div>
                      <div className="p-4 sm:p-5">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] text-slate-600">
                            These values are used for booking end-time calculation and availability pre-checks.
                          </p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-slate-700">
                              Booking duration (minutes)
                              <input
                                type="number"
                                min={15}
                                max={240}
                                step={5}
                                value={slotDurationMinutes}
                                onChange={(e) => setSlotDurationMinutes(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                              />
                              <p className="mt-1 text-[11px] font-normal text-slate-500">
                                Used to calculate booking end time for conflict checks.
                              </p>
                            </label>
                            <label className="block text-xs font-semibold text-slate-700">
                              Minimum gap between bookings (minutes)
                              <input
                                type="number"
                                min={0}
                                max={180}
                                step={5}
                                value={minGapMinutes}
                                onChange={(e) => setMinGapMinutes(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                              />
                              <p className="mt-1 text-[11px] font-normal text-slate-500">
                                Prevents back-to-back bookings when set above 0.
                              </p>
                            </label>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-100 to-white px-4 py-3 sm:px-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                          Section 3
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">Question steps</h3>
                        <p className="mt-1 text-xs text-slate-600">
                          Ordered questions (options, date &amp; time, or text). You can remove every step for an
                          empty flow; incomplete rows are skipped when saving until you fix or remove them.
                        </p>
                      </div>
                      <div className="space-y-4 p-4 sm:p-5">
                        <div className="flex flex-col gap-2 rounded-lg border border-cyan-200/80 bg-cyan-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <p className="min-w-0 text-[11px] leading-snug text-cyan-950">
                            <span className="font-semibold">AI:</span> question steps only (options, date/time, text).
                            Does not change intro or quick buttons.
                          </p>
                          <button
                            type="button"
                            disabled={flowGeneratePending}
                            onClick={() => void runFlowGenerate("steps")}
                            className="shrink-0 rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {flowGeneratePending && flowGenerateActiveScope === "steps"
                              ? "Generating…"
                              : "Generate question steps"}
                          </button>
                        </div>
                        <div className="space-y-3">
                      {flowSteps.map((step, index) => (
                        <div key={`${step.id}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-[11px] font-bold text-white">
                                {index + 1}
                              </span>
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Question step
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setFlowSteps((prev) => {
                                    if (index === 0) return prev;
                                    const next = prev.slice();
                                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                    return next;
                                  })
                                }
                                disabled={index === 0}
                                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-50"
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFlowSteps((prev) => {
                                    if (index === prev.length - 1) return prev;
                                    const next = prev.slice();
                                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                    return next;
                                  })
                                }
                                disabled={index === flowSteps.length - 1}
                                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-50"
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFlowSteps((prev) => prev.filter((_, i) => i !== index))
                                }
                                className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-slate-700">
                              Internal id (optional)
                              <input
                                value={step.id}
                                onChange={(e) =>
                                  setFlowSteps((prev) =>
                                    prev.map((s, i) => (i === index ? { ...s, id: e.target.value } : s)),
                                  )
                                }
                                placeholder={`step_${index + 1}`}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                              />
                            </label>
                            <label className="block text-xs font-semibold text-slate-700">
                              Helper text (optional)
                              <input
                                value={step.helperText}
                                onChange={(e) =>
                                  setFlowSteps((prev) =>
                                    prev.map((s, i) =>
                                      i === index ? { ...s, helperText: e.target.value } : s,
                                    ),
                                  )
                                }
                                placeholder="Choose one option."
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                              />
                            </label>
                            <label className="block text-xs font-semibold text-slate-700">
                              Answer input type
                              <select
                                value={step.inputType}
                                onChange={(e) =>
                                  setFlowSteps((prev) =>
                                    prev.map((s, i) =>
                                      i === index
                                        ? {
                                            ...s,
                                            inputType:
                                              e.target.value === "datetime"
                                                ? "datetime"
                                                : e.target.value === "text"
                                                  ? "text"
                                                  : "options",
                                          }
                                        : s,
                                    ),
                                  )
                                }
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                              >
                                <option value="options">Options list</option>
                                <option value="datetime">Date &amp; time picker</option>
                                <option value="text">Simple text</option>
                              </select>
                            </label>
                          </div>
                          <label className="mt-3 block text-xs font-semibold text-slate-700">
                            Question shown to visitor
                            <input
                              value={step.question}
                              onChange={(e) =>
                                setFlowSteps((prev) =>
                                  prev.map((s, i) =>
                                    i === index ? { ...s, question: e.target.value } : s,
                                  ),
                                )
                              }
                              placeholder="What would you like to book?"
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                            />
                          </label>
                          {step.inputType === "options" ? (
                            <label className="mt-2 block text-xs font-semibold text-slate-700">
                              Options (one per line)
                              <textarea
                                value={step.optionsText}
                                onChange={(e) =>
                                  setFlowSteps((prev) =>
                                    prev.map((s, i) =>
                                      i === index ? { ...s, optionsText: e.target.value } : s,
                                    ),
                                  )
                                }
                                rows={4}
                                placeholder={"Dinner\nLunch\nBrunch"}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                              />
                            </label>
                          ) : step.inputType === "datetime" ? (
                            <div className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
                              Users will see a date and time picker for this step.
                            </div>
                          ) : (
                            <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                              Users will see a simple text input for this step.
                            </div>
                          )}
                        </div>
                      ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFlowSteps((prev) => [
                                ...prev,
                                {
                                  id: `step_${prev.length + 1}`,
                                  question: "",
                                  helperText: "",
                                  inputType: "options",
                                  optionsText: "",
                                },
                              ])
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Add question
                          </button>
                        </div>
                      </div>
                    </section>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setFlowModalOrg(null)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Close
                      </button>
                      <SaveBookingFlowSubmitButton idleLabel="Save booking flow" />
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </Panel>
  );
}

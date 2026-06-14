"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Panel } from "@/components/ui";
import { BookingChatbotIcon } from "@/components/floating-booking-chatbot";
import type { ChatbotConfigData } from "@/lib/chatbot-config";
import { PRODUCT_NAME } from "@/lib/brand";
import { CHATBOT_EMBED_IFRAME_OPEN } from "@/lib/chatbot-embed-layout";
import type { GenerateBookingFlowResult, GenerateVoiceGreetingResult } from "@/app/(protected)/appointments/chatbot/actions";
import { ChatbotBookingFlowModal } from "@/components/chatbot-booking-flow-modal";
import { ChatbotCrmIntegrationModal } from "@/components/chatbot-crm-integration-modal";
import { ChatbotVoiceBookingModal } from "@/components/chatbot-voice-booking-modal";
import { ChatbotWidgetPreview } from "@/components/chatbot-widget-preview";

function ChatbotOrgActionsMenu({
  row,
  isOpen,
  onToggle,
  onClose,
  onConfigure,
  onBookingFlow,
  onVoice,
  onCrm,
}: {
  row: ChatbotOrgRow;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onConfigure: () => void;
  onBookingFlow: () => void;
  onVoice: () => void;
  onCrm: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ bottom: number; left: number } | null>(null);

  function computeMenuPosition(rect: DOMRect) {
    const menuWidth = 260;
    const gap = 8;
    const viewportPadding = 8;
    const bottom = window.innerHeight - rect.top + gap;
    let left = rect.right - menuWidth;

    left = Math.min(
      Math.max(viewportPadding, left),
      window.innerWidth - menuWidth - viewportPadding,
    );

    return { bottom, left };
  }

  function handleTriggerClick() {
    if (isOpen) {
      onClose();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPosition(computeMenuPosition(rect));
    }
    onToggle();
  }

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPosition(computeMenuPosition(rect));
      }
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const menuItems = [
    {
      id: "configure",
      label: "Configure chatbot",
      description: "Welcome message, theme colors, and website embed code",
      onClick: onConfigure,
      active: false,
      primary: true,
    },
    {
      id: "booking-flow",
      label: "Edit booking flow",
      description: "Guided booking questions and quick-start actions",
      onClick: onBookingFlow,
      active: false,
      primary: false,
    },
    {
      id: "voice",
      label: row.config.voiceBooking.enabled ? "Voice booking · On" : "Set up voice booking",
      description: row.config.voiceBooking.enabled
        ? `${row.config.voiceBooking.agentName} speaks on your embed widget`
        : "Add a spoken greeting and voice profile for visitors",
      onClick: onVoice,
      active: row.config.voiceBooking.enabled,
      primary: false,
    },
    {
      id: "crm",
      label: row.config.crmIntegration.enabled ? "CRM sync · On" : "Connect CRM sync",
      description: row.config.crmIntegration.enabled
        ? "Completed bookings are sent to your webhook"
        : "Send completed bookings to your CRM webhook",
      onClick: onCrm,
      active: row.config.crmIntegration.enabled,
      primary: false,
    },
  ];

  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-label={`Open organization settings menu for ${row.name}`}
        title={`Settings for ${row.name}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          isOpen
            ? "border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
            : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ bottom: menuPosition.bottom, left: menuPosition.left }}
              className="fixed z-[120] min-w-[16.25rem] max-w-[16.25rem] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-1 shadow-[var(--shadow-lg)]"
            >
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    item.onClick();
                    onClose();
                  }}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition ${
                    item.primary || item.active
                      ? "hover:bg-[var(--color-primary-soft)]"
                      : "hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <span
                    className={`text-sm ${
                      item.primary || item.active
                        ? "font-semibold text-[var(--color-primary-h)]"
                        : "font-semibold text-[var(--color-text)]"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="text-[11px] leading-snug text-[var(--color-text-muted)]">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
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
      return `import { useEffect } from "react";\n\n{/* ${safeLabel} — ${PRODUCT_NAME} booking chatbot */}\n<iframe\n  id="${iframeId}"\n  src="${src}"\n  title="Booking assistant"\n  style={{\n    position: "fixed",\n    right: 16,\n    bottom: 16,\n    width: 80,\n    height: 80,\n    maxWidth: "calc(100vw - 32px)",\n    border: 0,\n    background: "transparent",\n    zIndex: 2147483647,\n  }}\n  loading="lazy"\n/>\n\nuseEffect(() => {\n  const iframe = document.getElementById("${iframeId}") as HTMLIFrameElement | null;\n  if (!iframe) return;\n  const onMessage = (event: MessageEvent) => {\n    if (!event.data || event.source !== iframe.contentWindow) return;\n    if (event.data.type !== "ai-assistant-chatbot-state") return;\n    const open = Boolean(event.data.open);\n    iframe.style.width = open ? "${CHATBOT_EMBED_IFRAME_OPEN.width}" : "80px";\n    iframe.style.height = open ? "${CHATBOT_EMBED_IFRAME_OPEN.height}" : "80px";\n  };\n  window.addEventListener("message", onMessage);\n  return () => window.removeEventListener("message", onMessage);\n}, []);`;
    }
    return `<!-- ${safeLabel} — ${PRODUCT_NAME} booking chatbot. Paste before </body>. -->\n<iframe\n  id="${iframeId}"\n  src="${src}"\n  title="Booking assistant"\n  style="position:fixed;right:16px;bottom:16px;width:80px;height:80px;max-width:calc(100vw - 32px);border:0;background:transparent;z-index:2147483647"\n  loading="lazy"\n></iframe>\n<script>\n${resizeJs}\n</script>`;
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-sm font-semibold text-[var(--color-text)]">Embed on your website</p>
      {!embedBaseUrl ? (
        <p className="mt-2 text-xs text-[var(--color-primary-h)]">
          Set{" "}
          <code className="rounded bg-[var(--color-primary-soft)] px-1 py-0.5 text-[11px]">NEXT_PUBLIC_APP_URL</code> to your public app URL
          (for example{" "}
          <code className="rounded bg-[var(--color-primary-soft)] px-1 py-0.5 text-[11px]">https://app.yoursite.com</code>) so the snippet
          points at the right host in production.
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Paste into your site HTML (for example before{" "}
          <code className="rounded bg-[var(--color-raised)] px-1 py-0.5 text-[11px]">&lt;/body&gt;</code>). This loads the assistant
          for <span className="font-semibold text-[var(--color-text)]">{organizationName}</span>.
        </p>
      )}
      {embedBaseUrl ? (
        <>
          <div className="mt-3 inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
            <button
              type="button"
              onClick={() => setFormat("html")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                format === "html"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "text-[var(--color-text)] hover:bg-[var(--color-raised)]"
              }`}
            >
              HTML
            </button>
            <button
              type="button"
              onClick={() => setFormat("jsx")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                format === "jsx"
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "text-[var(--color-text)] hover:bg-[var(--color-raised)]"
              }`}
            >
              React/Next.js
            </button>
          </div>
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-[11px] leading-relaxed text-[var(--color-text)]">
            {snippet}
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copySnippet}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
            >
              {copied ? "Copied" : "Copy embed code"}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-[var(--color-text-muted)]">
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
  onSaveCrmIntegration: (formData: FormData) => void | Promise<void>;
  onSaveVoiceBooking: (formData: FormData) => void | Promise<void>;
  onGenerateChatbot: (formData: FormData) => Promise<GenerateBookingFlowResult>;
  onGenerateVoiceGreeting: (formData: FormData) => Promise<GenerateVoiceGreetingResult>;
};

export function ChatbotOrganizationsTable({
  embedBaseUrl,
  rows,
  onSaveChatbot,
  onSaveCrmIntegration,
  onSaveVoiceBooking,
  onGenerateChatbot,
  onGenerateVoiceGreeting,
}: ChatbotOrganizationsTableProps) {
  const [configureModalOrg, setConfigureModalOrg] = useState<ChatbotOrgRow | null>(null);
  const [flowModalOrg, setFlowModalOrg] = useState<ChatbotOrgRow | null>(null);
  const [crmModalOrg, setCrmModalOrg] = useState<ChatbotOrgRow | null>(null);
  const [voiceModalOrg, setVoiceModalOrg] = useState<ChatbotOrgRow | null>(null);
  const [previewTheme, setPreviewTheme] = useState("#22c55e");
  const [previewIcon, setPreviewIcon] = useState("#0f172a");
  const [previewWelcome, setPreviewWelcome] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [openActionsMenuOrgId, setOpenActionsMenuOrgId] = useState<string | null>(null);

  function openConfigure(row: ChatbotOrgRow) {
    const { config } = row;
    setPreviewTheme(config.themeColor);
    setPreviewIcon(config.iconColor);
    setPreviewWelcome(config.welcomeMessage);
    setConfigureModalOrg(row);
  }

  function openBookingFlow(row: ChatbotOrgRow) {
    setFlowModalOrg(row);
  }

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
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="vr-app-table-header hidden grid-cols-[72px_1fr_140px_56px] items-center gap-2 px-4 py-3 lg:grid">
          <div>#</div>
          <div>Organization</div>
          <div>Session</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-[var(--color-border-muted)]">
          {paged.map((row, index) => (
            <div
              key={row.id}
              className="grid items-center gap-2 px-4 py-3 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)] lg:grid-cols-[72px_1fr_140px_56px]"
            >
              <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                <span className="inline-flex min-w-[40px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {String((currentPage - 1) * perPage + index + 1).padStart(2, "0")}
                </span>
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text)]">{row.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Created {new Date(row.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                {row.isActive ? (
                  <span className="inline-flex rounded-lg vr-app-status-success px-2.5 py-1 text-xs font-semibold">
                    Active session
                  </span>
                ) : (
                  <span className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    Not active
                  </span>
                )}
              </div>
              <ChatbotOrgActionsMenu
                row={row}
                isOpen={openActionsMenuOrgId === row.id}
                onToggle={() =>
                  setOpenActionsMenuOrgId((current) => (current === row.id ? null : row.id))
                }
                onClose={() => setOpenActionsMenuOrgId(null)}
                onConfigure={() => openConfigure(row)}
                onBookingFlow={() => openBookingFlow(row)}
                onVoice={() => setVoiceModalOrg(row)}
                onCrm={() => setCrmModalOrg(row)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <div>
          Showing{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {sorted.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {Math.min(currentPage * perPage, sorted.length)}
          </span>{" "}
          of <span className="font-semibold text-[var(--color-text)]">{sorted.length}</span>
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
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs font-semibold text-[var(--color-text)]"
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
              className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text)] disabled:opacity-50"
            >
              Prev
            </button>
            <span className="rounded-lg bg-[var(--color-raised)] px-2 py-1 text-xs font-semibold text-[var(--color-text)]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {configureModalOrg
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] px-4 py-6">
              <div className="max-h-[92vh] w-full max-w-[min(96vw,90rem)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]">
                <div className="max-h-[92vh] overflow-y-auto p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                        Configure chatbot
                      </p>
                      <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">Configure {configureModalOrg.name}</h2>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        Name comes from the organization record and cannot be changed here.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfigureModalOrg(null)}
                      className="shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)]"
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
                      <label className="text-sm font-semibold text-[var(--color-text)]">
                        Organization
                        <input
                          value={configureModalOrg.name}
                          readOnly
                          className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)] outline-none"
                        />
                      </label>
                      <label className="text-sm font-semibold text-[var(--color-text)]">
                        Theme color
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="color"
                            name="theme_color"
                            value={previewTheme}
                            onChange={(e) => setPreviewTheme(e.target.value)}
                            className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1"
                          />
                          <span className="text-xs text-[var(--color-text-muted)]">{previewTheme}</span>
                        </div>
                      </label>
                      <label className="text-sm font-semibold text-[var(--color-text)]">
                        Icon color
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="color"
                            name="icon_color"
                            value={previewIcon}
                            onChange={(e) => setPreviewIcon(e.target.value)}
                            className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1"
                          />
                          <span className="text-xs text-[var(--color-text-muted)]">{previewIcon}</span>
                        </div>
                        <p className="mt-1 text-xs font-normal text-[var(--color-text-muted)]">
                          Used for the chat bubble icon (e.g. floating button and panel header).
                        </p>
                      </label>
                      <label className="block text-sm font-semibold text-[var(--color-text)]">
                        Welcome message
                        <textarea
                          name="welcome_message"
                          value={previewWelcome}
                          onChange={(e) => setPreviewWelcome(e.target.value)}
                          rows={3}
                          className="mt-2 w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
                        />
                      </label>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        The embed only saves bookings when the knowledge base is approved and the visitor’s request
                        matches services or offerings described there. Optional strict allowlist: JSON array in chatbot
                        settings column{" "}
                        <code className="rounded bg-[var(--color-raised)] px-1 text-[11px]">services</code>. If a workspace member
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
                          className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
                        >
                          Save
                        </button>
                      </div>
                    </form>

                    <aside className="w-full min-w-0 flex-1 lg:sticky lg:top-0 lg:basis-0 lg:flex-[5]">
                      <div
                        className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                        style={
                          {
                            "--chat-accent": previewTheme,
                            "--chat-accent-fg": previewIcon,
                          } as CSSProperties
                        }
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Live preview</p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Marketing-page widget: launcher and open panel are shown separately below.</p>

                        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                              Floating chat button
                            </p>
                            <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">
                              Fixed to the corner of the page; theme fills the circle, icon uses your icon color.
                            </p>
                            <div
                              className="relative mt-3 h-[240px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] shadow-inner"
                              aria-hidden
                            >
                              <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(color-mix(in_srgb,var(--color-border)_60%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--color-border)_60%,transparent)_1px,transparent_1px)] [background-size:20px_20px]" />
                              <div className="absolute bottom-5 right-5">
                                <div
                                  style={{ backgroundColor: previewTheme, color: previewIcon }}
                                  className="flex h-14 w-14 items-center justify-center rounded-full shadow-[var(--shadow-lg)] ring-4 ring-[color-mix(in_srgb,var(--color-bg)_92%,transparent)]"
                                >
                                  <BookingChatbotIcon className="h-6 w-6" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text)]">
                              Open chat panel
                            </p>
                            <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">
                              Live widget preview — switch between chat and voice when voice booking is enabled.
                            </p>
                            <div className="mt-3">
                              <ChatbotWidgetPreview
                                organizationId={configureModalOrg.id}
                                organizationName={configureModalOrg.name}
                                welcomeMessage={previewWelcome}
                                themeColor={previewTheme}
                                iconColor={previewIcon}
                                bookingFlow={configureModalOrg.config.bookingFlow}
                                voiceBooking={configureModalOrg.config.voiceBooking}
                              />
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

      {flowModalOrg ? (
        <ChatbotBookingFlowModal
          organizationId={flowModalOrg.id}
          organizationName={flowModalOrg.name}
          config={flowModalOrg.config}
          onSave={onSaveChatbot}
          onGenerate={onGenerateChatbot}
          onClose={() => setFlowModalOrg(null)}
        />
      ) : null}

      {voiceModalOrg ? (
        <ChatbotVoiceBookingModal
          organizationId={voiceModalOrg.id}
          organizationName={voiceModalOrg.name}
          initialConfig={voiceModalOrg.config.voiceBooking}
          themeColor={voiceModalOrg.config.themeColor}
          iconColor={voiceModalOrg.config.iconColor}
          welcomeMessage={voiceModalOrg.config.welcomeMessage}
          bookingFlow={voiceModalOrg.config.bookingFlow}
          onSave={onSaveVoiceBooking}
          onGenerateGreeting={onGenerateVoiceGreeting}
          onClose={() => setVoiceModalOrg(null)}
        />
      ) : null}

      {crmModalOrg ? (
        <ChatbotCrmIntegrationModal
          organizationId={crmModalOrg.id}
          organizationName={crmModalOrg.name}
          bookingFlow={crmModalOrg.config.bookingFlow}
          initialConfig={crmModalOrg.config.crmIntegration}
          onSave={onSaveCrmIntegration}
          onClose={() => setCrmModalOrg(null)}
        />
      ) : null}
    </Panel>
  );
}

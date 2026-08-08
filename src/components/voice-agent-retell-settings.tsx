"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import type { VoiceAgentAiResult } from "@/lib/voice-agent-ai";
import { CustomSelect } from "@/components/custom-select";
import { VoiceAgentPhoneGateOverlay } from "@/components/voice-agent-phone-gate-overlay";
import { toast } from "@/lib/toast";
import {
  RETELL_LANGUAGE_OPTIONS,
  RETELL_VOICE_CUSTOM_VALUE,
  defaultRetellVoiceAgentConfig,
  defaultVoiceAgentKnowledgeConfig,
  resolveRetellVoiceId,
  type RetellVoiceAgentConfig,
  type RetellVoiceListItem,
  type RetellVoiceSelectOption,
  type VoiceAgentKnowledgeConfig,
  type VoiceAgentPhoneConfig,
} from "@/lib/retell-voice-agent";

type KnowledgeSnapshot = {
  status: string;
  sourceUrl: string | null;
  previewLength: number;
  previewText: string;
  lastImportedAt: string | null;
};

type SectionKey = "setup" | "voice" | "conversation" | "knowledge" | "booking" | "advanced";

const sections: Array<{ key: SectionKey; label: string; description: string }> = [
  { key: "setup", label: "Setup", description: "Agent identity & status" },
  { key: "voice", label: "Voice", description: "Sound & language" },
  { key: "conversation", label: "Conversation", description: "Greeting & instructions" },
  { key: "knowledge", label: "Knowledge", description: "Business context" },
  { key: "booking", label: "Voice booking", description: "Book on calls" },
  { key: "advanced", label: "Advanced", description: "Call behavior" },
];

const GENERATE_ERROR_MESSAGES: Record<string, string> = {
  no_api_key: "Add OPENAI_API_KEY to generate from your knowledge base.",
  no_kb: "Import at least 200 characters of knowledge base content first.",
  failed: "Generation failed. Try again in a moment.",
};

function FieldHeader({
  label,
  onGenerate,
  generating,
  generateLabel,
}: {
  label: string;
  onGenerate: () => void;
  generating: boolean;
  generateLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-semibold text-[var(--color-text)]">{label}</span>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {generating ? "Generating…" : generateLabel}
      </button>
    </div>
  );
}
function statusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "draft") return "Draft";
  if (normalized === "empty") return "Not imported";
  return status;
}

function statusTone(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "approved") return "vr-app-status-success";
  if (normalized === "draft") return "vr-app-status-warning";
  return "vr-app-status-danger";
}

function scrollToSection(key: SectionKey) {
  document.getElementById(`voice-agent-section-${key}`)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
          checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SectionCard({
  sectionKey,
  title,
  description,
  children,
}: {
  sectionKey: SectionKey;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const index = sections.findIndex((section) => section.key === sectionKey) + 1;

  return (
    <section
      id={`voice-agent-section-${sectionKey}`}
      className="scroll-mt-28 rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <div className="border-b border-[var(--color-border)] px-5 py-5 lg:px-6">
        <div className="flex items-start gap-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-sm font-bold text-[var(--color-primary-h)]">
            {index}
          </span>
          <div>
            <h4 className="text-base font-semibold tracking-[-0.01em] text-[var(--color-text)]">{title}</h4>
            <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">{description}</p>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5 lg:p-6">{children}</div>
    </section>
  );
}

function CollapsibleBlock({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
          {summary && !open ? (
            <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{summary}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-semibold text-[var(--color-primary-h)]">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? <div className="border-t border-[var(--color-border-muted)] px-4 py-3">{children}</div> : null}
    </div>
  );
}

function SettingsActionButtons({
  retellApiConfigured,
  hasAgent,
  remoteAgentMissing,
  linkExistingAgent,
  retellAgentId,
  onReset,
}: {
  retellApiConfigured: boolean;
  hasAgent: boolean;
  remoteAgentMissing: boolean;
  linkExistingAgent: boolean;
  retellAgentId: string;
  onReset: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={onReset}
        className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reset defaults
      </button>
      {retellApiConfigured && hasAgent && !remoteAgentMissing ? (
        <button
          type="submit"
          form="pull-retell-voice-agent-form"
          disabled={pending || !retellAgentId.trim()}
          className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import settings
        </button>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <>
            <svg className="size-4 animate-spin text-current" fill="none" viewBox="0 0 24 24" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </>
        ) : !retellApiConfigured ? (
          "Save settings"
        ) : remoteAgentMissing ? (
          "Save & recreate"
        ) : hasAgent ? (
          "Save & sync"
        ) : linkExistingAgent && retellAgentId.trim() ? (
          "Save & sync"
        ) : (
          "Create agent"
        )}
      </button>
    </div>
  );
}

export function VoiceAgentRetellSettings({
  organizationId,
  organizationName,
  retellApiConfigured,
  remoteAgentMissing,
  voiceOptions,
  voiceCatalog,
  initialConfig,
  initialKnowledgeConfig,
  onGoToPhoneTab,
  knowledge,
  onSave,
  onPullFromRetell,
  onGenerateOpeningMessage,
  onGenerateSystemPrompt,
}: {
  organizationId: string;
  organizationName: string;
  retellApiConfigured: boolean;
  remoteAgentMissing: boolean;
  voiceOptions: RetellVoiceSelectOption[];
  voiceCatalog: RetellVoiceListItem[];
  initialConfig: RetellVoiceAgentConfig;
  initialKnowledgeConfig: VoiceAgentKnowledgeConfig;
  phoneConfig: VoiceAgentPhoneConfig;
  onGoToPhoneTab: () => void;
  knowledge: KnowledgeSnapshot;
  onSave: (formData: FormData) => void | Promise<void>;
  onPullFromRetell: (formData: FormData) => void | Promise<void>;
  onGenerateOpeningMessage: (formData: FormData) => Promise<VoiceAgentAiResult>;
  onGenerateSystemPrompt: (formData: FormData) => Promise<VoiceAgentAiResult>;
}) {
  const [config, setConfig] = useState<RetellVoiceAgentConfig>(initialConfig);
  const [knowledgeConfig, setKnowledgeConfig] = useState<VoiceAgentKnowledgeConfig>(initialKnowledgeConfig);
  const [linkExistingAgent, setLinkExistingAgent] = useState(Boolean(initialConfig.retellAgentId.trim()));
  const [activeSection, setActiveSection] = useState<SectionKey>("setup");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGeneratingOpening, startGenerateOpening] = useTransition();
  const [isGeneratingPrompt, startGeneratePrompt] = useTransition();
  const hasAgent = Boolean(config.retellAgentId.trim());
  const agentConfigLocked = false;

  useEffect(() => {
    if (retellApiConfigured && !hasAgent) {
      toast.warning(`No agent for ${organizationName} yet. Finish setup below, then save to create one.`);
    }
  }, [retellApiConfigured, hasAgent, organizationName]);

  function buildGenerateFormData(): FormData {
    const fd = new FormData();
    fd.set("organization_id", organizationId);
    fd.set("agent_name", config.agentName);
    return fd;
  }

  function handleGenerateResult(
    result: VoiceAgentAiResult,
    onSuccess: (text: string) => void,
    successMessage: string,
  ) {
    if (!result.ok) {
      toast.error(GENERATE_ERROR_MESSAGES[result.error] ?? GENERATE_ERROR_MESSAGES.failed);
      return;
    }
    onSuccess(result.text);
    toast.success(successMessage);
  }

  function generateOpeningMessage() {
    startGenerateOpening(async () => {
      const result = await onGenerateOpeningMessage(buildGenerateFormData());
      handleGenerateResult(result, (text) => {
        setConfig((prev) => ({ ...prev, openingMessage: text }));
      }, "Opening message generated from your knowledge base.");
    });
  }

  function generateSystemPrompt() {
    startGeneratePrompt(async () => {
      const result = await onGenerateSystemPrompt(buildGenerateFormData());
      handleGenerateResult(result, (text) => {
        setConfig((prev) => ({ ...prev, systemPrompt: text }));
      }, "System instructions generated from your knowledge base.");
    });
  }

  const selectedVoiceId = resolveRetellVoiceId(config);
  const selectedVoice = useMemo(
    () => voiceCatalog.find((voice) => voice.voiceId === selectedVoiceId) ?? null,
    [selectedVoiceId, voiceCatalog],
  );
  const selectedVoicePreviewUrl = selectedVoice?.previewAudioUrl ?? "";



  function jumpToSection(key: SectionKey) {
    setActiveSection(key);
    scrollToSection(key);
  }

  return (
    <section className="space-y-4">
      {retellApiConfigured ? (
        <form id="pull-retell-voice-agent-form" action={onPullFromRetell} className="hidden">
          <input type="hidden" name="organization_id" value={organizationId} />
          <input type="hidden" name="retell_agent_id" value={config.retellAgentId} />
        </form>
      ) : null}

      <div className={`relative min-h-[28rem] ${agentConfigLocked ? "overflow-hidden rounded-2xl" : ""}`}>
        <div className={agentConfigLocked ? "pointer-events-none select-none" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-5 shadow-[var(--shadow-sm)] lg:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Configuration workspace</p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.015em] text-[var(--color-text)]">Agent settings</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Work through each section, then save and synchronize from the action bar below.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            config.enabled ? "vr-app-status-success" : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
          }`}
        >
          {config.enabled ? "Configuration active" : "Configuration paused"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            remoteAgentMissing
              ? "vr-app-status-warning"
              : hasAgent
              ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
              : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
          }`}
        >
          {remoteAgentMissing ? "Agent missing" : hasAgent ? "Agent connected" : "Agent not linked"}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(knowledge.status)}`}>
          KB: {statusLabel(knowledge.status)}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            knowledgeConfig.enablePhoneBooking
              ? "vr-app-status-success"
              : "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
          }`}
        >
          Voice booking: {knowledgeConfig.enablePhoneBooking ? "On" : "Off"}
        </span>
        {!retellApiConfigured ? (
          <span className="rounded-full bg-[var(--color-raised)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
            Voice service API not configured
          </span>
        ) : null}
        </div>
      </div>

      <nav
        aria-label="Agent configuration sections"
        className="my-4 max-w-full overflow-x-auto"
      >
        <div className="inline-flex min-w-max gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-sm)]">
          {sections.map((section) => {
            const active = activeSection === section.key;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => jumpToSection(section.key)}
                className={`rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--color-bg)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

      <form action={onSave} className="space-y-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="enabled" value="1" />
        <input type="hidden" name="voice_id" value={config.voiceId} />
        <input type="hidden" name="language" value={config.language} />
        <input type="hidden" name="responsiveness" value={String(config.responsiveness)} />
        <input type="hidden" name="interruption_sensitivity" value={String(config.interruptionSensitivity)} />
        <input
          type="hidden"
          name="use_org_knowledge_base"
          value={knowledgeConfig.useOrganizationKnowledgeBase ? "1" : "0"}
        />
        <input
          type="hidden"
          name="require_approved_knowledge_base"
          value={knowledgeConfig.requireApprovedKnowledgeBase ? "1" : "0"}
        />
        <input
          type="hidden"
          name="enable_phone_booking"
          value={knowledgeConfig.enablePhoneBooking ? "1" : "0"}
        />
        {!linkExistingAgent ? <input type="hidden" name="retell_agent_id" value="" /> : null}

        <SectionCard
          sectionKey="setup"
          title="Setup"
          description="Link and configure the voice agent for this organization."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[var(--color-text)]">Display name</span>
              <input
                name="agent_name"
                value={config.agentName}
                onChange={(e) => setConfig((prev) => ({ ...prev, agentName: e.target.value }))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                placeholder={`${organizationName} Support`}
              />
            </label>

            {linkExistingAgent ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[var(--color-text)]">Agent ID</span>
                <input
                  name="retell_agent_id"
                  value={config.retellAgentId}
                  onChange={(e) => setConfig((prev) => ({ ...prev, retellAgentId: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm font-mono"
                  placeholder="agent_xxxxxxxx"
                />
              </label>
            ) : hasAgent ? (
              <div className="block space-y-1.5">
                <span className="text-xs font-semibold text-[var(--color-text)]">Agent ID</span>
                <input
                  name="retell_agent_id"
                  value={config.retellAgentId}
                  readOnly
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm font-mono text-[var(--color-text-muted)]"
                />
              </div>
            ) : (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setLinkExistingAgent(true)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-bg)]"
                >
                  Link existing agent
                </button>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard sectionKey="voice" title="Voice & language" description="Choose how the agent sounds on calls.">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-[var(--color-text)]">Voice</p>
                <CustomSelect
                  value={config.voiceId}
                  onChange={(value) => setConfig((prev) => ({ ...prev, voiceId: value }))}
                  options={voiceOptions}
                  aria-label="Agent voice"
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-[var(--color-text)]">Language</p>
                <CustomSelect
                  value={config.language}
                  onChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      language: value as RetellVoiceAgentConfig["language"],
                    }))
                  }
                  options={RETELL_LANGUAGE_OPTIONS}
                  aria-label="Agent language"
                />
              </div>
              {config.voiceId === RETELL_VOICE_CUSTOM_VALUE ? (
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-[var(--color-text)]">Custom voice ID</span>
                  <input
                    name="custom_voice_id"
                    value={config.customVoiceId}
                    onChange={(e) => setConfig((prev) => ({ ...prev, customVoiceId: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm font-mono"
                    placeholder="11labs-Chloe"
                  />
                </label>
              ) : (
                <input type="hidden" name="custom_voice_id" value={config.customVoiceId} />
              )}
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                Preview
              </p>
              {selectedVoice ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">{selectedVoice.voiceName}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {selectedVoice.accent} · {selectedVoice.gender} · {selectedVoice.provider}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">Select a voice to preview.</p>
              )}
              {selectedVoicePreviewUrl ? (
                <audio
                  key={selectedVoicePreviewUrl}
                  src={selectedVoicePreviewUrl}
                  preload="none"
                  className="mt-3 w-full"
                  controls
                />
              ) : (
                <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                  {config.voiceId === RETELL_VOICE_CUSTOM_VALUE
                    ? "Enter a valid voice ID."
                    : "Preview unavailable for this voice."}
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          sectionKey="conversation"
          title="Conversation"
          description="What callers hear first and how the agent should behave."
        >
          <label className="block space-y-1.5">
            <FieldHeader
              label="Opening message"
              onGenerate={generateOpeningMessage}
              generating={isGeneratingOpening}
              generateLabel="Generate with AI"
            />
            <textarea
              name="opening_message"
              value={config.openingMessage}
              onChange={(e) => setConfig((prev) => ({ ...prev, openingMessage: e.target.value }))}
              rows={2}
              className="w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
              placeholder="Hi, thanks for calling. How can I help you today?"
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              Spoken when the call connects. After editing, click Save so changes go live on your next call.
            </span>
          </label>

          <label className="block space-y-1.5">
            <FieldHeader
              label="System instructions"
              onGenerate={generateSystemPrompt}
              generating={isGeneratingPrompt}
              generateLabel="Generate with AI"
            />
            <textarea
              name="system_prompt"
              value={config.systemPrompt}
              onChange={(e) => setConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))}
              rows={6}
              className="w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
              placeholder="You are a helpful support agent..."
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              Core behavior rules. Generate drafts instructions from your knowledge base; KB content is still appended on save when enabled below.
            </span>
          </label>
        </SectionCard>

        <SectionCard
          sectionKey="knowledge"
          title="Knowledge base"
          description="Business facts, hours, and policies from your organization."
        >
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {knowledge.sourceUrl ? "Website content imported" : "No knowledge imported"}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {knowledge.previewLength > 0
                  ? `${knowledge.previewLength.toLocaleString()} characters`
                  : "Import your site to answer business questions accurately."}
                {knowledge.lastImportedAt
                  ? ` · Updated ${new Date(knowledge.lastImportedAt).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(knowledge.status)}`}>
                {statusLabel(knowledge.status)}
              </span>
              <Link
                href="/appointments/knowledge-base"
                className="rounded-lg border border-[var(--color-border-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
              >
                Edit knowledge
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleRow
              title="Include on calls"
              description="Append KB to instructions when syncing."
              checked={knowledgeConfig.useOrganizationKnowledgeBase}
              onChange={() =>
                setKnowledgeConfig((prev) => ({
                  ...prev,
                  useOrganizationKnowledgeBase: !prev.useOrganizationKnowledgeBase,
                }))
              }
              ariaLabel="Toggle organization knowledge base on calls"
            />
            <ToggleRow
              title="Require approval"
              description="Block sync until KB is approved."
              checked={knowledgeConfig.requireApprovedKnowledgeBase}
              disabled={!knowledgeConfig.useOrganizationKnowledgeBase && !knowledgeConfig.enablePhoneBooking}
              onChange={() =>
                setKnowledgeConfig((prev) => ({
                  ...prev,
                  requireApprovedKnowledgeBase: !prev.requireApprovedKnowledgeBase,
                }))
              }
              ariaLabel="Toggle require approved knowledge base"
            />
          </div>
        </SectionCard>

        <SectionCard
          sectionKey="booking"
          title="Voice booking"
          description="Let callers book appointments during live support calls."
        >
          <div
            className={`rounded-2xl border px-4 py-3 ${
              knowledgeConfig.enablePhoneBooking
                ? "border-emerald-500/25 bg-emerald-500/10"
                : "border-[var(--color-border)] bg-[var(--color-bg)]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {knowledgeConfig.enablePhoneBooking ? "Voice booking is on" : "Voice booking is off"}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {knowledgeConfig.enablePhoneBooking
                    ? "Callers can book appointments on this support line using your chatbot booking flow."
                    : "Turn this on so the phone agent can check availability and create bookings."}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  knowledgeConfig.enablePhoneBooking
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                }`}
              >
                {knowledgeConfig.enablePhoneBooking ? "Visible on calls" : "Hidden on calls"}
              </span>
            </div>
          </div>

          <ToggleRow
            title="Enable voice booking"
            description="Show booking tools on live calls. Uses your Appointments → Chatbot flow, services, calendar, and confirmation emails."
            checked={knowledgeConfig.enablePhoneBooking}
            onChange={() =>
              setKnowledgeConfig((prev) => ({
                ...prev,
                enablePhoneBooking: !prev.enablePhoneBooking,
              }))
            }
            ariaLabel="Toggle voice booking on phone calls"
          />

          {knowledgeConfig.enablePhoneBooking ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              Configure booking steps under{" "}
              <Link href="/appointments/chatbot" className="font-semibold text-[var(--color-primary-h)] underline">
                Appointments → Chatbot
              </Link>
              . Save &amp; sync this agent after changing this setting.
            </p>
          ) : null}
        </SectionCard>

        <SectionCard sectionKey="advanced" title="Advanced" description="Fine-tune how the agent responds on calls.">
          <CollapsibleBlock
            title="Call behavior sliders"
            summary={`Responsiveness ${config.responsiveness.toFixed(2)} · Interruption ${config.interruptionSensitivity.toFixed(2)}`}
            open={showAdvanced}
            onToggle={() => setShowAdvanced((prev) => !prev)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-[var(--color-text)]">
                  Responsiveness ({config.responsiveness.toFixed(2)})
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.responsiveness}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, responsiveness: Number(e.target.value) }))
                  }
                  className="w-full"
                />
                <span className="text-xs text-[var(--color-text-muted)]">Higher = faster replies.</span>
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-[var(--color-text)]">
                  Interruption sensitivity ({config.interruptionSensitivity.toFixed(2)})
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.interruptionSensitivity}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, interruptionSensitivity: Number(e.target.value) }))
                  }
                  className="w-full"
                />
                <span className="text-xs text-[var(--color-text-muted)]">Higher = easier to interrupt.</span>
              </label>
            </div>
          </CollapsibleBlock>
        </SectionCard>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-[var(--shadow-sm)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--color-text-muted)]">
              {retellApiConfigured
                ? remoteAgentMissing
                  ? "Saving recreates the missing agent and relinks this organization."
                  : hasAgent
                  ? "Save pushes voice, conversation, and knowledge to the voice service."
                  : "Save creates your voice agent with these settings."
                : "Settings are saved locally until voice service is connected."}
            </p>
            <SettingsActionButtons
              retellApiConfigured={retellApiConfigured}
              hasAgent={hasAgent}
              remoteAgentMissing={remoteAgentMissing}
              linkExistingAgent={linkExistingAgent}
              retellAgentId={config.retellAgentId}
              onReset={() => {
                setConfig((prev) => ({
                  ...defaultRetellVoiceAgentConfig(),
                  retellAgentId: prev.retellAgentId,
                  enabled: prev.enabled,
                  agentName: prev.agentName,
                }));
                setKnowledgeConfig(defaultVoiceAgentKnowledgeConfig());
              }}
            />
          </div>
        </div>
      </form>
        </div>

        {agentConfigLocked ? <VoiceAgentPhoneGateOverlay onConfigurePhone={onGoToPhoneTab} /> : null}
      </div>
    </section>
  );
}

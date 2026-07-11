"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VoiceAgentPhoneSettings } from "@/components/voice-agent-phone-settings";
import { VoiceAgentRetellSettings } from "@/components/voice-agent-retell-settings";
import { VoiceAgentAnalytics, type CallItem } from "@/components/voice-agent-analytics";
import type { RetellPhoneNumberStats } from "@/lib/retell-phone-analytics";
import type { OrgRetellPhoneNumber } from "@/lib/retell-phone-numbers";
import type { VoiceAgentAiResult } from "@/lib/voice-agent-ai";
import type {
  RetellVoiceAgentConfig,
  RetellVoiceListItem,
  RetellVoiceSelectOption,
  VoiceAgentKnowledgeConfig,
  VoiceAgentPhoneConfig,
} from "@/lib/retell-voice-agent";

type TabKey = "agent" | "phone" | "analytics";

type KnowledgeSnapshot = {
  status: string;
  sourceUrl: string | null;
  previewLength: number;
  previewText: string;
  lastImportedAt: string | null;
};

const allTabs: Array<{ key: TabKey; label: string }> = [
  { key: "agent", label: "Agent & Voice" },
  { key: "phone", label: "Phone & Calling" },
  { key: "analytics", label: "Call Analytics" },
];

function parseTabKey(raw: string | null): TabKey | null {
  if (raw === "agent" || raw === "phone" || raw === "analytics") return raw;
  if (raw === "knowledge") return "agent";
  return null;
}

function resolveDefaultTab(
  canManageAgent: boolean,
  canManagePhone: boolean,
  hasPhoneNumber: boolean,
): TabKey {
  if (!hasPhoneNumber && canManagePhone) return "phone";
  if (canManagePhone && !canManageAgent) return "phone";
  return "agent";
}

function tabAllowed(tab: TabKey, canManageAgent: boolean, canManagePhone: boolean): boolean {
  if (tab === "agent") return canManageAgent;
  if (tab === "phone") return canManagePhone;
  return true;
}

export function VoiceAgentTabs({
  organizationId,
  organizationName,
  canManageAgent,
  canManagePhone,
  retellApiConfigured,
  voiceOptions,
  voiceCatalog,
  retellConfig,
  phoneConfig,
  phones,
  phoneStats,
  knowledgeConfig,
  knowledge,
  calls,
  onSaveRetell,
  onSavePhone,
  onBuyPhone,
  onLinkPhone,
  onAssignPhone,
  onSetPrimaryPhone,
  onRefreshPhones,
  onPullFromRetell,
  onGenerateOpeningMessage,
  onGenerateSystemPrompt,
}: {
  organizationId: string;
  organizationName: string;
  canManageAgent: boolean;
  canManagePhone: boolean;
  retellApiConfigured: boolean;
  voiceOptions: RetellVoiceSelectOption[];
  voiceCatalog: RetellVoiceListItem[];
  retellConfig: RetellVoiceAgentConfig;
  phoneConfig: VoiceAgentPhoneConfig;
  phones: OrgRetellPhoneNumber[];
  phoneStats: RetellPhoneNumberStats[];
  knowledgeConfig: VoiceAgentKnowledgeConfig;
  knowledge: KnowledgeSnapshot;
  calls: CallItem[];
  onSaveRetell: (formData: FormData) => void | Promise<void>;
  onSavePhone: (formData: FormData) => void | Promise<void>;
  onBuyPhone: (formData: FormData) => void | Promise<void>;
  onLinkPhone: (formData: FormData) => void | Promise<void>;
  onAssignPhone: (formData: FormData) => void | Promise<void>;
  onSetPrimaryPhone: (formData: FormData) => void | Promise<void>;
  onRefreshPhones: (formData: FormData) => void | Promise<void>;
  onPullFromRetell: (formData: FormData) => void | Promise<void>;
  onGenerateOpeningMessage: (formData: FormData) => Promise<VoiceAgentAiResult>;
  onGenerateSystemPrompt: (formData: FormData) => Promise<VoiceAgentAiResult>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasPhoneNumber =
    phones.length > 0 || Boolean(phoneConfig.twilioPhoneNumber.trim());
  const defaultTab = resolveDefaultTab(canManageAgent, canManagePhone, hasPhoneNumber);
  const tabs = allTabs.filter((tab) => tabAllowed(tab.key, canManageAgent, canManagePhone));
  const requestedTab = parseTabKey(searchParams.get("tab"));
  const activeTab =
    requestedTab && tabAllowed(requestedTab, canManageAgent, canManagePhone)
      ? requestedTab
      : defaultTab;

  function selectTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/voice-agent?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === null) return;

    const parsed = parseTabKey(tabParam);
    if (parsed && tabAllowed(parsed, canManageAgent, canManagePhone)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", defaultTab);
    router.replace(`/voice-agent?${params.toString()}`, { scroll: false });
  }, [canManageAgent, canManagePhone, defaultTab, router, searchParams]);

  return (
    <section className="space-y-4">
      {tabs.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                    : "bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)] border border-[var(--color-border)]"
                }`}
              >
                {tab.label}
                {tab.key === "agent" && !hasPhoneNumber ? (
                  <span className="ml-1.5 text-[11px] font-medium opacity-80">· phone first</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {activeTab === "agent" && canManageAgent ? (
        <VoiceAgentRetellSettings
          organizationId={organizationId}
          organizationName={organizationName}
          retellApiConfigured={retellApiConfigured}
          voiceOptions={voiceOptions}
          voiceCatalog={voiceCatalog}
          initialConfig={retellConfig}
          initialKnowledgeConfig={knowledgeConfig}
          phoneConfig={phoneConfig}
          onGoToPhoneTab={() => selectTab("phone")}
          knowledge={knowledge}
          onSave={onSaveRetell}
          onPullFromRetell={onPullFromRetell}
          onGenerateOpeningMessage={onGenerateOpeningMessage}
          onGenerateSystemPrompt={onGenerateSystemPrompt}
        />
      ) : null}

      {activeTab === "phone" && canManagePhone ? (
        <VoiceAgentPhoneSettings
          organizationId={organizationId}
          initialConfig={phoneConfig}
          retellAgentId={retellConfig.retellAgentId}
          retellApiConfigured={retellApiConfigured}
          phones={phones}
          phoneStats={phoneStats}
          onBuy={onBuyPhone}
          onLink={onLinkPhone}
          onAssign={onAssignPhone}
          onSetPrimary={onSetPrimaryPhone}
          onRefresh={onRefreshPhones}
        />
      ) : null}

      {activeTab === "analytics" ? (
        <VoiceAgentAnalytics calls={calls} />
      ) : null}
    </section>
  );
}

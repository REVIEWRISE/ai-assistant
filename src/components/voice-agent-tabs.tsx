"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VoiceAgentPhoneSettings } from "@/components/voice-agent-phone-settings";
import { VoiceAgentRetellSettings } from "@/components/voice-agent-retell-settings";
import type { VoiceAgentAiResult } from "@/lib/voice-agent-ai";
import type {
  RetellVoiceAgentConfig,
  RetellVoiceListItem,
  RetellVoiceSelectOption,
  VoiceAgentKnowledgeConfig,
  VoiceAgentPhoneConfig,
} from "@/lib/retell-voice-agent";

type TabKey = "agent" | "phone";

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
];

function parseTabKey(raw: string | null): TabKey | null {
  if (raw === "agent" || raw === "phone" || raw === "knowledge") return raw === "knowledge" ? "agent" : raw;
  return null;
}

export function VoiceAgentTabs({
  organizationId,
  organizationName,
  canManagePhone,
  retellApiConfigured,
  voiceOptions,
  voiceCatalog,
  retellConfig,
  phoneConfig,
  knowledgeConfig,
  knowledge,
  onSaveRetell,
  onSavePhone,
  onPullFromRetell,
  onGenerateOpeningMessage,
  onGenerateSystemPrompt,
}: {
  organizationId: string;
  organizationName: string;
  canManagePhone: boolean;
  retellApiConfigured: boolean;
  voiceOptions: RetellVoiceSelectOption[];
  voiceCatalog: RetellVoiceListItem[];
  retellConfig: RetellVoiceAgentConfig;
  phoneConfig: VoiceAgentPhoneConfig;
  knowledgeConfig: VoiceAgentKnowledgeConfig;
  knowledge: KnowledgeSnapshot;
  onSaveRetell: (formData: FormData) => void | Promise<void>;
  onSavePhone: (formData: FormData) => void | Promise<void>;
  onPullFromRetell: (formData: FormData) => void | Promise<void>;
  onGenerateOpeningMessage: (formData: FormData) => Promise<VoiceAgentAiResult>;
  onGenerateSystemPrompt: (formData: FormData) => Promise<VoiceAgentAiResult>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabs = canManagePhone ? allTabs : allTabs.filter((tab) => tab.key !== "phone");
  const requestedTab = parseTabKey(searchParams.get("tab"));
  const activeTab =
    requestedTab === "phone" && !canManagePhone ? "agent" : requestedTab ?? "agent";

  useEffect(() => {
    if (requestedTab === "phone" && !canManagePhone) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      const query = params.toString();
      router.replace(query ? `/voice-agent?${query}` : "/voice-agent", { scroll: false });
    }
  }, [canManagePhone, requestedTab, router, searchParams]);

  function selectTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "agent") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(query ? `/voice-agent?${query}` : "/voice-agent", { scroll: false });
  }

  return (
    <section className="space-y-4">
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
            </button>
          );
        })}
      </div>

      {activeTab === "agent" ? (
        <VoiceAgentRetellSettings
          organizationId={organizationId}
          organizationName={organizationName}
          retellApiConfigured={retellApiConfigured}
          voiceOptions={voiceOptions}
          voiceCatalog={voiceCatalog}
          initialConfig={retellConfig}
          initialKnowledgeConfig={knowledgeConfig}
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
          onSave={onSavePhone}
        />
      ) : null}
    </section>
  );
}

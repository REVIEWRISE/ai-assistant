"use client";

import { useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { ReviewServiceManager } from "@/components/review-service-manager";
import { ReviewRoutingSettings } from "@/components/review-routing-settings";
import { ReviewSyncCronSettings } from "@/components/review-sync-cron-settings";
import type { ReviewRoutingRules } from "@/lib/review-routing";
import type { ReviewSyncCronConfig } from "@/lib/review-sync-cron";
import type { ReviewReplyAutomationConfig } from "@/lib/review-reply-automation";

type InboxItem = {
  id: string;
  rating: string;
  quote: string;
  response: string;
  source: string;
  tone: string;
  status: string;
};

const inboxTableGridClass =
  "md:grid-cols-[minmax(0,0.95fr)_88px_minmax(0,1.35fr)_minmax(0,1.1fr)_minmax(0,148px)_96px]";

type ReviewActionKind = "replied" | "auto_ready" | "needs_review" | "manual_approval";

function getReviewActionKind(status: string): ReviewActionKind {
  if (status.startsWith("Replied on ")) return "replied";
  if (status === "Safe to auto-publish") return "auto_ready";
  if (status === "Needs human review") return "needs_review";
  return "manual_approval";
}

function reviewHasDraftResponse(response: string): boolean {
  return response.trim().toLowerCase() !== "no drafted response yet.";
}

function responsePanelTitle(status: string): string {
  if (status.startsWith("Replied on ")) {
    return status.replace("Replied on ", "Reply on ");
  }
  return "Suggested Response";
}

type ReviewService = {
  id: string;
  name: string;
  logoUrl?: string;
  type: string;
  status: string;
  left: string;
  lastSync: string;
  autoReply: string;
  syncable: boolean;
  oauthConnectHref?: string;
  requiredFields: Array<{
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
    secret: boolean;
  }>;
  existingConnectionDetails: Record<string, string>;
  tone: string;
};

type PendingItem = {
  source: string;
  pending: string;
  autoReady: string;
};

type TabKey = "integrations" | "workflow" | "configuration";

function parseTabKey(raw: string | null): TabKey | null {
  if (raw === "integrations" || raw === "workflow" || raw === "configuration") {
    return raw;
  }
  return null;
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "workflow", label: "Inbox" },
  { key: "integrations", label: "Integrations" },
  { key: "configuration", label: "Automation" },
];

function TabSectionHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.015em] text-[var(--color-text)]">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

type ReviewsTabsProps = {
  readOnly?: boolean;
  defaultTab?: TabKey;
  organizationId: string;
  organizationName: string;
  routingRules: ReviewRoutingRules;
  syncCronConfig: ReviewSyncCronConfig;
  replyAutomation: ReviewReplyAutomationConfig;
  reviewServices: ReviewService[];
  pendingBySource: PendingItem[];
  inbox: InboxItem[];
  onConnectProvider: (formData: FormData) => void | Promise<void>;
  onSyncProvider: (formData: FormData) => void | Promise<void>;
  onSaveRoutingRules: (formData: FormData) => void | Promise<void>;
  onSaveSyncCron: (formData: FormData) => void | Promise<void>;
  onSaveReviewDraft: (
    organizationId: string,
    reviewId: string,
    responseText: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onPublishReviewReply: (
    organizationId: string,
    reviewId: string,
    responseText: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function ReviewsTabs({
  readOnly = false,
  defaultTab = "integrations",
  organizationId,
  organizationName,
  routingRules,
  syncCronConfig,
  replyAutomation,
  reviewServices,
  pendingBySource,
  inbox,
  onConnectProvider,
  onSyncProvider,
  onSaveRoutingRules,
  onSaveSyncCron,
  onSaveReviewDraft,
  onPublishReviewReply,
}: ReviewsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseTabKey(searchParams.get("tab")) ?? defaultTab;
  const [selectedReview, setSelectedReview] = useState<InboxItem | null>(null);
  const [draftText, setDraftText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const connectedSourceCount = reviewServices.filter((service) => service.status === "Connected").length;
  const pendingReviewCount = inbox.length;
  const humanReviewCount = inbox.filter((review) => review.status === "Needs human review").length;
  const autoReadyCount = inbox.filter((review) => review.status === "Safe to auto-publish").length;
  const assistantReady = connectedSourceCount > 0;
  const presenceLabel = !assistantReady
    ? "Not connected"
    : pendingReviewCount > 0
      ? "Needs attention"
      : "On duty";
  const identityLine = !assistantReady
    ? `${organizationName} · Ready to set up`
    : `${organizationName} · Your review assistant`;
  const assistantInfo = !assistantReady
    ? "Connect a review source so this assistant can draft and publish replies for your brand."
    : pendingReviewCount > 0
      ? `${pendingReviewCount} review${pendingReviewCount === 1 ? "" : "s"} waiting — draft, approve, or publish from the inbox.`
      : "Watching connected sources and keeping replies consistent with your voice.";
  const waveformBars = [8, 14, 20, 12, 18, 10, 16];
  const syncLabel = syncCronConfig.enabled ? "Scheduled" : "Manual";

  function openReview(review: InboxItem) {
    setSelectedReview(review);
    setDraftText(reviewHasDraftResponse(review.response) ? review.response : "");
    setIsEditing(false);
    setActionError(null);
  }

  function closeReview() {
    setSelectedReview(null);
    setDraftText("");
    setIsEditing(false);
    setActionError(null);
  }

  function selectTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === defaultTab) {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `/reviews?${query}` : "/reviews", { scroll: false });
  }

  const getStatusTone = (status: string): string => {
    if (status === "Safe to auto-publish" || status.startsWith("Replied on ")) {
      return "vr-app-status-success";
    }
    if (status === "Needs human review") {
      return "vr-app-status-danger";
    }
    return "vr-app-status-warning";
  };

  function handleSaveDraft() {
    if (!selectedReview) return;
    const text = draftText.trim();
    if (!text) {
      setActionError("Enter a response before saving.");
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const result = await onSaveReviewDraft(organizationId, selectedReview.id, text);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setSelectedReview({ ...selectedReview, response: text });
      setIsEditing(false);
      router.refresh();
    });
  }

  function handlePublishReply() {
    if (!selectedReview) return;
    const text = draftText.trim();
    if (!text) {
      setActionError("Draft a response before sending.");
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const result = await onPublishReviewReply(organizationId, selectedReview.id, text);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      closeReview();
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
        <div className="relative overflow-hidden bg-[linear-gradient(160deg,#0c0c0c_0%,#171717_48%,#222222_100%)] px-5 pb-5 pt-7 text-white sm:px-6 sm:pt-8">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.1),transparent_60%)]"
            aria-hidden
          />

          <div className="relative flex flex-col items-center text-center">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="flex h-12 items-end gap-[3px]" aria-hidden>
                {waveformBars.map((height, index) => (
                  <span
                    key={`wave-l-${index}`}
                    className={`w-[2.5px] rounded-full ${
                      assistantReady ? "bg-white/45" : "bg-white/18"
                    }`}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>

              <div className="relative">
                <span className="flex size-[4.75rem] items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.8)]">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M8 9h8M8 13h5" />
                  </svg>
                </span>
                <span
                  className={`absolute bottom-1 right-1 size-3.5 rounded-full border-2 border-[#161616] ${
                    !assistantReady
                      ? "bg-neutral-500"
                      : pendingReviewCount > 0
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }`}
                  title={presenceLabel}
                  aria-label={presenceLabel}
                />
              </div>

              <div className="flex h-12 items-end gap-[3px]" aria-hidden>
                {[...waveformBars].reverse().map((height, index) => (
                  <span
                    key={`wave-r-${index}`}
                    className={`w-[2.5px] rounded-full ${
                      assistantReady ? "bg-white/45" : "bg-white/18"
                    }`}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </div>

            <h2 className="mt-4 text-[1.4rem] font-semibold tracking-[-0.025em] text-white sm:text-[1.55rem]">
              {organizationName} replies
            </h2>
            <p className="mt-1.5 text-[13px] text-neutral-400">{identityLine}</p>
            <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-neutral-500">
              {assistantInfo}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  !assistantReady
                    ? "border-white/15 bg-white/10 text-neutral-300"
                    : pendingReviewCount > 0
                      ? "border-amber-400/30 bg-amber-400/15 text-amber-100"
                      : "border-emerald-400/30 bg-emerald-400/15 text-emerald-100"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    !assistantReady
                      ? "bg-neutral-400"
                      : pendingReviewCount > 0
                        ? "bg-amber-300"
                        : "bg-emerald-300"
                  }`}
                  aria-hidden
                />
                {presenceLabel}
              </span>
            </div>

            {!readOnly ? (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => selectTab(assistantReady ? "workflow" : "integrations")}
                  className="rounded-xl bg-white px-3.5 py-2 text-[12px] font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  {assistantReady
                    ? pendingReviewCount > 0
                      ? `Open inbox · ${pendingReviewCount}`
                      : "Open inbox"
                    : "Connect source"}
                </button>
                <button
                  type="button"
                  onClick={() => selectTab("integrations")}
                  className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-white/15"
                >
                  Integrations
                </button>
                <button
                  type="button"
                  onClick={() => selectTab("configuration")}
                  className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-white/15"
                >
                  Automation
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 16.8 5.7 21l2.3-7-6-4.8h7.6z" />
                </svg>
              </span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Sources</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">
                {connectedSourceCount} connected
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Awaiting</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">{pendingReviewCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Auto-ready</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">{autoReadyCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">AI drafts</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">
                {replyAutomation.draftOnSync ? "On" : "Off"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3.5 text-left">
              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                  <path d="M21 3v6h-6" />
                </svg>
              </span>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Sync</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">{syncLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1" role="tablist" aria-label="Review operations">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(tab.key)}
                className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--color-bg)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {readOnly ? (
          <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
            View-only access
          </span>
        ) : null}
      </div>

      {activeTab === "integrations" ? (
        <div className="space-y-5">
          <ReviewServiceManager
            services={reviewServices}
            readOnly={readOnly}
            onConnectProvider={onConnectProvider}
            onSyncProvider={onSyncProvider}
          />
          <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
            <TabSectionHeader
              eyebrow="Source workload"
              title="Pending by review source"
              description="See where response work is accumulating across connected reputation channels."
              aside={
                <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                  {connectedSourceCount}/{reviewServices.length} connected
                </span>
              }
            />
            <div className="p-4 lg:p-5">
            {pendingBySource.length === 0 ? (
              <div className="rounded-2xl vr-app-alert vr-app-alert-warning p-4 text-sm text-inherit">
                <p className="font-semibold">No review sources found.</p>
                <p className="mt-1 text-xs text-inherit opacity-90">
                  In Platform → Providers, enable a provider with type Review. It will appear here even before
                  you connect it.
                </p>
              </div>
            ) : pendingBySource.every((item) => Number(item.pending) === 0) ? (
              <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-center">
                <div>
                  <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-[var(--color-success-soft)] text-sm font-bold text-[var(--color-success)]">✓</span>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">All connected inboxes are clear</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">Run a sync from a connected source to check for new reviews.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 text-sm text-[var(--color-text)] sm:grid-cols-2 xl:grid-cols-3">
                {pendingBySource.map((item) => (
                  <div
                    key={item.source}
                    className="flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
                  >
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{item.source}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{item.autoReady}</p>
                    </div>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-raised)] text-sm font-semibold tabular-nums text-[var(--color-text)]">
                      {item.pending}
                    </span>
                  </div>
                ))}
              </div>
            )}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "workflow" ? (
        <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
          <TabSectionHeader
            eyebrow="Response queue"
            title="Review inbox"
            description="Review suggested responses in priority order, with source, rating, and risk visible at a glance."
            aside={
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                  {pendingReviewCount} in inbox
                </span>
                <span className="rounded-full vr-app-status-danger px-3 py-1.5 text-xs font-semibold">
                  {humanReviewCount} need review
                </span>
                <span className="rounded-full vr-app-status-success px-3 py-1.5 text-xs font-semibold">
                  {autoReadyCount} auto-ready
                </span>
              </div>
            }
          />
          <div className="p-4 lg:p-5">
              {inbox.length === 0 ? (
                <div className="flex min-h-36 flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-sm">
                  <div>
                    <p className="font-semibold text-[var(--color-text)]">Your review inbox is clear</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Connect a review provider and run sync to populate pending reviews.
                    </p>
                  </div>
                  <button type="button" onClick={() => selectTab("integrations")} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]">
                    Manage sources
                  </button>
                </div>
              ) : null}
              {inbox.length > 0 ? (
                <div className="space-y-3 md:hidden">
                  {inbox.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-[var(--color-border)] p-3 text-sm"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-semibold text-[var(--color-text)]">
                          {review.source} • {review.rating}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(review.status)}`}
                        >
                          {review.status}
                        </span>
                      </div>
                      <p className="text-[var(--color-text)]">&quot;{review.quote}&quot;</p>
                      <div className="mt-2 rounded-lg bg-[var(--color-surface)] p-2 text-xs text-[var(--color-text-muted)]">
                        {review.response}
                      </div>
                      <button
                        type="button"
                        onClick={() => openReview(review)}
                        className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                      >
                        {readOnly ? "View" : "Review"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {inbox.length > 0 ? (
                <div className="hidden overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] md:block">
                  <div
                    className={`vr-app-table-header hidden items-center gap-3 px-4 py-3 md:grid ${inboxTableGridClass}`}
                  >
                    <div>Source</div>
                    <div>Rating</div>
                    <div>Review</div>
                    <div>Response</div>
                    <div>Status</div>
                    <div className="text-right">Action</div>
                  </div>
                  <div className="divide-y divide-[var(--color-border-muted)]">
                    {inbox.map((review) => (
                      <div
                        key={review.id}
                        className={`group grid items-start gap-3 px-4 py-3 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface)] md:items-center ${inboxTableGridClass}`}
                      >
                        <div className="min-w-0 font-semibold">{review.source}</div>
                        <div className="whitespace-nowrap text-[var(--color-warning)]">{review.rating}</div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 leading-relaxed" title={review.quote}>
                            &quot;{review.quote}&quot;
                          </p>
                        </div>
                        <div className="min-w-0 text-[var(--color-text-muted)]">
                          <p className="line-clamp-2 leading-relaxed" title={review.response}>
                            {review.response}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <span
                            className={`inline-flex max-w-full whitespace-normal rounded-full px-2.5 py-1 text-xs font-semibold leading-snug ${getStatusTone(review.status)}`}
                          >
                            {review.status}
                          </span>
                        </div>
                        <div className="flex justify-start md:justify-end">
                          <button
                            type="button"
                            onClick={() => openReview(review)}
                            className="rounded-lg border border-[var(--color-border-hover)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] group-hover:border-[var(--color-border)]"
                          >
                            {readOnly ? "View" : "Review"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "configuration" ? (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
            <TabSectionHeader
              eyebrow="Automation control"
              title="Review response policy"
              description="Control when reviews are collected, when AI drafts a response, and which ratings require human approval."
              aside={
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${syncCronConfig.enabled ? "vr-app-status-success" : "vr-app-status-muted"}`}>
                    Sync {syncCronConfig.enabled ? "enabled" : "off"}
                  </span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${replyAutomation.draftOnSync ? "vr-app-status-success" : "vr-app-status-muted"}`}>
                    AI drafts {replyAutomation.draftOnSync ? "enabled" : "off"}
                  </span>
                </div>
              }
            />
            <div className="grid gap-3 p-4 text-sm sm:grid-cols-3 lg:p-5">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">1 · Collect</p>
                <p className="mt-2 font-semibold text-[var(--color-text)]">Sync new reviews</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">Pull reputation activity on a controlled schedule.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">2 · Prepare</p>
                <p className="mt-2 font-semibold text-[var(--color-text)]">Generate response drafts</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">Create consistent replies as reviews enter the inbox.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">3 · Route</p>
                <p className="mt-2 font-semibold text-[var(--color-text)]">Apply approval rules</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">Send each rating to the right publishing workflow.</p>
              </div>
            </div>
          </section>
          <div className="grid items-start gap-5 xl:grid-cols-2">
          <ReviewSyncCronSettings
            readOnly={readOnly}
            organizationId={organizationId}
            initialConfig={syncCronConfig}
            initialReplyAutomation={replyAutomation}
            onSave={onSaveSyncCron}
          />
          <ReviewRoutingSettings
            readOnly={readOnly}
            organizationId={organizationId}
            initialRules={routingRules}
            onSave={onSaveRoutingRules}
          />
          </div>
        </div>
      ) : null}

      {typeof document !== "undefined" && selectedReview
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-overlay)] p-4">
              <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]">
                <div className="vr-app-table-header flex items-start justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] opacity-90">
                      {selectedReview.source} • {selectedReview.rating}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-white">Review Response Workspace</h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeReview}
                    className="rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>

            <div className="space-y-4 p-5 text-sm text-[var(--color-text)]">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Current Status
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(selectedReview.status)}`}
                >
                  {selectedReview.status}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Customer Review
                  </p>
                  <p className="mt-2 leading-relaxed">&quot;{selectedReview.quote}&quot;</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    {responsePanelTitle(selectedReview.status)}
                  </p>
                  {isEditing && !readOnly ? (
                    <textarea
                      value={draftText}
                      onChange={(event) => setDraftText(event.target.value)}
                      rows={6}
                      disabled={isPending}
                      placeholder="Write your reply to this review…"
                      className="mt-2 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm leading-relaxed text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                    />
                  ) : (
                    <p className="mt-2 leading-relaxed">
                      {reviewHasDraftResponse(selectedReview.response)
                        ? selectedReview.response
                        : draftText.trim() || selectedReview.response}
                    </p>
                  )}
                </div>
              </div>

              {actionError ? (
                <p className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
                  {actionError}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Source: {selectedReview.source} • Rating: {selectedReview.rating}
                </p>
                {(() => {
                  const actionKind = getReviewActionKind(selectedReview.status);
                  const hasDraft = Boolean(draftText.trim()) || reviewHasDraftResponse(selectedReview.response);

                  if (actionKind === "replied") {
                    return (
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">
                        Already replied on {selectedReview.source} — no further action needed.
                      </p>
                    );
                  }

                  if (readOnly) {
                    return (
                      <span className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                        View only
                      </span>
                    );
                  }

                  return (
                    <div className="flex flex-wrap justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setIsEditing(false);
                              setDraftText(
                                reviewHasDraftResponse(selectedReview.response)
                                  ? selectedReview.response
                                  : "",
                              );
                              setActionError(null);
                            }}
                            className="rounded-lg border border-[var(--color-border-hover)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isPending || !draftText.trim()}
                            onClick={handleSaveDraft}
                            className="rounded-lg border border-[var(--color-border-hover)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isPending ? "Saving…" : "Save draft"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setIsEditing(true)}
                          className="rounded-lg border border-[var(--color-border-hover)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:opacity-50"
                        >
                          Edit Response
                        </button>
                      )}
                      {actionKind === "needs_review" ? (
                        <button
                          type="button"
                          disabled={isPending || !hasDraft}
                          title={hasDraft ? undefined : "Draft a response before sending"}
                          onClick={handlePublishReply}
                          className="rounded-lg vr-btn-primary px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPending ? "Sending…" : "Send after review"}
                        </button>
                      ) : null}
                      {actionKind === "manual_approval" ? (
                        <button
                          type="button"
                          disabled={isPending || !hasDraft}
                          title={hasDraft ? undefined : "Draft a response before approving"}
                          onClick={handlePublishReply}
                          className="rounded-lg vr-btn-primary px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPending ? "Sending…" : "Approve and Send"}
                        </button>
                      ) : null}
                      {actionKind === "auto_ready" ? (
                        <button
                          type="button"
                          disabled={isPending || !hasDraft}
                          title={hasDraft ? undefined : "Draft a response before sending"}
                          onClick={handlePublishReply}
                          className="rounded-lg vr-btn-primary px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPending ? "Sending…" : "Approve and Auto-Send"}
                        </button>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReviewServiceManager } from "@/components/review-service-manager";
import { ReviewRoutingSettings } from "@/components/review-routing-settings";
import { ReviewSyncCronSettings } from "@/components/review-sync-cron-settings";
import { Panel } from "@/components/ui";
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

type TabKey = "integrations" | "workflow" | "analytics" | "configuration";

function parseTabKey(raw: string | null): TabKey | null {
  if (
    raw === "integrations" ||
    raw === "workflow" ||
    raw === "analytics" ||
    raw === "configuration"
  ) {
    return raw;
  }
  return null;
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "workflow", label: "Inbox" },
  { key: "integrations", label: "Integrations" },
  { key: "analytics", label: "Performance" },
  { key: "configuration", label: "Automation" },
];

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <div className="mt-1 space-y-1">
        {payload.map((entry) => (
          <p key={`${entry.name}-${entry.value}`} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color ?? "#94a3b8" }}
            />
            <span className="font-medium text-[var(--color-text)]">{entry.name}:</span>
            <span className="font-semibold text-[var(--color-text)]">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function TrendLineChart({
  points,
}: {
  points: Array<{ day: string; count: number }>;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" />
            <XAxis dataKey="day" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
            <YAxis tick={{ fill: "var(--color-text-subtle)", fontSize: 12 }} />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--color-border-hover)", strokeDasharray: "4 4" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Auto-published"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 5, fill: "#6366f1" }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ServiceBarChart({
  items,
}: {
  items: Array<{ service: string; total: number; autoPublished: number }>;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={items}
            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            barGap={6}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" />
            <XAxis dataKey="service" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
            <YAxis tick={{ fill: "var(--color-text-subtle)", fontSize: 12 }} />
            <Tooltip
              content={<ChartTooltip />}
            />
            <Bar dataKey="total" name="Total reviews" fill="#6366f1" radius={[6, 6, 0, 0]} />
            <Bar
              dataKey="autoPublished"
              name="Auto-published"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 font-semibold text-[var(--color-primary-h)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
          Total reviews
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-success-soft)] px-3 py-1.5 font-semibold text-[var(--color-success)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
          Auto-published
        </span>
      </div>
    </div>
  );
}

type ReviewsTabsProps = {
  defaultTab?: TabKey;
  organizationId: string;
  routingRules: ReviewRoutingRules;
  syncCronConfig: ReviewSyncCronConfig;
  replyAutomation: ReviewReplyAutomationConfig;
  reviewServices: ReviewService[];
  pendingBySource: PendingItem[];
  inbox: InboxItem[];
  performance: Array<{ label: string; value: string; delta: string }>;
  autoPublishedTrend: Array<{ day: string; count: number }>;
  serviceReviewVolume: Array<{ service: string; total: number; autoPublished: number }>;
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
  defaultTab = "integrations",
  organizationId,
  routingRules,
  syncCronConfig,
  replyAutomation,
  reviewServices,
  pendingBySource,
  inbox,
  performance,
  autoPublishedTrend,
  serviceReviewVolume,
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
  const hasReviewActivity = performance.some((metric) => Number(metric.value) > 0);

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

      {activeTab === "integrations" ? (
        <div className="space-y-4">
          <ReviewServiceManager
            services={reviewServices}
            onConnectProvider={onConnectProvider}
            onSyncProvider={onSyncProvider}
          />
          <Panel
            title="Pending by Review Source"
            subtitle="Remaining reviews by connected service"
          >
            {pendingBySource.length === 0 ? (
              <div className="rounded-xl border vr-app-alert vr-app-alert-warning border-0 p-3 text-sm text-inherit">
                <p className="font-semibold">No review sources found.</p>
                <p className="mt-1 text-xs text-inherit opacity-90">
                  In Platform → Providers, enable a provider with type Review. It will appear here even before
                  you connect it.
                </p>
              </div>
            ) : pendingBySource.every((item) => Number(item.pending) === 0) ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-semibold text-[var(--color-text)]">All connected inboxes are clear</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Run a sync from a connected source to check for new reviews.</p>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-[var(--color-text)]">
                {pendingBySource.map((item) => (
                  <div
                    key={item.source}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3"
                  >
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{item.source}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{item.autoReady}</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)]">
                      {item.pending}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === "workflow" ? (
        <div className="space-y-4">
          <div>
            <Panel
              title="Review Inbox"
              subtitle="Prioritized by source, sentiment, rating, and risk"
            >
              {inbox.length === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
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
                        className="mt-3 rounded-lg border border-[var(--color-border-hover)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                      >
                        Open
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
                            Open
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Panel>
          </div>

        </div>
      ) : null}

      {activeTab === "analytics" ? (
        <div className="space-y-4">
          <Panel title="Performance Snapshot" subtitle="This week compared to last week">
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              {performance.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-[var(--color-border)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text)]">{metric.value}</p>
                  <p
                    className={
                      metric.delta.startsWith("+") ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"
                    }
                  >
                    {metric.delta}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel
              title="Auto-Published Reviews Trend"
              subtitle="Last 7 days of automatically published responses"
            >
              {hasReviewActivity ? (
                <TrendLineChart points={autoPublishedTrend} />
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
                  <p className="text-sm font-semibold text-[var(--color-text)]">No publishing activity yet</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">Trend data appears after reviews are synced and responses are sent.</p>
                </div>
              )}
            </Panel>

            <Panel
              title="Reviews by Service"
              subtitle="Focus where review volume is highest"
            >
              {serviceReviewVolume.length > 0 ? (
                <ServiceBarChart items={serviceReviewVolume} />
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
                  <p className="text-sm font-semibold text-[var(--color-text)]">No source volume yet</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">Connect and sync a review source to compare volume.</p>
                </div>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === "configuration" ? (
        <div className="space-y-4">
          <ReviewSyncCronSettings
            organizationId={organizationId}
            initialConfig={syncCronConfig}
            initialReplyAutomation={replyAutomation}
            onSave={onSaveSyncCron}
          />
          <ReviewRoutingSettings
            organizationId={organizationId}
            initialRules={routingRules}
            onSave={onSaveRoutingRules}
          />
        </div>
      ) : null}

      {typeof document !== "undefined" && selectedReview
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] p-4">
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
                  {isEditing ? (
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

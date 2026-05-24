"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
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
import { Panel } from "@/components/ui";

type InboxItem = {
  rating: string;
  quote: string;
  response: string;
  source: string;
  tone: string;
  status: string;
};

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

type TabKey = "integrations" | "workflow" | "analytics";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "integrations", label: "Integrations" },
  { key: "workflow", label: "Inbox & Responses" },
  { key: "analytics", label: "Analytics" },
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
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <div className="mt-1 space-y-1">
        {payload.map((entry) => (
          <p key={`${entry.name}-${entry.value}`} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color ?? "#94a3b8" }}
            />
            <span className="font-medium text-slate-700">{entry.name}:</span>
            <span className="font-semibold text-slate-900">{entry.value}</span>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Auto-published"
              stroke="#0284c7"
              strokeWidth={3}
              dot={{ r: 5, fill: "#0284c7" }}
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={items}
            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            barGap={6}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
            <XAxis dataKey="service" tick={{ fill: "#475569", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip
              content={<ChartTooltip />}
            />
            <Bar dataKey="total" name="Total reviews" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            <Bar
              dataKey="autoPublished"
              name="Auto-published"
              fill="#14b8a6"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 font-semibold text-sky-700">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          Total reviews
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1.5 font-semibold text-teal-700">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
          Auto-published
        </span>
      </div>
    </div>
  );
}

type ReviewsTabsProps = {
  reviewServices: ReviewService[];
  pendingBySource: PendingItem[];
  inbox: InboxItem[];
  performance: Array<{ label: string; value: string; delta: string }>;
  autoPublishedTrend: Array<{ day: string; count: number }>;
  serviceReviewVolume: Array<{ service: string; total: number; autoPublished: number }>;
  onConnectProvider: (formData: FormData) => void | Promise<void>;
  onSyncProvider: (formData: FormData) => void | Promise<void>;
};

export function ReviewsTabs({
  reviewServices,
  pendingBySource,
  inbox,
  performance,
  autoPublishedTrend,
  serviceReviewVolume,
  onConnectProvider,
  onSyncProvider,
}: ReviewsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("integrations");
  const [selectedReview, setSelectedReview] = useState<InboxItem | null>(null);

  const getStatusTone = (status: string): string => {
    if (status === "Safe to auto-publish") {
      return "bg-emerald-100 text-emerald-700";
    }
    if (status === "Needs human review") {
      return "bg-rose-100 text-rose-700";
    }
    return "bg-amber-100 text-amber-700";
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
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
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">No review sources found.</p>
                <p className="mt-1 text-xs text-amber-800">
                  Add and enable review providers, then sync reviews to see pending counts here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-700">
                {pendingBySource.map((item) => (
                  <div
                    key={item.source}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{item.source}</p>
                      <p className="text-xs text-slate-500">{item.autoReady}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
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
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-semibold">No reviews in inbox yet.</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Connect a review provider and run sync to populate pending reviews.
                  </p>
                </div>
              ) : null}
              {inbox.length > 0 ? (
                <div className="space-y-3 md:hidden">
                  {inbox.map((review) => (
                    <div
                      key={`${review.rating}-${review.quote}-mobile`}
                      className="rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {review.source} • {review.rating}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(review.status)}`}
                        >
                          {review.status}
                        </span>
                      </div>
                      <p className="text-slate-700">&quot;{review.quote}&quot;</p>
                      <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                        {review.response}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedReview(review)}
                        className="mt-3 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {inbox.length > 0 ? (
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
                    <thead>
                      <tr>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-900">
                          Source
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-900">
                          Rating
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-900">
                          Review
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-900">
                          Response
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-900">
                          Status
                        </th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-900">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inbox.map((review) => {
                        return (
                          <tr key={`${review.rating}-${review.quote}`} className="align-top">
                            <td className="border-b border-slate-100 px-3 py-3 font-medium text-slate-900">
                              {review.source}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3">
                              {review.rating}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3">
                              &quot;{review.quote}&quot;
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3 text-slate-600">
                              <span className="line-clamp-2">{review.response}</span>
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(review.status)}`}
                              >
                                {review.status}
                              </span>
                            </td>
                            <td className="border-b border-slate-100 px-3 py-3">
                              <button
                                type="button"
                                onClick={() => setSelectedReview(review)}
                                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                <div key={metric.label} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{metric.value}</p>
                  <p
                    className={
                      metric.delta.startsWith("+") ? "text-rose-700" : "text-emerald-700"
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
              <TrendLineChart points={autoPublishedTrend} />
            </Panel>

            <Panel
              title="Reviews by Service"
              subtitle="Focus where review volume is highest"
            >
              <ServiceBarChart items={serviceReviewVolume} />
            </Panel>
          </div>
        </div>
      ) : null}

      {typeof document !== "undefined" && selectedReview
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 bg-[linear-gradient(120deg,#0f172a,#1e293b)] px-5 py-4 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-300">
                  {selectedReview.source} • {selectedReview.rating}
                </p>
                <h3 className="mt-1 text-xl font-semibold">Review Response Workspace</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-5 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Current Status
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(selectedReview.status)}`}
                >
                  {selectedReview.status}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Customer Review
                  </p>
                  <p className="mt-2 leading-relaxed">&quot;{selectedReview.quote}&quot;</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Suggested Response
                  </p>
                  <p className="mt-2 leading-relaxed">{selectedReview.response}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-500">
                  Source: {selectedReview.source} • Rating: {selectedReview.rating}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Edit Response
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Approve and Send
                  </button>
                </div>
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

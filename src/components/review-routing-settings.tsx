"use client";

import { useEffect, useState } from "react";
import { SettingsCardHeader, SettingsSaveBar } from "@/components/settings-controls";
import {
  defaultReviewRoutingRules,
  type ReviewRoutingBucket,
  type ReviewRoutingRules,
  type ReviewStarRating,
} from "@/lib/review-routing";

const STAR_RATINGS: ReviewStarRating[] = [5, 4, 3, 2, 1];

/** The three routes, in order from most to least automated. */
const BUCKETS: Array<{
  value: ReviewRoutingBucket;
  label: string;
  meaning: string;
  selectedClass: string;
  dotClass: string;
}> = [
  {
    value: "auto_publish",
    label: "Auto-publish",
    meaning: "Reply is posted automatically",
    selectedClass:
      "bg-emerald-600 text-white shadow-sm ring-emerald-600",
    dotClass: "bg-emerald-500",
  },
  {
    value: "manual_approval",
    label: "Approve",
    meaning: "Draft waits for a one-click approval",
    selectedClass:
      "bg-amber-500 text-white shadow-sm ring-amber-500",
    dotClass: "bg-amber-500",
  },
  {
    value: "needs_review",
    label: "Human review",
    meaning: "Someone reads and edits before replying",
    selectedClass:
      "bg-rose-600 text-white shadow-sm ring-rose-600",
    dotClass: "bg-rose-500",
  },
];

function ratingKey(star: ReviewStarRating) {
  return String(star) as `${ReviewStarRating}`;
}

export function ReviewRoutingSettings({
  organizationId,
  initialRules,
  readOnly = false,
  onSave,
}: {
  organizationId: string;
  initialRules: ReviewRoutingRules;
  readOnly?: boolean;
  onSave: (formData: FormData) => void | Promise<void>;
}) {
  const [rules, setRules] = useState<ReviewRoutingRules>(initialRules);

  useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  const dirty = STAR_RATINGS.some((star) => rules.ratings[ratingKey(star)] !== initialRules.ratings[ratingKey(star)]);

  function setRatingBucket(star: ReviewStarRating, bucket: ReviewRoutingBucket) {
    setRules((prev) => ({ ratings: { ...prev.ratings, [ratingKey(star)]: bucket } }));
  }

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <SettingsCardHeader
        step="2"
        title="Route by rating"
        description="Choose what happens to a new review based on its star rating."
      />
      <form action={onSave}>
        <input type="hidden" name="organization_id" value={organizationId} />
        {STAR_RATINGS.map((star) => (
          <input key={`hidden-${star}`} type="hidden" name={`routing_rating_${star}`} value={rules.ratings[ratingKey(star)]} />
        ))}

        <div className="grid gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4 sm:grid-cols-3 lg:px-6">
          {BUCKETS.map((bucket) => (
            <div key={bucket.value} className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text)]">
                <span className={`size-2 rounded-full ${bucket.dotClass}`} aria-hidden />
                {bucket.label}
              </p>
              <p className="mt-1 pl-4 text-[11px] leading-relaxed text-[var(--color-text-muted)]">{bucket.meaning}</p>
            </div>
          ))}
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {STAR_RATINGS.map((star) => {
            const current = rules.ratings[ratingKey(star)];
            return (
              <div key={star} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-6">
                <p className="flex items-center gap-2" aria-label={`${star} star reviews`}>
                  <span className="text-sm tracking-[0.08em] text-amber-500" aria-hidden>
                    {"★".repeat(star)}
                    <span className="text-[var(--color-border-hover)]">{"★".repeat(5 - star)}</span>
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {star} star{star === 1 ? "" : "s"}
                  </span>
                </p>
                <div
                  role="radiogroup"
                  aria-label={`Route for ${star} star reviews`}
                  className="grid w-full grid-cols-3 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1 sm:inline-flex sm:w-auto"
                >
                  {BUCKETS.map((bucket) => {
                    const selected = current === bucket.value;
                    return (
                      <button
                        key={bucket.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={readOnly}
                        onClick={() => setRatingBucket(star, bucket.value)}
                        className={`whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed sm:px-3 ${
                          selected
                            ? `${bucket.selectedClass} ring-1`
                            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                        }`}
                      >
                        {bucket.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <SettingsSaveBar
          dirty={dirty}
          readOnly={readOnly}
          saveLabel="Save"
          onReset={() => setRules(defaultReviewRoutingRules())}
        />
      </form>
    </section>
  );
}

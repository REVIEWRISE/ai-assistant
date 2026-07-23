"use client";

import { useState } from "react";
import { CustomSelect } from "@/components/custom-select";
import {
  REVIEW_ROUTING_BUCKET_OPTIONS,
  defaultReviewRoutingRules,
  type ReviewRoutingBucket,
  type ReviewRoutingRules,
  type ReviewStarRating,
} from "@/lib/review-routing";

const STAR_RATINGS: ReviewStarRating[] = [5, 4, 3, 2, 1];

function toStars(rating: ReviewStarRating): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
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

  function setRatingBucket(star: ReviewStarRating, bucket: ReviewRoutingBucket) {
    setRules((prev) => ({
      ratings: {
        ...prev.ratings,
        [String(star)]: bucket,
      },
    }));
  }

  function resetDefaults() {
    setRules(defaultReviewRoutingRules());
  }

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--color-border)] px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Approval policy</p>
        <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.015em] text-[var(--color-text)]">Routing by rating</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
          {readOnly ? "Review how each star rating is routed after sync." : "Choose what happens when a review syncs, based on its star rating."}
        </p>
      </div>
      <form action={onSave} className="space-y-4 p-4 lg:p-5">
        <input type="hidden" name="organization_id" value={organizationId} />
        {STAR_RATINGS.map((star) => (
          <input
            key={`hidden-${star}`}
            type="hidden"
            name={`routing_rating_${star}`}
            value={rules.ratings[String(star) as `${typeof star}`]}
          />
        ))}

        <p className="text-sm text-[var(--color-text-muted)]">
          For each star rating, pick the workflow after sync. &quot;Safe to auto-publish&quot; drafts
          (if enabled) and posts the reply to Google. &quot;Manual approval&quot; and &quot;Needs human
          review&quot; keep the draft in your inbox until someone approves it.
        </p>

        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            <div>Rating</div>
            <div>Route to</div>
          </div>
          <div className="divide-y divide-[var(--color-border-muted)]">
            {STAR_RATINGS.map((star) => (
              <div
                key={star}
                className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-warning)]">{toStars(star)}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{star} star{star === 1 ? "" : "s"}</span>
                </div>
                <CustomSelect
                  value={rules.ratings[String(star) as `${typeof star}`]}
                  onChange={(value) => setRatingBucket(star, value as ReviewRoutingBucket)}
                  options={REVIEW_ROUTING_BUCKET_OPTIONS}
                  disabled={readOnly}
                  aria-label={`Routing for ${star} star reviews`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-muted)] pt-4">
          {readOnly ? (
            <span className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)]">
              View-only access
            </span>
          ) : (
            <>
          <button
            type="button"
            onClick={resetDefaults}
            className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
          >
            Reset to defaults
          </button>
          <button
            type="submit"
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
          >
            Save routing rules
          </button>
            </>
          )}
        </div>
      </form>
    </section>
  );
}

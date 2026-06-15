"use client";

import { useState } from "react";
import { CustomSelect } from "@/components/custom-select";
import { Panel } from "@/components/ui";
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
  onSave,
}: {
  organizationId: string;
  initialRules: ReviewRoutingRules;
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
    <Panel
      title="Approval routing by rating"
      subtitle="Choose how pending reviews are classified before replies are sent"
    >
      <form action={onSave} className="space-y-4">
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
          Each star rating is routed to a workflow bucket in your inbox. This does not publish replies
          automatically yet — it controls labels like &quot;Safe to auto-publish&quot; and &quot;Needs human
          review&quot;.
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
                  aria-label={`Routing for ${star} star reviews`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-muted)] pt-4">
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
        </div>
      </form>
    </Panel>
  );
}

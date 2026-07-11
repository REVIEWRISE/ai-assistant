import { repliedPlatformLabel } from "@/lib/review-provider-integration";

export type ReviewRoutingBucket = "auto_publish" | "needs_review" | "manual_approval";

export type ReviewStarRating = 1 | 2 | 3 | 4 | 5;

export type ReviewRoutingRules = {
  ratings: Record<`${ReviewStarRating}`, ReviewRoutingBucket>;
};

export const REVIEW_ROUTING_BUCKET_LABELS: Record<ReviewRoutingBucket, string> = {
  auto_publish: "Safe to auto-publish",
  needs_review: "Needs human review",
  manual_approval: "Manual approval",
};

export const REVIEW_ROUTING_BUCKET_OPTIONS: Array<{ value: ReviewRoutingBucket; label: string }> = [
  { value: "auto_publish", label: REVIEW_ROUTING_BUCKET_LABELS.auto_publish },
  { value: "needs_review", label: REVIEW_ROUTING_BUCKET_LABELS.needs_review },
  { value: "manual_approval", label: REVIEW_ROUTING_BUCKET_LABELS.manual_approval },
];

const STAR_RATINGS: ReviewStarRating[] = [1, 2, 3, 4, 5];
const BUCKETS = new Set<ReviewRoutingBucket>(["auto_publish", "needs_review", "manual_approval"]);

export function defaultReviewRoutingRules(): ReviewRoutingRules {
  return {
    ratings: {
      "5": "auto_publish",
      "4": "auto_publish",
      "3": "manual_approval",
      "2": "needs_review",
      "1": "needs_review",
    },
  };
}

function normalizeStarRating(rating: number): ReviewStarRating {
  return Math.max(1, Math.min(5, Math.floor(rating))) as ReviewStarRating;
}

function parseBucket(value: unknown, fallback: ReviewRoutingBucket): ReviewRoutingBucket {
  const raw = String(value ?? "").trim() as ReviewRoutingBucket;
  return BUCKETS.has(raw) ? raw : fallback;
}

export function resolveReviewRoutingRules(raw: unknown): ReviewRoutingRules {
  const defaults = defaultReviewRoutingRules();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;

  const rec = raw as Record<string, unknown>;
  const ratingsRaw =
    rec.ratings && typeof rec.ratings === "object" && !Array.isArray(rec.ratings)
      ? (rec.ratings as Record<string, unknown>)
      : rec;

  const ratings = { ...defaults.ratings };
  for (const star of STAR_RATINGS) {
    const key = String(star) as `${ReviewStarRating}`;
    ratings[key] = parseBucket(ratingsRaw[key], defaults.ratings[key]);
  }

  return { ratings };
}

export function parseReviewRoutingForm(raw: Record<string, unknown>): ReviewRoutingRules {
  const defaults = defaultReviewRoutingRules();
  const ratings = { ...defaults.ratings };
  for (const star of STAR_RATINGS) {
    const key = String(star) as `${ReviewStarRating}`;
    ratings[key] = parseBucket(raw[`routing_rating_${star}`], defaults.ratings[key]);
  }
  return { ratings };
}

export function classifyPendingReviewRating(
  rating: number,
  rules: ReviewRoutingRules,
): ReviewRoutingBucket {
  const key = String(normalizeStarRating(rating)) as `${ReviewStarRating}`;
  return rules.ratings[key] ?? defaultReviewRoutingRules().ratings[key];
}

export function toInboxStatusFromRouting(
  dbStatus: string,
  rating: number,
  rules: ReviewRoutingRules,
  provider = "Google",
): string {
  const normalized = dbStatus.trim().toLowerCase();
  if (normalized === "responded") {
    return `Replied on ${repliedPlatformLabel(provider)}`;
  }
  if (normalized === "pending") {
    return REVIEW_ROUTING_BUCKET_LABELS[classifyPendingReviewRating(rating, rules)];
  }
  if (normalized === "approved" || normalized === "published" || normalized === "sent") {
    return REVIEW_ROUTING_BUCKET_LABELS.auto_publish;
  }
  if (normalized === "rejected" || normalized === "failed") {
    return REVIEW_ROUTING_BUCKET_LABELS.needs_review;
  }
  return REVIEW_ROUTING_BUCKET_LABELS.manual_approval;
}

export function inboxToneForStatus(status: string): string {
  if (status === REVIEW_ROUTING_BUCKET_LABELS.auto_publish || status.startsWith("Replied on ")) {
    return "vr-app-status-success";
  }
  if (status === REVIEW_ROUTING_BUCKET_LABELS.needs_review) {
    return "vr-app-status-danger";
  }
  return "vr-app-status-warning";
}

export function isAutoReadyPendingReview(rating: number, rules: ReviewRoutingRules): boolean {
  return classifyPendingReviewRating(rating, rules) === "auto_publish";
}

export function isNeedsReviewPendingReview(rating: number, rules: ReviewRoutingRules): boolean {
  return classifyPendingReviewRating(rating, rules) === "needs_review";
}

/** Compact summary for dashboard hints, e.g. "5–4★ auto · 3★ manual · 2–1★ review". */
export function formatReviewRoutingSummary(rules: ReviewRoutingRules): string {
  const labels: Record<ReviewRoutingBucket, string> = {
    auto_publish: "auto",
    manual_approval: "manual",
    needs_review: "review",
  };

  const groups: Array<{ bucket: ReviewRoutingBucket; stars: ReviewStarRating[] }> = [];
  for (const star of [...STAR_RATINGS].reverse()) {
    const bucket = rules.ratings[String(star) as `${ReviewStarRating}`];
    const last = groups[groups.length - 1];
    if (last?.bucket === bucket) {
      last.stars.push(star);
      continue;
    }
    groups.push({ bucket, stars: [star] });
  }

  return groups
    .map(({ bucket, stars }) => {
      const range =
        stars.length === 1 ? `${stars[0]}★` : `${stars[0]}–${stars[stars.length - 1]}★`;
      return `${range} ${labels[bucket]}`;
    })
    .join(" · ");
}

import { loadOrgBookingContext } from "@/lib/booking-org-gate";
import { getOpenAiApiKey } from "@/lib/openai-chat-reply";
import { prisma } from "@/lib/prisma";
import {
  classifyPendingReviewRating,
  resolveReviewRoutingRules,
  REVIEW_ROUTING_BUCKET_LABELS,
  type ReviewRoutingBucket,
} from "@/lib/review-routing";
import {
  resolveReviewReplyAutomationConfig,
  type ReviewReplyAutomationConfig,
} from "@/lib/review-reply-automation";

const DEFAULT_MODEL = "gpt-4o-mini";

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

function toneGuideForBucket(bucket: ReviewRoutingBucket): string {
  switch (bucket) {
    case "auto_publish":
      return "Warm, concise thank-you. Safe to publish with light approval.";
    case "needs_review":
      return "Empathetic and calm. Acknowledge concerns without being defensive. Invite them to contact the business directly to resolve.";
    case "manual_approval":
      return "Professional and balanced. Thank them and address any points briefly.";
  }
}

export async function generateReviewReplyDraft(args: {
  organizationName: string;
  knowledgeCorpus: string;
  knowledgeStatus: string;
  reviewText: string;
  rating: number;
  routingBucket: ReviewRoutingBucket;
  providerName: string;
}): Promise<string | null> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const knowledgeSlice = args.knowledgeCorpus.slice(0, 10_000);
  const workflowLabel = REVIEW_ROUTING_BUCKET_LABELS[args.routingBucket];

  const system = `You write public review responses for "${args.organizationName}" on behalf of the business.
Use only facts supported by the business knowledge below. Do not invent policies, offers, or staff names.
Output plain text only — no quotes, markdown, or JSON. One response, 2-4 sentences, under 90 words.`;

  const user = `BUSINESS KNOWLEDGE (status: ${args.knowledgeStatus})
---
${knowledgeSlice || "(No knowledge text on file — keep the reply generic and professional.)"}
---

REVIEW (${args.rating}/5 stars via ${args.providerName})
"${args.reviewText}"

WORKFLOW: ${workflowLabel}
TONE: ${toneGuideForBucket(args.routingBucket)}

Write the public reply from the business (use "we").`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.45,
        max_tokens: 220,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as OpenAiChatResponse;
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    return text ? text.slice(0, 4000) : null;
  } catch {
    return null;
  }
}

export async function draftRepliesForSyncedReviews(args: {
  organizationId: string;
  providerName: string;
  since: Date;
  automation?: ReviewReplyAutomationConfig;
}): Promise<{ drafted: number; skipped: number }> {
  const automation = args.automation ?? resolveReviewReplyAutomationConfig(null);
  if (!automation.draftOnSync) {
    return { drafted: 0, skipped: 0 };
  }
  if (!getOpenAiApiKey()) {
    return { drafted: 0, skipped: 0 };
  }

  const [org, settingsRow, pendingRows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: args.organizationId },
      select: { name: true },
    }),
    prisma.organizationReviewSettings.findUnique({
      where: { organizationId: args.organizationId },
      select: { routingRules: true, replyAutomation: true },
    }),
    prisma.review.findMany({
      where: {
        organizationId: args.organizationId,
        provider: args.providerName,
        status: "pending",
        responseText: null,
        createdAt: { gte: args.since },
      },
      select: { id: true, rating: true, reviewText: true },
      take: 25,
    }),
  ]);

  if (!org || pendingRows.length === 0) {
    return { drafted: 0, skipped: pendingRows.length };
  }

  const routingRules = resolveReviewRoutingRules(settingsRow?.routingRules);
  const kb = await loadOrgBookingContext(args.organizationId);

  let drafted = 0;
  let skipped = 0;

  for (const row of pendingRows) {
    const bucket = classifyPendingReviewRating(row.rating, routingRules);
    const draft = await generateReviewReplyDraft({
      organizationName: org.name,
      knowledgeCorpus: kb.knowledgeCorpus,
      knowledgeStatus: kb.knowledgeStatus,
      reviewText: row.reviewText,
      rating: row.rating,
      routingBucket: bucket,
      providerName: args.providerName,
    });

    if (!draft) {
      skipped += 1;
      continue;
    }

    await prisma.review.update({
      where: { id: row.id },
      data: { responseText: draft },
    });
    drafted += 1;
  }

  return { drafted, skipped };
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getReviewStatusMessage } from "@/lib/reviews-status-messages";
import { toast } from "@/lib/toast";

const variantStyles = {
  success: "vr-app-alert vr-app-alert-success",
  error: "vr-app-alert vr-app-alert-danger",
  warning: "vr-app-alert vr-app-alert-warning",
} as const;

/** Success states that only use a toast — no persistent banner. */
const toastOnlySuccess = new Set([
  "provider_connected",
  "review_sync_done",
  "review_sync_up_to_date",
  "review_routing_saved",
  "review_sync_cron_saved",
]);

export function ReviewsPageAlerts() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lastToast = useRef<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const detail = searchParams.get("detail");
  const message = getReviewStatusMessage({ success, error, detail });
  const toastKey = success ? `success:${success}` : error ? `error:${error}` : null;

  useEffect(() => {
    if (!toastKey || toastKey === lastToast.current || !message) return;
    lastToast.current = toastKey;

    if (message.variant === "success") {
      toast.success(message.title);
    } else {
      toast.error(message.title);
    }

    if (success && toastOnlySuccess.has(success)) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("success");
      params.delete("error");
      params.delete("detail");
      const query = params.toString();
      router.replace(query ? `/reviews?${query}` : "/reviews", { scroll: false });
    }
  }, [toastKey, message, router, searchParams, success]);

  function dismissBanner() {
    if (toastKey) setDismissedKey(toastKey);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("success");
    params.delete("error");
    params.delete("detail");
    const query = params.toString();
    router.replace(query ? `/reviews?${query}` : "/reviews", { scroll: false });
  }

  if (!message || dismissedKey === toastKey) return null;
  if (success && toastOnlySuccess.has(success)) return null;

  return (
    <section role="status" className={`shadow-sm lg:px-5 ${variantStyles[message.variant]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{message.title}</p>
          <p className="mt-1 text-sm opacity-90">{message.body}</p>
        </div>
        <button
          type="button"
          onClick={dismissBanner}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold opacity-70 transition hover:bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] hover:opacity-100"
          aria-label="Dismiss message"
        >
          Dismiss
        </button>
      </div>

      {message.hints && message.hints.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm opacity-90">
          {message.hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      ) : null}

      {error?.startsWith("gbp_") ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="https://business.google.com/"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
          >
            Open Google Business Profile
          </Link>
        </div>
      ) : null}
    </section>
  );
}

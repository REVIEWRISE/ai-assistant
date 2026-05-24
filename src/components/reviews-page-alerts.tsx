"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getReviewStatusMessage } from "@/lib/reviews-status-messages";
import { toast } from "@/lib/toast";

const variantStyles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-rose-200 bg-rose-50 text-rose-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
} as const;

export function ReviewsPageAlerts() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lastToast = useRef<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const message = getReviewStatusMessage({ success, error });
  const toastKey = success ? `success:${success}` : error ? `error:${error}` : null;

  useEffect(() => {
    if (!toastKey || toastKey === lastToast.current || !message) return;
    lastToast.current = toastKey;

    if (message.variant === "success") {
      toast.success(message.title);
      return;
    }
    toast.error(message.title);
  }, [toastKey, message]);

  function dismissBanner() {
    if (toastKey) setDismissedKey(toastKey);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("success");
    params.delete("error");
    const query = params.toString();
    router.replace(query ? `/reviews?${query}` : "/reviews", { scroll: false });
  }

  if (!message || dismissedKey === toastKey) return null;

  return (
    <section
      role="status"
      className={`rounded-2xl border px-4 py-4 shadow-sm lg:px-5 ${variantStyles[message.variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{message.title}</p>
          <p className="mt-1 text-sm opacity-90">{message.body}</p>
        </div>
        <button
          type="button"
          onClick={dismissBanner}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold opacity-70 transition hover:bg-black/5 hover:opacity-100"
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
            className="rounded-lg border border-current/20 bg-white/70 px-3 py-2 text-xs font-semibold transition hover:bg-white"
          >
            Open Google Business Profile
          </Link>
        </div>
      ) : null}
    </section>
  );
}

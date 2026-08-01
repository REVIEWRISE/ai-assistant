import type { ReactNode } from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";

type ToastMessage = string | ReactNode;

/**
 * Module-level guard so React Strict Mode remounts (and any duplicate
 * callers) cannot stack the same toast twice within a short window.
 */
const recentlyShown = new Map<string, number>();
const DEDUPE_MS = 1500;

function toastId(type: string, message: ToastMessage, data?: ExternalToast): string | number {
  if (data?.id != null) return data.id;
  const text = typeof message === "string" ? message : "";
  const description =
    data && typeof data.description === "string" ? data.description : "";
  return `${type}:${text}:${description}`;
}

function shouldSkip(id: string | number): boolean {
  const key = String(id);
  const now = Date.now();
  const last = recentlyShown.get(key);
  if (last != null && now - last < DEDUPE_MS) return true;
  recentlyShown.set(key, now);
  // Opportunistic cleanup
  if (recentlyShown.size > 40) {
    for (const [k, at] of recentlyShown) {
      if (now - at >= DEDUPE_MS) recentlyShown.delete(k);
    }
  }
  return false;
}

function show(
  type: "success" | "error" | "warning" | "info" | "message",
  message: ToastMessage,
  data?: ExternalToast,
) {
  const id = toastId(type, message, data);
  if (shouldSkip(id)) return id;
  const payload = { ...data, id };
  switch (type) {
    case "success":
      return sonnerToast.success(message, payload);
    case "error":
      return sonnerToast.error(message, payload);
    case "warning":
      return sonnerToast.warning(message, payload);
    case "info":
      return sonnerToast.info(message, payload);
    default:
      return sonnerToast(message, payload);
  }
}

export const toast = {
  success: (message: ToastMessage, data?: ExternalToast) => show("success", message, data),
  error: (message: ToastMessage, data?: ExternalToast) => show("error", message, data),
  warning: (message: ToastMessage, data?: ExternalToast) => show("warning", message, data),
  info: (message: ToastMessage, data?: ExternalToast) => show("info", message, data),
  message: (message: ToastMessage, data?: ExternalToast) => show("message", message, data),
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
};

export { sonnerToast };

/**
 * Thin structured-logging wrapper over console.* — no third-party APM/aggregator.
 * Emits one JSON line per call so logs are easy to pipe into any log shipper
 * (Docker logs -> journald/CloudWatch/etc.) later without a rewrite.
 *
 * error() also reports to Sentry (captureMessage, not captureException — call
 * sites consistently pass stringified error.message rather than the raw Error,
 * so there's no stack trace to attach). This is a no-op when SENTRY_DSN isn't
 * configured, same as the rest of the SDK.
 */
import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error";

function emit(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    Sentry.captureMessage(message, { level: "error", tags: { scope }, extra: meta });
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export type Logger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

/** Create a logger tagged with a fixed scope, e.g. createLogger("auth"). */
export function createLogger(scope: string): Logger {
  return {
    info: (message, meta) => emit("info", scope, message, meta),
    warn: (message, meta) => emit("warn", scope, message, meta),
    error: (message, meta) => emit("error", scope, message, meta),
  };
}

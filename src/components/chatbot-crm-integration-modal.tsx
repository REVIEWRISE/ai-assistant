"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { BookingFlowConfig } from "@/lib/chatbot-config";
import {
  buildBookingCrmWebhookExamplePayload,
  formatBookingCrmWebhookExampleJson,
} from "@/lib/booking-crm-webhook-example";
import {
  crmIntegrationIsDispatchReady,
  parseCrmIntegrationForm,
  type CrmIntegrationConfig,
} from "@/lib/crm-integration";

export function ChatbotCrmIntegrationModal({
  organizationId,
  organizationName,
  bookingFlow,
  initialConfig,
  onSave,
  onClose,
}: {
  organizationId: string;
  organizationName: string;
  bookingFlow: BookingFlowConfig;
  initialConfig: CrmIntegrationConfig;
  onSave: (formData: FormData) => void | Promise<void>;
  onClose: () => void;
}) {
  const [webhookUrl, setWebhookUrl] = useState(initialConfig.webhookUrl);
  const [signingSecret, setSigningSecret] = useState(initialConfig.signingSecret);

  const examplePayloadJson = useMemo(
    () =>
      formatBookingCrmWebhookExampleJson(
        buildBookingCrmWebhookExamplePayload({
          organizationId,
          organizationName,
          bookingFlow,
        }),
      ),
    [bookingFlow, organizationId, organizationName],
  );

  const flowStepCount = bookingFlow.steps.length;

  const ready = useMemo(
    () =>
      crmIntegrationIsDispatchReady(
        parseCrmIntegrationForm({ webhookUrl, signingSecret }),
      ),
    [signingSecret, webhookUrl],
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-[min(96vw,42rem)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]">
        <div className="max-h-[92vh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                CRM integration
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">
                Connect bookings to {organizationName}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                When a visitor completes a booking through your embedded chatbot, we POST a JSON payload to your
                endpoint. Use this in HubSpot, Salesforce, Zapier, Make, or your own API to create contacts, deals, or
                tasks.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)]"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>

          <form action={onSave} className="mt-5 space-y-4">
            <input type="hidden" name="organization_id" value={organizationId} />

            <label className="block text-sm font-semibold text-[var(--color-text)]">
              Webhook URL
              <input
                type="url"
                name="crm_webhook_url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-crm.com/api/bookings"
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
              />
              <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">
                Save a valid URL to start sending <code className="rounded bg-[var(--color-raised)] px-1 text-[11px]">booking.created</code>{" "}
                after each chatbot booking. Clear the field and save to turn off.
              </span>
            </label>

            <label className="block text-sm font-semibold text-[var(--color-text)]">
              Signing secret <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
              <input
                type="password"
                name="crm_signing_secret"
                value={signingSecret}
                onChange={(e) => setSigningSecret(e.target.value)}
                autoComplete="off"
                placeholder="Shared secret for HMAC verification"
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
              />
              <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">
                When set, requests include{" "}
                <code className="rounded bg-[var(--color-raised)] px-1 text-[11px]">X-VyntRise-Signature: sha256=…</code>{" "}
                (HMAC-SHA256 of the raw JSON body). Verify on your server before trusting the payload.
              </span>
            </label>

            <div
              className={`rounded-xl border px-3 py-2 text-xs ${
                ready
                  ? "border-[color-mix(in_srgb,var(--color-success)_40%,var(--color-border))] bg-[var(--color-success-soft)] text-[color-mix(in_srgb,var(--color-success)_85%,var(--color-text))]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
              }`}
            >
              {ready
                ? "Active — new chatbot bookings will POST to your webhook."
                : webhookUrl.trim()
                  ? "Enter a valid http(s) URL to activate delivery."
                  : "Inactive — add a webhook URL and save to enable."}
            </div>

            <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" open>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
                Payload preview for this organization
              </summary>
              <div className="space-y-2 border-t border-[var(--color-border-muted)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
                <p>
                  The outer shape is always the same. What changes per organization is{" "}
                  <code className="rounded bg-[var(--color-raised)] px-1">bookingFlow</code> (your step definitions) and{" "}
                  <code className="rounded bg-[var(--color-raised)] px-1">appointment.bookingFlowQa</code> (visitor
                  answers keyed by <code className="rounded bg-[var(--color-raised)] px-1">stepId</code>). This preview
                  uses your saved booking flow
                  {flowStepCount > 0 ? (
                    <>
                      {" "}
                      (<span className="font-semibold text-[var(--color-text)]">{flowStepCount}</span> question
                      {flowStepCount === 1 ? "" : "s"})
                    </>
                  ) : (
                    <> (no question steps yet — configure under Booking flow)</>
                  )}
                  .
                </p>
                <p>
                  <span className="font-semibold text-[var(--color-text)]">Headers:</span>{" "}
                  <code className="rounded bg-[var(--color-raised)] px-1">Content-Type: application/json</code>,{" "}
                  <code className="rounded bg-[var(--color-raised)] px-1">X-VyntRise-Event: booking.created</code>
                  {signingSecret.trim() ? (
                    <>
                      ,{" "}
                      <code className="rounded bg-[var(--color-raised)] px-1">X-VyntRise-Signature: sha256=…</code>
                    </>
                  ) : null}
                </p>
                <pre className="max-h-72 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-[11px] leading-relaxed text-[var(--color-text)]">
                  {examplePayloadJson}
                </pre>
                <p className="text-[11px] leading-snug">
                  Map CRM fields with{" "}
                  <code className="rounded bg-[var(--color-raised)] px-1">appointment.bookingFlowQa.find(q =&gt; q.stepId === &quot;your_step_id&quot;)</code>
                  . Values are sample placeholders; real bookings send actual visitor answers.
                </p>
              </div>
            </details>

            <div className="flex justify-end gap-2 border-t border-[var(--color-border-muted)] pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
              >
                Save CRM integration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

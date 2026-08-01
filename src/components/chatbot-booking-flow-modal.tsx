"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPortal } from "react-dom";
import type { GenerateBookingFlowResult } from "@/app/(protected)/appointments/chatbot/actions";
import { ChatbotWidgetPreview } from "@/components/chatbot-widget-preview";
import { CustomSelect } from "@/components/custom-select";
import { normalizeQuickActionsArray, type BookingFlowConfig, type ChatbotConfigData } from "@/lib/chatbot-config";

type BookingFlowDraftStep = {
  clientKey: string;
  id: string;
  question: string;
  helperText: string;
  inputType: "options" | "datetime" | "text";
  optionsText: string;
};

type QuickActionDraft = {
  clientKey: string;
  label: string;
  startsBookingFlow: boolean;
};

type FlowSection = "opening" | "timing" | "steps";

const FLOW_SECTIONS: Array<{ id: FlowSection; label: string; hint: string }> = [
  { id: "opening", label: "Opening", hint: "Intro & quick actions" },
  { id: "timing", label: "Timing", hint: "Duration & gaps" },
  { id: "steps", label: "Questions", hint: "Guided booking steps" },
];

const GENERATE_ERROR_MESSAGES: Record<string, string> = {
  org_missing: "Missing organization.",
  denied: "You do not have access to this organization.",
  no_api_key: "Add OPENAI_API_KEY to your environment to generate a flow.",
  no_kb: "Import a knowledge base with enough text first, then try again.",
  failed: "Generation failed. Try again in a moment.",
};

function newDraftKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function quickActionsToDraft(
  actions: BookingFlowConfig["quickActions"] | string[] | undefined,
): QuickActionDraft[] {
  return normalizeQuickActionsArray(actions ?? []).map((item) => ({
    ...item,
    clientKey: newDraftKey(),
  }));
}

function slugifyStepId(value: string, index: number): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `step_${index + 1}`;
}

function bookingFlowStepsToDraft(steps: BookingFlowConfig["steps"]): BookingFlowDraftStep[] {
  return steps.map((step) => ({
    clientKey: newDraftKey(),
    id: step.id,
    question: step.question,
    helperText: step.helperText,
    inputType:
      step.inputType === "datetime" ? "datetime" : step.inputType === "text" ? "text" : "options",
    optionsText: step.options.map((o) => o.label).join("\n"),
  }));
}

function SaveBookingFlowSubmitButton({ idleLabel }: { idleLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : idleLabel}
    </button>
  );
}

function FlowAiCard({
  description,
  buttonLabel,
  pending,
  pendingLabel,
  disabled,
  onClick,
}: {
  description: string;
  buttonLabel: string;
  pending: boolean;
  pendingLabel: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-primary-soft)_90%,transparent),var(--color-bg))] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M5 19l1 3 3-1-1-3-3 1zM19 5l1 3 3-1-1-3-3 1z" />
          </svg>
        </span>
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)] shadow-sm transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? pendingLabel : buttonLabel}
      </button>
    </div>
  );
}

export function ChatbotBookingFlowModal({
  organizationId,
  organizationName,
  config,
  onSave,
  onGenerate,
  onClose,
}: {
  organizationId: string;
  organizationName: string;
  config: ChatbotConfigData;
  onSave: (formData: FormData) => void | Promise<void>;
  onGenerate: (formData: FormData) => Promise<GenerateBookingFlowResult>;
  onClose: () => void;
}) {
  const [activeSection, setActiveSection] = useState<FlowSection>("opening");
  const [idleHelperText, setIdleHelperText] = useState(config.bookingFlow.idleHelperText ?? "");
  const [quickActionItems, setQuickActionItems] = useState<QuickActionDraft[]>(() =>
    quickActionsToDraft(config.bookingFlow.quickActions),
  );
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(
    String(config.bookingFlow.slotDurationMinutes ?? 30),
  );
  const [minGapMinutes, setMinGapMinutes] = useState(String(config.bookingFlow.minGapMinutes ?? 0));
  const [flowSteps, setFlowSteps] = useState<BookingFlowDraftStep[]>(() =>
    bookingFlowStepsToDraft(config.bookingFlow.steps),
  );
  const [generatePending, setGeneratePending] = useState(false);
  const [generateActiveScope, setGenerateActiveScope] = useState<"intro" | "opening" | "steps" | null>(
    null,
  );
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    setActiveSection("opening");
    setIdleHelperText(config.bookingFlow.idleHelperText ?? "");
    setQuickActionItems(quickActionsToDraft(config.bookingFlow.quickActions));
    setSlotDurationMinutes(String(config.bookingFlow.slotDurationMinutes ?? 30));
    setMinGapMinutes(String(config.bookingFlow.minGapMinutes ?? 0));
    setFlowSteps(bookingFlowStepsToDraft(config.bookingFlow.steps));
    setGenerateError(null);
  }, [organizationId, config.bookingFlow]);

  const bookingFlowJson = useMemo(() => {
    const steps = flowSteps
      .map((step, idx) => {
        const question = step.question.trim();
        const helperText = step.helperText.trim() || "Choose one option.";
        const options =
          step.inputType === "datetime" || step.inputType === "text"
            ? []
            : step.optionsText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => ({ label: line, value: line }));
        if (!question || (step.inputType === "options" && options.length === 0)) return null;
        return {
          id: slugifyStepId(step.id || question, idx),
          question,
          helperText,
          inputType: step.inputType,
          options,
        };
      })
      .filter(
        (
          s,
        ): s is {
          id: string;
          question: string;
          helperText: string;
          inputType: "options" | "datetime" | "text";
          options: Array<{ label: string; value: string }>;
        } => Boolean(s),
      );

    const quickActions = quickActionItems
      .map(({ label, startsBookingFlow }) => ({
        label: label.trim(),
        startsBookingFlow,
      }))
      .filter((x) => x.label)
      .slice(0, 8);

    return JSON.stringify({
      version: 1,
      idleHelperText: idleHelperText.trim(),
      quickActions,
      slotDurationMinutes: Math.min(240, Math.max(15, parseInt(slotDurationMinutes || "30", 10) || 30)),
      minGapMinutes: Math.min(180, Math.max(0, parseInt(minGapMinutes || "0", 10) || 0)),
      steps,
    });
  }, [flowSteps, idleHelperText, minGapMinutes, quickActionItems, slotDurationMinutes]);

  const draftBookingFlow = useMemo(
    () => JSON.parse(bookingFlowJson) as BookingFlowConfig,
    [bookingFlowJson],
  );

  const quickActionCount = quickActionItems.filter((item) => item.label.trim()).length;
  const validStepCount = draftBookingFlow.steps.length;

  async function runGenerate(scope: "intro" | "opening" | "steps") {
    setGenerateError(null);
    setGeneratePending(true);
    setGenerateActiveScope(scope);
    try {
      const fd = new FormData();
      fd.set("organization_id", organizationId);
      fd.set("generate_scope", scope);
      fd.set("booking_flow", bookingFlowJson);
      const res = await onGenerate(fd);
      if (res.ok) {
        if (scope === "intro") {
          setIdleHelperText(res.bookingFlow.idleHelperText);
        } else if (scope === "opening") {
          setQuickActionItems(quickActionsToDraft(res.bookingFlow.quickActions));
        } else {
          setFlowSteps(bookingFlowStepsToDraft(res.bookingFlow.steps));
        }
      } else {
        setGenerateError(GENERATE_ERROR_MESSAGES[res.error] ?? "Something went wrong.");
      }
    } catch {
      setGenerateError("Generation failed. Try again in a moment.");
    } finally {
      setGeneratePending(false);
      setGenerateActiveScope(null);
    }
  }

  const inputClassName =
    "mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-[min(96vw,90rem)] flex-col overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[var(--shadow-lg)]">
        <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                Booking flow
              </p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--color-text)]">
                {organizationName}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
                Shape what visitors see when they open chat — intro, shortcuts, and guided questions. Changes apply
                after you save.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                  {quickActionCount} quick {quickActionCount === 1 ? "action" : "actions"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-data-cyan)_80%,var(--color-primary))]" />
                  {validStepCount} question {validStepCount === 1 ? "step" : "steps"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-[var(--color-border)] p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FLOW_SECTIONS.map((section, index) => {
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-left transition ${
                    active
                      ? "border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] bg-[var(--color-primary-soft)] text-[var(--color-text)] shadow-sm"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:border-[color-mix(in_srgb,var(--color-primary)_25%,var(--color-border))] hover:text-[var(--color-text)]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold ${
                      active
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                        : "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-xs font-semibold">{section.label}</span>
                    <span className="block text-[10px] font-medium opacity-80">{section.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <form action={onSave} className="flex min-h-0 min-w-0 flex-1 flex-col">
            <input type="hidden" name="organization_id" value={organizationId} />
            <input type="hidden" name="welcome_message" value={config.welcomeMessage} />
            <input type="hidden" name="theme_color" value={config.themeColor} />
            <input type="hidden" name="icon_color" value={config.iconColor} />
            <input type="hidden" name="booking_flow" value={bookingFlowJson} />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {generateError ? (
                <p className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[var(--color-danger-soft)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))]">
                  {generateError}
                </p>
              ) : null}

              {activeSection === "opening" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--color-text)]">Intro line</h3>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          Shown above quick actions when visitors open chat.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={generatePending}
                        onClick={() => void runGenerate("intro")}
                        className="rounded-lg border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-bg)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-primary-h)] transition hover:bg-[var(--color-primary-soft)] disabled:opacity-60"
                      >
                        {generatePending && generateActiveScope === "intro" ? "Generating…" : "Generate intro"}
                      </button>
                    </div>
                    <input
                      value={idleHelperText}
                      onChange={(e) => setIdleHelperText(e.target.value)}
                      placeholder="Welcome! Choose an option below to get started."
                      className={inputClassName}
                    />
                  </div>

                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--color-text)]">Quick actions</h3>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          Shortcut chips under the intro. Toggle{" "}
                          <span className="font-medium text-[var(--color-text)]">Starts flow</span> when a chip should
                          open guided questions.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setQuickActionItems((prev) => [
                            ...prev,
                            { clientKey: newDraftKey(), label: "", startsBookingFlow: true },
                          ])
                        }
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                      >
                        Add action
                      </button>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {quickActionItems.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
                          No quick actions yet. Add manually or generate with AI below.
                        </p>
                      ) : null}
                      {quickActionItems.map((item, idx) => (
                        <div
                          key={item.clientKey}
                          className="rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg)] p-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-raised)] text-[11px] font-bold text-[var(--color-text-muted)]">
                              {idx + 1}
                            </span>
                            <input
                              value={item.label}
                              onChange={(e) =>
                                setQuickActionItems((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)),
                                )
                              }
                              placeholder="e.g. Book a table"
                              className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                            />
                            <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px] font-semibold text-[var(--color-text)]">
                              <input
                                type="checkbox"
                                checked={item.startsBookingFlow}
                                onChange={(e) =>
                                  setQuickActionItems((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, startsBookingFlow: e.target.checked } : x,
                                    ),
                                  )
                                }
                                className="h-3.5 w-3.5 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                              />
                              Starts flow
                            </label>
                            <button
                              type="button"
                              onClick={() => setQuickActionItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))] transition hover:bg-[var(--color-danger-soft)]"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <FlowAiCard
                    description="Generate shortcut chips from your knowledge base. Your intro line stays as-is — use Generate intro above to change it."
                    buttonLabel="Generate quick actions"
                    pending={generatePending && generateActiveScope === "opening"}
                    pendingLabel="Generating…"
                    disabled={generatePending}
                    onClick={() => void runGenerate("opening")}
                  />
                </div>
              ) : null}

              {activeSection === "timing" ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">Booking timing rules</h3>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Used for end-time calculation and availability conflict checks.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg)] p-4 text-xs font-semibold text-[var(--color-text)]">
                      Booking duration (minutes)
                      <input
                        type="number"
                        min={15}
                        max={240}
                        step={5}
                        value={slotDurationMinutes}
                        onChange={(e) => setSlotDurationMinutes(e.target.value)}
                        className={inputClassName}
                      />
                      <p className="mt-1.5 text-[11px] font-normal text-[var(--color-text-muted)]">
                        Default slot length for new bookings.
                      </p>
                    </label>
                    <label className="block rounded-xl border border-[var(--color-border-muted)] bg-[var(--color-bg)] p-4 text-xs font-semibold text-[var(--color-text)]">
                      Minimum gap (minutes)
                      <input
                        type="number"
                        min={0}
                        max={180}
                        step={5}
                        value={minGapMinutes}
                        onChange={(e) => setMinGapMinutes(e.target.value)}
                        className={inputClassName}
                      />
                      <p className="mt-1.5 text-[11px] font-normal text-[var(--color-text-muted)]">
                        Buffer between consecutive bookings.
                      </p>
                    </label>
                  </div>
                </div>
              ) : null}

              {activeSection === "steps" ? (
                <div className="space-y-5">
                  <FlowAiCard
                    description="Generate guided question steps from your knowledge base. Does not change intro or quick actions."
                    buttonLabel="Generate question steps"
                    pending={generatePending && generateActiveScope === "steps"}
                    pendingLabel="Generating…"
                    disabled={generatePending}
                    onClick={() => void runGenerate("steps")}
                  />

                  <div className="space-y-3">
                    {flowSteps.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
                        No question steps yet. Add one below or generate with AI.
                      </p>
                    ) : null}
                    {flowSteps.map((step, index) => (
                      <div
                        key={step.clientKey}
                        className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-muted)] bg-[var(--color-bg)] px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary)] text-xs font-bold text-[var(--color-primary-fg)]">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-text)]">Question step</p>
                              <p className="text-[11px] text-[var(--color-text-muted)]">
                                {step.inputType === "datetime"
                                  ? "Date & time picker"
                                  : step.inputType === "text"
                                    ? "Text input"
                                    : "Multiple choice"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setFlowSteps((prev) => {
                                  if (index === 0) return prev;
                                  const next = prev.slice();
                                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                  return next;
                                })
                              }
                              disabled={index === 0}
                              className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)] disabled:opacity-40"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFlowSteps((prev) => {
                                  if (index === prev.length - 1) return prev;
                                  const next = prev.slice();
                                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                  return next;
                                })
                              }
                              disabled={index === flowSteps.length - 1}
                              className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)] disabled:opacity-40"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => setFlowSteps((prev) => prev.filter((_, i) => i !== index))}
                              className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))] hover:bg-[var(--color-danger-soft)]"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="space-y-3 p-4">
                          <label className="block text-xs font-semibold text-[var(--color-text)]">
                            Question shown to visitor
                            <input
                              value={step.question}
                              onChange={(e) =>
                                setFlowSteps((prev) =>
                                  prev.map((s, i) => (i === index ? { ...s, question: e.target.value } : s)),
                                )
                              }
                              placeholder="What would you like to book?"
                              className={inputClassName}
                            />
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-[var(--color-text)]">
                              Helper text
                              <input
                                value={step.helperText}
                                onChange={(e) =>
                                  setFlowSteps((prev) =>
                                    prev.map((s, i) =>
                                      i === index ? { ...s, helperText: e.target.value } : s,
                                    ),
                                  )
                                }
                                placeholder="Choose one option."
                                className={inputClassName}
                              />
                            </label>
                            <div>
                              <p className="text-xs font-semibold text-[var(--color-text)]">Answer input type</p>
                              <div className="mt-1.5">
                                <CustomSelect
                                  value={step.inputType}
                                  onChange={(value) =>
                                    setFlowSteps((prev) =>
                                      prev.map((s, i) =>
                                        i === index
                                          ? {
                                              ...s,
                                              inputType:
                                                value === "datetime"
                                                  ? "datetime"
                                                  : value === "text"
                                                    ? "text"
                                                    : "options",
                                            }
                                          : s,
                                      ),
                                    )
                                  }
                                  options={[
                                    { value: "options", label: "Options list" },
                                    { value: "datetime", label: "Date & time picker" },
                                    { value: "text", label: "Simple text" },
                                  ]}
                                  aria-label="Answer input type"
                                />
                              </div>
                            </div>
                          </div>
                          <label className="block text-xs font-semibold text-[var(--color-text)]">
                            Internal id (optional)
                            <input
                              value={step.id}
                              onChange={(e) =>
                                setFlowSteps((prev) =>
                                  prev.map((s, i) => (i === index ? { ...s, id: e.target.value } : s)),
                                )
                              }
                              placeholder={`step_${index + 1}`}
                              className={inputClassName}
                            />
                          </label>
                          {step.inputType === "options" ? (
                            <label className="block text-xs font-semibold text-[var(--color-text)]">
                              Options (one per line)
                              <textarea
                                value={step.optionsText}
                                onChange={(e) =>
                                  setFlowSteps((prev) =>
                                    prev.map((s, i) =>
                                      i === index ? { ...s, optionsText: e.target.value } : s,
                                    ),
                                  )
                                }
                                rows={4}
                                placeholder={"Dinner\nLunch\nBrunch"}
                                className={`${inputClassName} resize-y`}
                              />
                            </label>
                          ) : (
                            <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] bg-[var(--color-primary-soft)] px-3 py-2.5 text-xs text-[var(--color-primary-h)]">
                              {step.inputType === "datetime"
                                ? "Visitors will pick a date and time for this step."
                                : "Visitors will type a short answer for this step."}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFlowSteps((prev) => [
                        ...prev,
                        {
                          clientKey: newDraftKey(),
                          id: `step_${prev.length + 1}`,
                          question: "",
                          helperText: "",
                          inputType: "options",
                          optionsText: "",
                        },
                      ])
                    }
                    className="w-full rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-primary-soft)]"
                  >
                    + Add question step
                  </button>
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:hidden">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Live preview
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  How your chat widget looks with the current draft.
                </p>
                <div className="mt-3">
                  <ChatbotWidgetPreview
                    organizationId={organizationId}
                    organizationName={organizationName}
                    welcomeMessage={config.welcomeMessage}
                    themeColor={config.themeColor}
                    iconColor={config.iconColor}
                    bookingFlow={draftBookingFlow}
                    voiceBooking={config.voiceBooking}
                    defaultMode="chat"
                  />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 sm:px-6">
              <p className="hidden text-[11px] text-[var(--color-text-muted)] sm:block">
                Theme and welcome message are configured separately.
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                >
                  Cancel
                </button>
                <SaveBookingFlowSubmitButton idleLabel="Save booking flow" />
              </div>
            </div>
          </form>

          <aside className="hidden min-h-0 w-full shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:flex lg:max-w-[24rem] lg:flex-col lg:border-t-0 lg:border-l xl:max-w-[28rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Live preview
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Chat widget with your current draft — scroll to see all quick actions and steps.
            </p>
            <div className="mt-4 min-h-0 flex-1">
              <ChatbotWidgetPreview
                organizationId={organizationId}
                organizationName={organizationName}
                welcomeMessage={config.welcomeMessage}
                themeColor={config.themeColor}
                iconColor={config.iconColor}
                bookingFlow={draftBookingFlow}
                voiceBooking={config.voiceBooking}
                defaultMode="chat"
              />
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}

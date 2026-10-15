"use client";

import { useState, useTransition } from "react";
import {
  lookupForwardingCarrierAction,
  sendForwardingActivationSmsAction,
} from "@/app/(protected)/voice-agent/actions";
import {
  CALL_FORWARDING_CARRIERS,
  type CarrierKey,
} from "@/lib/call-forwarding-carriers";
import { buildForwardingDialCodes, formatDisplayNumber } from "@/lib/call-forwarding-codes";
import { MAIN_SITE_URL } from "@/lib/brand";
import { toast } from "@/lib/toast";
import type { OrgRetellPhoneNumber } from "@/lib/retell-phone-numbers";

type SetupPath = "auto" | "manual";

const RING_TIMES = [
  { seconds: 15, label: "15s", hint: "~3 rings" },
  { seconds: 20, label: "20s", hint: "~4 rings", recommended: true },
  { seconds: 25, label: "25s", hint: "~5 rings" },
  { seconds: 30, label: "30s", hint: "~6 rings" },
];

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-h)] ring-1 ring-[var(--color-primary)]/20">
      {n}
    </span>
  );
}

function CopyChip({
  label,
  value,
  copied,
  onCopy,
  mono = true,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 pl-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-semibold text-[var(--color-text)] ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function VoiceAgentForwardingGuide({
  organizationId,
  twilioConfigured,
  phones,
  defaultSelectedNumber,
}: {
  organizationId: string;
  twilioConfigured: boolean;
  phones: OrgRetellPhoneNumber[];
  defaultSelectedNumber?: string;
}) {
  const isPreview = phones.length === 0;
  const primaryPhone = phones.find((p) => p.isPrimary) || phones[0];
  const [selectedNumber, setSelectedNumber] = useState<string>(
    defaultSelectedNumber || primaryPhone?.phoneNumber || (isPreview ? "+15550192834" : ""),
  );
  const [setupPath, setSetupPath] = useState<SetupPath | null>(twilioConfigured ? null : "manual");
  const [carrier, setCarrier] = useState<CarrierKey>("att_tmobile");
  const [carrierConfirmed, setCarrierConfirmed] = useState(!twilioConfigured);
  const [ringSeconds, setRingSeconds] = useState<number>(20);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [businessPhone, setBusinessPhone] = useState("");
  const [lookupSummary, setLookupSummary] = useState<string | null>(null);
  const [lookupMeta, setLookupMeta] = useState<{
    carrierName: string | null;
    lineType: string | null;
    confidence: string;
  } | null>(null);
  const [lookupPending, startLookup] = useTransition();
  const [smsPending, startSms] = useTransition();
  const [smsConsent, setSmsConsent] = useState(false);

  const currentPhone = phones.find((p) => p.phoneNumber === selectedNumber) || primaryPhone;
  const rawNumber = isPreview ? "+15550192834" : currentPhone?.phoneNumber || "";
  const displayNumber = isPreview ? "+1 (555) 019-2834" : formatDisplayNumber(rawNumber);
  const carrierLabel =
    CALL_FORWARDING_CARRIERS.find((c) => c.key === carrier)?.label ?? carrier;

  const { activationCode, deactivationCode, encodedTelUri, supportsDialCodes } = buildForwardingDialCodes({
    carrier,
    aiLineNumber: rawNumber,
    ringSeconds,
  });

  const isDialCodeCarrier = supportsDialCodes;
  const showRingStep = carrier === "att_tmobile";
  const showInstructions = carrierConfirmed && setupPath != null;

  const handleCopy = async (code: string, label: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      toast.error("Failed to copy. Please manually select and copy the code.");
    }
  };

  function choosePath(path: SetupPath) {
    setSetupPath(path);
    setCarrierConfirmed(path === "manual");
    if (path === "auto") {
      setLookupMeta(null);
      setLookupSummary(null);
    }
  }

  function resetPath() {
    setSetupPath(twilioConfigured ? null : "manual");
    setCarrierConfirmed(!twilioConfigured);
    setLookupMeta(null);
    setLookupSummary(null);
    setSmsConsent(false);
  }

  function runCarrierLookup() {
    if (!twilioConfigured) return;
    const phone = businessPhone.trim();
    if (!phone) {
      toast.error("Enter the mobile number you use for business calls.");
      return;
    }
    startLookup(async () => {
      const result = await lookupForwardingCarrierAction({ organizationId, businessPhone: phone });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCarrier(result.data.carrierKey);
      setLookupSummary(result.data.summary);
      setLookupMeta({
        carrierName: result.data.carrierName,
        lineType: result.data.lineType,
        confidence: result.data.confidence,
      });
      setCarrierConfirmed(true);
      toast.success("Carrier detected — activation steps are ready.");
    });
  }

  function sendActivationSms() {
    if (!twilioConfigured) return;
    const phone = businessPhone.trim();
    if (!phone) {
      toast.error("Enter the number that should receive the activation SMS.");
      return;
    }
    if (!smsConsent) {
      toast.error("Please agree to receive SMS messages before continuing.");
      return;
    }
    startSms(async () => {
      const result = await sendForwardingActivationSmsAction({
        organizationId,
        businessPhone: phone,
        carrier,
        ringSeconds,
        aiLineNumber: rawNumber,
        smsConsent: true,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Activation instructions sent by SMS.");
    });
  }

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#0c0c0c_0%,#161616_55%,#222222_100%)] px-5 py-6 text-white lg:px-6">
        <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 left-16 size-40 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Call forwarding setup
              </p>
              {isPreview ? (
                <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-300">
                  Preview
                </span>
              ) : (
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                  No-answer routing
                </span>
              )}
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
              Forward your business line to the AI receptionist
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              {isPreview
                ? "When a caller reaches your existing number and you don’t pick up, your carrier sends the call to your AI line."
                : "Keep your published business number. Unanswered calls roll to your VyntRise AI line after the ring delay you choose."}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              {isPreview ? "Sample AI line" : "Your AI line"}
            </p>
            {phones.length > 1 ? (
              <select
                value={selectedNumber}
                onChange={(e) => setSelectedNumber(e.target.value)}
                className="mt-2 w-full min-w-[12rem] rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
              >
                {phones.map((phone) => (
                  <option key={phone.id} value={phone.phoneNumber}>
                    {phone.nickname ? `${phone.nickname} · ${phone.phoneNumber}` : phone.phoneNumber}
                    {phone.isPrimary ? " (Primary)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1.5 font-mono text-lg font-semibold tracking-tight text-white">{displayNumber}</p>
            )}
            {!isPreview ? (
              <button
                type="button"
                onClick={() => handleCopy(rawNumber, "AI phone number")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/15"
              >
                Copy number
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 lg:p-6">
        {/* Path picker */}
        {setupPath == null ? (
          <div>
            <div className="flex items-center gap-2.5">
              <StepBadge n={1} />
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">How do you want to set this up?</h4>
                <p className="text-xs text-[var(--color-text-muted)]">Pick one path — we’ll only show what you need.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => choosePath("auto")}
                className="flex flex-col items-start rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-left transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/20"
              >
                <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary-h)]">
                  Recommended
                </span>
                <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">Detect my carrier automatically</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Enter your business phone. We look up the carrier and line type, then show the matching dial code.
                </p>
              </button>

              <button
                type="button"
                onClick={() => choosePath("manual")}
                className="flex flex-col items-start rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-left transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/20"
              >
                <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Manual
                </span>
                <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">Choose my carrier myself</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Pick AT&amp;T, Verizon, VoIP, Google Voice, and more if you already know your provider.
                </p>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5">
            <p className="text-xs text-[var(--color-text-muted)]">
              Setup path:{" "}
              <span className="font-semibold text-[var(--color-text)]">
                {setupPath === "auto" ? "Automatic carrier detection" : "Manual carrier selection"}
              </span>
            </p>
            {twilioConfigured ? (
              <button
                type="button"
                onClick={resetPath}
                className="text-[11px] font-semibold text-[var(--color-primary-h)] underline-offset-2 hover:underline"
              >
                Change path
              </button>
            ) : null}
          </div>
        )}

        {/* Auto path */}
        {setupPath === "auto" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <StepBadge n={2} />
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">Enter your business phone</h4>
                <p className="text-xs text-[var(--color-text-muted)]">
                  US / Canada numbers work best for dial-code activation and SMS.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block min-w-0 flex-1 space-y-1.5">
                <span className="text-xs font-semibold text-[var(--color-text)]">Business phone</span>
                <div className="flex overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]">
                  <span className="flex select-none items-center border-r border-[var(--color-border)] px-3 font-mono text-xs text-[var(--color-text-muted)]">
                    +1
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="555 123 4567"
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                  />
                </div>
              </label>
              <button
                type="button"
                disabled={lookupPending || isPreview}
                onClick={runCarrierLookup}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {lookupPending ? "Detecting…" : "Detect carrier"}
              </button>
            </div>

            {lookupMeta ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Detected
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {lookupMeta.carrierName ? (
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 font-medium text-[var(--color-text)]">
                      {lookupMeta.carrierName}
                    </span>
                  ) : null}
                  {lookupMeta.lineType ? (
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 capitalize text-[var(--color-text-muted)]">
                      {lookupMeta.lineType.replace(/_/g, " ")}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 font-semibold text-[var(--color-primary-h)]">
                    Using {carrierLabel}
                  </span>
                </div>
                {lookupSummary ? (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">{lookupSummary}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setSetupPath("manual");
                    setCarrierConfirmed(true);
                  }}
                  className="mt-3 text-[11px] font-semibold text-[var(--color-primary-h)] underline-offset-2 hover:underline"
                >
                  Wrong carrier? Choose manually
                </button>
              </div>
            ) : null}

            {isPreview ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Add an AI phone line first to send live activation SMS.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Manual path */}
        {setupPath === "manual" ? (
          <div>
            <div className="flex items-center gap-2.5">
              <StepBadge n={twilioConfigured ? 2 : 1} />
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">Choose your carrier</h4>
                <p className="text-xs text-[var(--color-text-muted)]">We’ll show the matching activation steps.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CALL_FORWARDING_CARRIERS.map((item) => {
                const active = carrier === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setCarrier(item.key);
                      setCarrierConfirmed(true);
                    }}
                    className={`relative flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                      active
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/25 shadow-[inset_0_0_0_1px_var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-text-muted)]/30 hover:bg-[var(--color-raised)]"
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--color-text)]">{item.label}</span>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          active
                            ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                            : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <span className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">{item.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Activation — only after carrier is ready */}
        {showInstructions ? (
          <div className="grid gap-6 border-t border-[var(--color-border)] pt-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
            <div className="space-y-5">
              {showRingStep ? (
                <div>
                  <div className="flex items-center gap-2.5">
                    <StepBadge n={3} />
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-text)]">Ring time before AI picks up</h4>
                      <p className="text-xs text-[var(--color-text-muted)]">How long your phone rings before forwarding.</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {RING_TIMES.map((rt) => {
                      const active = ringSeconds === rt.seconds;
                      return (
                        <button
                          key={rt.seconds}
                          type="button"
                          onClick={() => setRingSeconds(rt.seconds)}
                          className={`flex flex-col items-center rounded-xl border px-2 py-2.5 transition ${
                            active
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm"
                              : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-raised)]"
                          }`}
                        >
                          <span className="text-sm font-bold">{rt.label}</span>
                          <span className={`mt-0.5 text-[10px] ${active ? "text-[var(--color-primary-fg)]/85" : "text-[var(--color-text-muted)]"}`}>
                            {rt.hint}
                            {rt.recommended ? " · rec." : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {setupPath === "auto" && isDialCodeCarrier && twilioConfigured ? (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5">
                  <p className="text-xs font-semibold text-[var(--color-text)]">Optional: text yourself the dial code</p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                    We’ll SMS activation steps to the business phone you entered above.
                  </p>

                  <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                      SMS Consent — VyntRise Technologies
                    </p>
                    <p className="mt-2 text-xs font-semibold text-[var(--color-text)]">
                      SMS Notifications and Customer Communications
                    </p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                      By checking the box below, you agree to receive text messages from VyntRise Technologies LLC
                      related to your services, including AI receptionist notifications, missed-call alerts,
                      appointment confirmations and reminders, and customer support updates.
                    </p>
                    <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                      <li>Message frequency varies.</li>
                      <li>Message and data rates may apply.</li>
                      <li>Reply STOP to opt out at any time.</li>
                      <li>Reply HELP for assistance.</li>
                      <li>Consent is not a condition of purchase.</li>
                      <li>
                        See our{" "}
                        <a
                          href={`${MAIN_SITE_URL}/privacy`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[var(--color-text)] underline underline-offset-2 hover:text-[var(--color-primary-h)]"
                        >
                          Privacy Policy
                        </a>{" "}
                        and{" "}
                        <a
                          href={`${MAIN_SITE_URL}/terms`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[var(--color-text)] underline underline-offset-2 hover:text-[var(--color-primary-h)]"
                        >
                          Terms of Service
                        </a>{" "}
                        for additional information.
                      </li>
                    </ul>

                    <label className="mt-3 flex cursor-pointer select-none items-start gap-2.5 border-t border-[var(--color-border)] pt-3">
                      <input
                        type="checkbox"
                        checked={smsConsent}
                        onChange={(e) => setSmsConsent(e.target.checked)}
                        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <span className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                        I agree to receive SMS messages from VyntRise Technologies LLC regarding the services I have
                        requested.
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={smsPending || isPreview || !smsConsent}
                    onClick={sendActivationSms}
                    className="mt-3 inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {smsPending ? "Sending…" : "Text activation steps"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <StepBadge n={showRingStep ? 4 : 3} />
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text)]">
                    {carrier === "landline_voip" || carrier === "google_voice"
                      ? "Follow provider instructions"
                      : "Activate forwarding"}
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {isDialCodeCarrier
                      ? "Dial from the phone that receives business calls."
                      : "Use your provider admin or Google Voice settings."}
                  </p>
                </div>
              </div>

              {carrier === "landline_voip" ? (
                <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">VoIP / landline portal</p>
                  <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    <li>Sign in to your provider admin (Comcast Business, RingCentral, Vonage, etc.).</li>
                    <li>Open <strong className="text-[var(--color-text)]">Call handling</strong> or inbound routing.</li>
                    <li>Set <strong className="text-[var(--color-text)]">Forward on no answer</strong> to your AI line.</li>
                    <li>Use ~20 seconds (about four rings) before forwarding.</li>
                  </ol>
                  <CopyChip
                    label="AI line to forward to"
                    value={displayNumber}
                    copied={copiedCode === rawNumber}
                    onCopy={() => handleCopy(rawNumber, "AI phone number")}
                  />
                </div>
              ) : carrier === "google_voice" ? (
                <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Google Voice</p>
                  <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    <li>Open Google Voice settings on web or mobile.</li>
                    <li>Under <strong className="text-[var(--color-text)]">Calls</strong>, choose forward to linked number.</li>
                    <li>Add your AI line and complete verification if prompted.</li>
                  </ol>
                  <CopyChip
                    label="AI line to forward to"
                    value={displayNumber}
                    copied={copiedCode === rawNumber}
                    onCopy={() => handleCopy(rawNumber, "AI phone number")}
                  />
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
                  <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] px-4 py-5 sm:px-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Activation dial code · {carrierLabel}
                    </p>
                    <p className="mt-2 break-all font-mono text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
                      {activationCode}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">Turns on conditional forwarding when you don’t answer.</p>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg)] p-4 sm:flex-row sm:flex-wrap">
                    <a
                      href={encodedTelUri}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] sm:flex-none"
                    >
                      Tap to dial (Android)
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(activationCode, "Activation code")}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] sm:flex-none"
                    >
                      {copiedCode === activationCode ? "Copied" : "Copy for iPhone keypad"}
                    </button>
                  </div>

                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                    <span className="font-semibold text-[var(--color-text)]">iPhone:</span> Copy the code, paste into the Phone keypad, then call.
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                  <p className="text-xs font-semibold text-[var(--color-text)]">Turn off forwarding</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                    Dial this from the same phone to disable no-answer forwarding.
                  </p>
                  {deactivationCode ? (
                    <div className="mt-3">
                      <CopyChip
                        label="Cancel code"
                        value={deactivationCode}
                        copied={copiedCode === deactivationCode}
                        onCopy={() => handleCopy(deactivationCode, "Turn-off code")}
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">Disable in your provider portal.</p>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                  <p className="text-xs font-semibold text-[var(--color-text)]">Test it</p>
                  <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                    <li>Call your business number from another phone.</li>
                    <li>Don&apos;t answer — let it ring through.</li>
                    <li>Your AI receptionist should greet the caller.</li>
                  </ol>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 text-xs">
                <p className="font-semibold text-[var(--color-text)]">Voicemail picking up first?</p>
                <p className="mt-1 leading-relaxed text-[var(--color-text-muted)]">
                  If carrier voicemail answers before the AI, shorten the ring delay (try 15s) or ask your carrier to delay voicemail pickup.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

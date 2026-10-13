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
import { toast } from "@/lib/toast";
import type { OrgRetellPhoneNumber } from "@/lib/retell-phone-numbers";

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
  const [carrier, setCarrier] = useState<CarrierKey>("att_tmobile");
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

  const currentPhone = phones.find((p) => p.phoneNumber === selectedNumber) || primaryPhone;
  const rawNumber = isPreview ? "+15550192834" : currentPhone?.phoneNumber || "";
  const displayNumber = isPreview ? "+1 (555) 019-2834" : formatDisplayNumber(rawNumber);

  const { activationCode, deactivationCode, encodedTelUri, supportsDialCodes } = buildForwardingDialCodes({
    carrier,
    aiLineNumber: rawNumber,
    ringSeconds,
  });

  const isDialCodeCarrier = supportsDialCodes;
  const activationStep = carrier === "att_tmobile" ? 3 : 2;
  const showRingStep = carrier === "att_tmobile";

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
      toast.success("Carrier detected — forwarding preset updated.");
    });
  }

  function sendActivationSms() {
    if (!twilioConfigured) return;
    const phone = businessPhone.trim();
    if (!phone) {
      toast.error("Enter the number that should receive the activation SMS.");
      return;
    }
    startSms(async () => {
      const result = await sendForwardingActivationSmsAction({
        organizationId,
        businessPhone: phone,
        carrier,
        ringSeconds,
        aiLineNumber: rawNumber,
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

      {twilioConfigured ? (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Smart setup (Twilio)
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Enter the phone you answer for business. We&apos;ll detect carrier and line type, then text you the activation dial code.
              </p>
              <label className="mt-3 block max-w-md space-y-1.5">
                <span className="text-xs font-semibold text-[var(--color-text)]">Your business phone</span>
                <div className="flex overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]">
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
              {lookupMeta ? (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
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
                    {lookupSummary ?? "Preset selected"}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                disabled={lookupPending || isPreview}
                onClick={runCarrierLookup}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {lookupPending ? "Detecting…" : "Detect carrier"}
              </button>
              <button
                type="button"
                disabled={smsPending || isPreview || !isDialCodeCarrier}
                onClick={sendActivationSms}
                title={!isDialCodeCarrier ? "SMS dial codes apply to mobile star-code carriers only" : undefined}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {smsPending ? "Sending…" : "Text activation steps"}
              </button>
            </div>
          </div>
          {isPreview ? (
            <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">
              Add an AI phone line first to send live activation SMS.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-0 lg:p-0">
        <div className="space-y-6 lg:border-r lg:border-[var(--color-border)] lg:p-6">
          <div>
            <div className="flex items-center gap-2.5">
              <StepBadge n={1} />
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text)]">Choose your carrier</h4>
                <p className="text-xs text-[var(--color-text-muted)]">We’ll show the right activation steps.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {CALL_FORWARDING_CARRIERS.map((item) => {
                const active = carrier === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCarrier(item.key)}
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

          {showRingStep ? (
            <div>
              <div className="flex items-center gap-2.5">
                <StepBadge n={2} />
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text)]">Ring time before AI picks up</h4>
                  <p className="text-xs text-[var(--color-text-muted)]">How long your phone rings before forwarding.</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
        </div>

        <div className="space-y-4 lg:p-6 lg:pl-8">
          <div className="flex items-center gap-2.5">
            <StepBadge n={activationStep} />
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)]">
                {carrier === "landline_voip" || carrier === "google_voice"
                  ? "Follow provider instructions"
                  : "Activate forwarding"}
              </h4>
              <p className="text-xs text-[var(--color-text-muted)]">
                {isDialCodeCarrier ? "Dial from the phone that receives business calls." : "Use your provider admin or Google Voice settings."}
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
                  Activation dial code
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
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Tap to dial (Android)
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(activationCode, "Activation code")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] sm:flex-none"
                >
                  {copiedCode === activationCode ? (
                    <>
                      <svg className="size-3.5 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="size-3.5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy for iPhone keypad
                    </>
                  )}
                </button>
              </div>

              <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                <span className="font-semibold text-[var(--color-text)]">iPhone:</span> iOS blocks web links with{" "}
                <code className="font-mono text-[var(--color-text)]">*</code> and{" "}
                <code className="font-mono text-[var(--color-text)]">#</code>. Copy the code, paste into the Phone keypad, then call.
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text-muted)]" aria-hidden>
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </span>
                <p className="text-xs font-semibold text-[var(--color-text)]">Turn off forwarding</p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
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
                <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">Disable in your provider portal or Google Voice settings.</p>
              )}
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" aria-hidden>
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <p className="text-xs font-semibold text-[var(--color-text)]">Test it</p>
              </div>
              <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                <li>Call your business number from another phone.</li>
                <li>Don&apos;t answer — let it ring through.</li>
                <li>Your AI receptionist should greet the caller.</li>
              </ol>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400" aria-hidden>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-8.659 5.303 12.06 12.06 0 01-8.659-5.303m16.318 0a12.06 12.06 0 00-8.659-5.303m8.659 5.303v-.003" />
                </svg>
              </span>
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-[var(--color-text)]">Voicemail picking up first?</p>
                <p className="mt-1 leading-relaxed text-[var(--color-text-muted)]">
                  If carrier voicemail answers before the AI, shorten the ring delay (try 15s) or ask your carrier to delay voicemail pickup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

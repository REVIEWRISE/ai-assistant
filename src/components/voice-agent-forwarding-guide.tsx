"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import type { OrgRetellPhoneNumber } from "@/lib/retell-phone-numbers";

type CarrierKey =
  | "att_tmobile"
  | "verizon"
  | "spectrum_xfinity"
  | "uscellular"
  | "landline_voip"
  | "google_voice";

interface CarrierOption {
  key: CarrierKey;
  label: string;
  sublabel: string;
  badge: string;
  type: "mobile" | "voip";
}

const CARRIERS: CarrierOption[] = [
  {
    key: "att_tmobile",
    label: "AT&T / T-Mobile",
    sublabel: "Also Mint, Metro, Cricket",
    badge: "GSM Standard",
    type: "mobile",
  },
  {
    key: "verizon",
    label: "Verizon",
    sublabel: "Also Visible, Total Wireless",
    badge: "CDMA Standard",
    type: "mobile",
  },
  {
    key: "spectrum_xfinity",
    label: "Spectrum / Xfinity Mobile",
    sublabel: "Cable MVNOs",
    badge: "Star Code",
    type: "mobile",
  },
  {
    key: "uscellular",
    label: "US Cellular / C-Spire",
    sublabel: "Regional Wireless",
    badge: "Star Code",
    type: "mobile",
  },
  {
    key: "landline_voip",
    label: "VoIP / Landline",
    sublabel: "Comcast, Spectrum Business, Vonage, RingCentral",
    badge: "Portal / PBX",
    type: "voip",
  },
  {
    key: "google_voice",
    label: "Google Voice",
    sublabel: "Cloud Telephony",
    badge: "Web Settings",
    type: "voip",
  },
];

const RING_TIMES = [
  { seconds: 15, label: "15s (~3 rings)" },
  { seconds: 20, label: "20s (~4 rings, recommended)" },
  { seconds: 25, label: "25s (~5 rings)" },
  { seconds: 30, label: "30s (~6 rings)" },
];

function cleanDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function VoiceAgentForwardingGuide({
  phones,
  defaultSelectedNumber,
}: {
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

  const currentPhone = phones.find((p) => p.phoneNumber === selectedNumber) || primaryPhone;
  const rawNumber = isPreview ? "+15550192834" : (currentPhone?.phoneNumber || "");
  const normalizedDigits = cleanDigits(rawNumber);

  // Generate activation and deactivation dial codes based on carrier
  let activationCode = "";
  let deactivationCode = "";
  let encodedTelUri = "";

  if (carrier === "att_tmobile") {
    activationCode = `**61*${normalizedDigits}**${ringSeconds}#`;
    deactivationCode = "##61#";
    encodedTelUri = `tel:**61*${normalizedDigits}**${ringSeconds}%23`;
  } else if (carrier === "verizon" || carrier === "spectrum_xfinity" || carrier === "uscellular") {
    activationCode = `*71${normalizedDigits}`;
    deactivationCode = "*73";
    encodedTelUri = `tel:*71${normalizedDigits}`;
  }

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

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] px-5 py-5 lg:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">
                Call forwarding setup
              </p>
              {isPreview ? (
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-500">
                  Preview Mode
                </span>
              ) : null}
            </div>
            <h3 className="mt-1 text-lg font-semibold tracking-[-0.015em] text-[var(--color-text)]">
              Forward calls to your AI receptionist
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-text-muted)]">
              {isPreview
                ? "Here is how call forwarding works: when callers dial your existing business number and you don’t answer, your carrier forwards the call directly to your AI receptionist."
                : "Keep your existing business phone number. When someone calls your business and you don’t pick up, your carrier will seamlessly forward the call to your AI receptionist."}
            </p>
          </div>

          {/* AI Line Selector */}
          {phones.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">AI Line:</span>
              <select
                value={selectedNumber}
                onChange={(e) => setSelectedNumber(e.target.value)}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 font-mono text-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                {phones.map((phone) => (
                  <option key={phone.id} value={phone.phoneNumber}>
                    {phone.nickname ? `${phone.nickname} (${phone.phoneNumber})` : phone.phoneNumber}
                    {phone.isPrimary ? " (Primary)" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2">
              <span className={`size-2 rounded-full ${isPreview ? "bg-amber-400" : "bg-[var(--color-success)]"}`} aria-hidden />
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                {isPreview ? "Sample AI Number:" : "Target AI Number:"}
              </span>
              <span className="font-mono text-xs font-semibold text-[var(--color-text)]">
                {isPreview ? "+1 (555) 019-2834" : currentPhone?.phoneNumber}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 lg:p-6 space-y-6">
        {/* Step 1: Select Carrier */}
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-h)]">
              1
            </span>
            <h4 className="text-sm font-semibold text-[var(--color-text)]">
              Select your business phone carrier
            </h4>
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {CARRIERS.map((item) => {
              const active = carrier === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCarrier(item.key)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/30 ring-1 ring-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-raised)]"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--color-text)]">{item.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                      active ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]" : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                    }`}>
                      {item.badge}
                    </span>
                  </div>
                  <span className="mt-1 text-[11px] text-[var(--color-text-muted)]">{item.sublabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Ring delay (for carriers supporting ring timer) */}
        {carrier === "att_tmobile" ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-h)]">
                2
              </span>
              <h4 className="text-sm font-semibold text-[var(--color-text)]">
                Choose ring time before AI answers
              </h4>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              How many seconds should your phone ring for you to answer before routing to your AI assistant?
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RING_TIMES.map((rt) => (
                <button
                  key={rt.seconds}
                  type="button"
                  onClick={() => setRingSeconds(rt.seconds)}
                  className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold transition ${
                    ringSeconds === rt.seconds
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-raised)]"
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Step 3: Activation Code & Actions */}
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-h)]">
              {carrier === "att_tmobile" ? "3" : "2"}
            </span>
            <h4 className="text-sm font-semibold text-[var(--color-text)]">
              {carrier === "landline_voip" || carrier === "google_voice"
                ? "Configuration instructions"
                : "Activate no-answer call forwarding"}
            </h4>
          </div>

          {carrier === "landline_voip" ? (
            <div className="mt-3 space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-xs leading-relaxed text-[var(--color-text)]">
              <p className="font-semibold text-sm">Landline &amp; VoIP Provider Setup</p>
              <p className="text-[var(--color-text-muted)]">
                Most office phone systems (Comcast Business, Spectrum Business, Vonage, RingCentral, 8x8) allow setting up <strong>Call Forwarding No Answer</strong> in their online admin portal:
              </p>
              <ol className="list-decimal space-y-1.5 pl-4 text-[var(--color-text-muted)]">
                <li>Log in to your VoIP provider’s portal (e.g. Comcast Business Voice, RingCentral Service Portal).</li>
                <li>Go to <strong>Call Handling</strong> or <strong>Inbound Call Routing</strong>.</li>
                <li>Find <strong>Call Forwarding No Answer / When Busy</strong>.</li>
                <li>Enter your AI receptionist number: <strong className="font-mono text-[var(--color-text)]">{currentPhone?.phoneNumber}</strong></li>
                <li>Set ring delay to <strong>20 seconds (4 rings)</strong> and click Save.</li>
              </ol>
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                <span className="text-[11px] text-[var(--color-text-muted)]">Target AI Number:</span>
                <button
                  type="button"
                  onClick={() => handleCopy(rawNumber, "AI phone number")}
                  className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-raised)]"
                >
                  Copy AI Number
                </button>
              </div>
            </div>
          ) : carrier === "google_voice" ? (
            <div className="mt-3 space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-xs leading-relaxed text-[var(--color-text)]">
              <p className="font-semibold text-sm">Google Voice Setup</p>
              <ol className="list-decimal space-y-1.5 pl-4 text-[var(--color-text-muted)]">
                <li>Open <strong>Google Voice Settings</strong> on the web or mobile app.</li>
                <li>Under <strong>Calls</strong>, select <strong>Forward calls to</strong>.</li>
                <li>Add or link your AI receptionist number: <strong className="font-mono text-[var(--color-text)]">{currentPhone?.phoneNumber}</strong>.</li>
                <li>Complete the quick verification code if prompted by Google.</li>
              </ol>
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                <span className="text-[11px] text-[var(--color-text-muted)]">Target AI Number:</span>
                <button
                  type="button"
                  onClick={() => handleCopy(rawNumber, "AI phone number")}
                  className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-raised)]"
                >
                  Copy AI Number
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    Dial this code from your phone
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-[var(--color-primary-h)] select-all">
                    {activationCode}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Dialing this code turns on conditional forwarding on no answer.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Android / Direct dial link */}
                  <a
                    href={encodedTelUri}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] shadow-sm"
                  >
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    Call to activate (Android)
                  </a>

                  {/* Copy Code (iOS / Keypad) */}
                  <button
                    type="button"
                    onClick={() => handleCopy(activationCode, "Activation code")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
                  >
                    {copiedCode === activationCode ? (
                      <>
                        <svg className="size-3.5 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="size-3.5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy code (iPhone)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* iPhone specific instruction callout */}
              <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                <span className="font-semibold text-[var(--color-text)]">iPhone user tip:</span> Apple blocks web links containing <code className="font-mono text-[var(--color-text)]">*</code> and <code className="font-mono text-[var(--color-text)]">#</code>. Tap <strong>Copy code</strong>, open your iPhone <strong>Phone app</strong> keypad, paste, and tap Call.
              </div>
            </div>
          )}
        </div>

        {/* Turn-off Code & Verification Section */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Turn Off Code */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-xs">
            <p className="font-semibold text-[var(--color-text)]">How to disconnect or turn off</p>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              You can turn off call forwarding anytime by dialing this cancel code from your phone:
            </p>
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <span className="font-mono text-sm font-bold text-[var(--color-text)]">
                {deactivationCode || "Per provider settings"}
              </span>
              {deactivationCode ? (
                <button
                  type="button"
                  onClick={() => handleCopy(deactivationCode, "Turn-off code")}
                  className="rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)] hover:bg-[var(--color-raised)]"
                >
                  {copiedCode === deactivationCode ? "Copied" : "Copy"}
                </button>
              ) : null}
            </div>
          </div>

          {/* Test Call Advice */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-xs">
            <p className="font-semibold text-[var(--color-text)]">How to test your setup</p>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              1. Call your business number from another phone (mobile or colleague&apos;s phone).
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              2. <strong>Do not answer your phone</strong> — let it ring out.
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              3. If set up properly, your AI receptionist will answer and greet the caller!
            </p>
          </div>
        </div>

        {/* Pro Tip on Carrier Voicemail */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-[var(--color-primary-h)] font-bold text-sm select-none" aria-hidden>💡</span>
            <div className="min-w-0">
              <p className="font-semibold text-[var(--color-text)]">Carrier Voicemail Tip</p>
              <p className="mt-0.5 text-[11px] leading-relaxed">
                If your personal carrier voicemail picks up before the AI answers, either choose a shorter ring time (e.g. 15s) or ask your carrier to extend your voicemail pickup delay so the AI has time to answer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

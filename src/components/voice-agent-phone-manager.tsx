"use client";

import Link from "next/link";
import { createPortal, useFormStatus } from "react-dom";
import { type ReactNode, useState, useEffect } from "react";
import type { RetellPhoneNumberStats } from "@/lib/retell-phone-analytics";
import type { OrgRetellPhoneNumber } from "@/lib/retell-phone-numbers";
import { VoiceAgentForwardingGuide } from "@/components/voice-agent-forwarding-guide";

function formatLineLabel(phone: OrgRetellPhoneNumber | RetellPhoneNumberStats): string {
  if (phone.nickname?.trim()) return phone.nickname.trim();
  if (phone.phoneNumberPretty?.trim()) return phone.phoneNumberPretty.trim();
  return phone.phoneNumber;
}

function PhonePanel({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">{eyebrow}</p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.015em] text-[var(--color-text)]">{title}</h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-4 lg:p-5">{children}</div>
    </section>
  );
}

export function VoiceAgentPhoneManager({
  organizationId,
  retellAgentId,
  retellApiConfigured,
  phones,
  phoneStats,
  onBuy,
  onAssign,
  onLink,
  onSetPrimary,
  onRefresh,
}: {
  organizationId: string;
  retellAgentId: string;
  retellApiConfigured: boolean;
  phones: OrgRetellPhoneNumber[];
  phoneStats: RetellPhoneNumberStats[];
  onBuy: (formData: FormData) => void | Promise<void>;
  onAssign: (formData: FormData) => void | Promise<void>;
  onLink: (formData: FormData) => void | Promise<void>;
  onSetPrimary: (formData: FormData) => void | Promise<void>;
  onRefresh: (formData: FormData) => void | Promise<void>;
}) {
  const statsByNumber = new Map(phoneStats.map((stat) => [stat.phoneNumber, stat]));
  const agentReady = Boolean(retellAgentId.trim());
  const callsReceived = phoneStats.reduce((sum, stat) => sum + stat.callsReceived, 0);
  const bookings = phoneStats.reduce((sum, stat) => sum + stat.bookingsCount, 0);
  const linkedLines = phones.filter((phone) => phone.retellAgentId === retellAgentId).length;

  const [mode, setMode] = useState<"buy" | "link">("buy");
  const [selectedForwardingPhone, setSelectedForwardingPhone] = useState<string | undefined>();
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showLegalModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLegalModal]);

  return (
    <section className="space-y-4">
      {!retellApiConfigured ? (
        <div className="vr-app-alert vr-app-alert-warning">
          Phone service is not configured yet. Contact your administrator to enable buying and managing support
          numbers.
        </div>
      ) : null}

      {retellApiConfigured && !agentReady ? (
        <div className="vr-app-alert vr-app-alert-warning flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Create and save your voice agent first, then you can add a phone number on this tab.
          </p>
          <Link
            href="/voice-agent?tab=agent"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
          >
            Set up voice agent
          </Link>
        </div>
      ) : null}

      <div className="grid overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Phone lines", value: phones.length, hint: phones.some((phone) => phone.isPrimary) ? "primary line selected" : "no primary line" },
          { label: "Agent linked", value: linkedLines, hint: `${Math.max(0, phones.length - linkedLines)} need assignment` },
          { label: "Calls received", value: callsReceived, hint: "last 30 days" },
          { label: "Bookings", value: bookings, hint: "completed by phone" },
        ].map((metric, index) => (
          <div key={metric.label} className={`min-w-0 bg-[var(--color-bg)] px-5 py-5 ${index < 3 ? "border-b border-[var(--color-border)] sm:border-r lg:border-b-0" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums text-[var(--color-text)]">{metric.value}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{metric.hint}</p>
          </div>
        ))}
      </div>

      <PhonePanel
        title="Active phone lines"
        description="Each number routes inbound calls to a voice agent. Activity covers the last 30 days."
        eyebrow="Line directory"
        action={
          retellApiConfigured && agentReady ? (
            <form action={onRefresh}>
              <input type="hidden" name="organization_id" value={organizationId} />
              <input type="hidden" name="retell_agent_id" value={retellAgentId} />
              <button
                type="submit"
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]"
              >
                Refresh lines
              </button>
            </form>
          ) : null
        }
      >
        {phones.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-center text-sm text-[var(--color-text-muted)]">
            <div>
            <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-lg text-[var(--color-primary-h)]" aria-hidden>☎</span>
            <p className="mt-3 font-semibold text-[var(--color-text)]">No phone lines yet</p>
            <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed">
              {retellApiConfigured
                ? agentReady
                  ? "Purchase a new phone number or link an existing support number below to start receiving calls."
                  : "Save your voice agent on the Agent setup tab first — then return here to buy or add a number."
                : "Phone service must be configured before you can add a support line."}
            </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
            {phones.map((phone) => {
              const stat = statsByNumber.get(phone.phoneNumber);
              const linkedToCurrentAgent = phone.retellAgentId === retellAgentId;
              return (
                <div key={phone.id} className="flex flex-wrap items-center gap-4 px-4 py-4 transition hover:bg-[var(--color-surface)]">
                  <div className="flex min-w-[13rem] flex-1 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-primary-h)]" aria-hidden>☎</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--color-text)]">{formatLineLabel(phone)}</p>
                        {phone.isPrimary ? <span className="rounded-full vr-app-status-success px-2 py-0.5 text-[10px] font-semibold">Primary</span> : null}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--color-text-muted)]">{phone.phoneNumber}</p>
                    </div>
                  </div>

                  <div className="grid min-w-[15rem] flex-1 grid-cols-3 divide-x divide-[var(--color-border)] rounded-xl bg-[var(--color-surface)] px-1 py-2 text-center">
                    {[
                      ["Received", stat?.callsReceived ?? 0],
                      ["Processed", stat?.callsProcessed ?? 0],
                      ["Booked", stat?.bookingsCount ?? 0],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="px-2">
                        <p className="text-sm font-semibold text-[var(--color-text)] tabular-nums">{value}</p>
                        <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-muted)]">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedForwardingPhone(phone.phoneNumber);
                        document.getElementById("call-forwarding-guide-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)] flex items-center gap-1.5"
                    >
                      <svg className="size-3.5 text-[var(--color-primary-h)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 0 1 5 5v3m0 0l-3-3m3 3l3-3M3 10l3-3M3 10l3 3" />
                      </svg>
                      Forwarding guide
                    </button>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${linkedToCurrentAgent ? "vr-app-status-success" : "vr-app-status-warning"}`}>
                      <span className={`size-1.5 rounded-full ${linkedToCurrentAgent ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]"}`} aria-hidden />
                      {linkedToCurrentAgent ? "Agent linked" : "Needs assignment"}
                    </span>
                    {!phone.isPrimary ? (
                      <form action={onSetPrimary}>
                        <input type="hidden" name="organization_id" value={organizationId} />
                        <input type="hidden" name="phone_number" value={phone.phoneNumber} />
                        <input type="hidden" name="retell_agent_id" value={retellAgentId} />
                        <button type="submit" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-raised)]">Set primary</button>
                      </form>
                    ) : null}
                    {!linkedToCurrentAgent ? (
                      <form action={onAssign}>
                        <input type="hidden" name="organization_id" value={organizationId} />
                        <input type="hidden" name="phone_number" value={phone.phoneNumber} />
                        <input type="hidden" name="retell_agent_id" value={retellAgentId} />
                        <button type="submit" className="rounded-xl bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]">Assign agent</button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PhonePanel>

      <div id="call-forwarding-guide-section">
        <VoiceAgentForwardingGuide
          phones={phones}
          defaultSelectedNumber={selectedForwardingPhone}
        />
      </div>

      {retellApiConfigured ? (
        <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(135deg,#0c0c0c_0%,#161616_55%,#222222_100%)] px-5 py-6 text-white lg:px-6">
            <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-24 left-20 size-40 rounded-full bg-white/5 blur-3xl" aria-hidden />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  New line
                </p>
                <div className="mt-2 inline-flex rounded-xl bg-white/10 p-0.5">
                  <button
                    type="button"
                    onClick={() => setMode("buy")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${mode === "buy" ? "bg-white text-neutral-900 shadow-sm" : "text-slate-300 hover:text-white"}`}
                  >
                    Buy a number
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("link")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${mode === "link" ? "bg-white text-neutral-900 shadow-sm" : "text-slate-300 hover:text-white"}`}
                  >
                    Link existing number
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!agentReady ? (
            <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)]">Voice agent required</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Finish Agent setup and save so we can route inbound calls to your AI agent. Then come back to
                  buy or add a number.
                </p>
              </div>
              <Link
                href="/voice-agent?tab=agent"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
              >
                Go to Agent setup
              </Link>
            </div>
          ) : mode === "buy" ? (
            <form action={onBuy} className="grid gap-0 lg:grid-cols-2">
              <div className="space-y-4 border-b border-[var(--color-border)] p-5 lg:border-b-0 lg:border-r lg:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  How purchasing works
                </p>
                <ol className="space-y-3">
                  {[
                    {
                      step: "1",
                      title: "Instant provisioning",
                      body: "We provision a dedicated US/Canada support number for your organization.",
                    },
                    {
                      step: "2",
                      title: "Voice agent linked",
                      body: "Incoming calls route automatically to your current voice agent.",
                    },
                    {
                      step: "3",
                      title: "Primary line configured",
                      body: "The number is immediately added to your directory and set as your primary line.",
                    },
                  ].map((item) => (
                    <li key={item.step} className="flex gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-h)]">
                        {item.step}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-semibold text-[var(--color-text)]">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">{item.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-xs text-[var(--color-primary-h)]" aria-hidden>
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </span>
                    <p className="text-xs font-semibold text-[var(--color-text)]">Regulatory &amp; Carrier Standards</p>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                    Provisioned numbers are assigned exclusively for legitimate inbound business reception. Strict adherence to TCPA, STIR/SHAKEN, and carrier anti-spam regulations is legally required.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-5 p-5 lg:p-6">
                <input type="hidden" name="organization_id" value={organizationId} />
                <input type="hidden" name="retell_agent_id" value={retellAgentId} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text)]">
                      Preferred area code <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                    </span>
                    <div className="flex items-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] transition focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]">
                      <span className="flex select-none items-center border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 font-mono text-xs font-semibold text-[var(--color-text-muted)]">
                        +1
                      </span>
                      <input
                        name="area_code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{3}"
                        maxLength={3}
                        className="w-full bg-transparent px-3 py-3 font-mono text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none"
                        placeholder="e.g. 415"
                      />
                    </div>
                    <span className="block text-[11px] text-[var(--color-text-muted)]">
                      3-digit US or Canada area code. Leave blank for any available region.
                    </span>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text)]">
                      Line nickname <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                    </span>
                    <input
                      name="nickname"
                      maxLength={80}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                      placeholder="e.g. Front desk"
                    />
                    <span className="block text-[11px] text-[var(--color-text-muted)]">
                      Friendly label for this line.
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-[11px] text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-4 shrink-0 items-center justify-center text-[var(--color-primary-h)]" aria-hidden>
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                    <p className="truncate leading-tight">
                      <strong className="text-[var(--color-text)]">US &amp; Canada (+1) only.</strong> For international lines,{" "}
                      <button
                        type="button"
                        onClick={() => setMode("link")}
                        className="font-semibold text-[var(--color-primary-h)] underline hover:opacity-80"
                      >
                        link an existing number
                      </button>.
                    </p>
                  </div>
                </div>

                {/* Compact Telephony Compliance Notice */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-500 text-[11px]" aria-hidden>
                        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      </span>
                      <p className="truncate font-semibold text-[var(--color-text)] text-xs">
                        Telephony Compliance &amp; Policy
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLegalModal(true)}
                      className="shrink-0 text-xs font-semibold text-[var(--color-primary-h)] underline hover:opacity-80"
                    >
                      Review policy
                    </button>
                  </div>

                  <label className="mt-2.5 flex items-start gap-2.5 pt-2.5 border-t border-[var(--color-border)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="telephony_terms_accepted"
                      id="telephony_terms_accepted"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 size-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] shrink-0 cursor-pointer"
                    />
                    <span className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                      I agree to the <button type="button" onClick={() => setShowLegalModal(true)} className="font-semibold text-[var(--color-text)] underline hover:text-[var(--color-primary-h)]">Telephony &amp; TCPA Policy</button>: inbound business reception only, zero-tolerance revocation for spam, and full liability for carrier fines.
                    </span>
                  </label>
                </div>

                <div className="mt-auto flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--color-text-muted)]">Will be set as your primary number upon agreement.</p>
                  <BuyPhoneSubmitButton />
                </div>
              </div>
            </form>
          ) : (
            <form action={onLink} className="grid gap-0 lg:grid-cols-2">
              <div className="space-y-4 border-b border-[var(--color-border)] p-5 lg:border-b-0 lg:border-r lg:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  How linking works
                </p>
                <ol className="space-y-3">
                  {[
                    {
                      step: "1",
                      title: "Enter number details",
                      body: "Provide the phone number you already own.",
                    },
                    {
                      step: "2",
                      title: "Agent is linked",
                      body: "We set up the call routing to your current voice agent.",
                    },
                    {
                      step: "3",
                      title: "Ready to use",
                      body: "The number will immediately appear in your active line directory.",
                    },
                  ].map((item) => (
                    <li key={item.step} className="flex gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-h)]">
                        {item.step}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-semibold text-[var(--color-text)]">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">{item.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-col gap-5 p-5 lg:p-6">
                <input type="hidden" name="organization_id" value={organizationId} />
                <input type="hidden" name="retell_agent_id" value={retellAgentId} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Phone number</span>
                    <input
                      name="phone_number"
                      required
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 font-mono text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                      placeholder="+1234567890"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Nickname</span>
                    <input
                      name="nickname"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                      placeholder="e.g. Front desk"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 text-xs text-[var(--color-text-muted)]">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex size-4 shrink-0 text-[var(--color-primary-h)]" aria-hidden>
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text)]">TCPA &amp; Telecom Compliance Notice</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">
                        Calls processed by your AI agent through linked numbers remain strictly subject to TCPA compliance and acceptable use terms. Telemarketing scams, automated cold-calling, and harassment are strictly prohibited.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--color-text-muted)]">This will set this number as primary.</p>
                  <LinkPhoneSubmitButton />
                </div>
              </div>
            </form>
          )}
        </section>
      ) : null}

      {showLegalModal && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
              onClick={() => setShowLegalModal(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="compliance-modal-title"
            >
              <div
                className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-[var(--color-border)] p-4 sm:p-5 bg-[var(--color-raised)]">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </span>
                    <div>
                      <h4 id="compliance-modal-title" className="text-base font-semibold text-[var(--color-text)]">
                        Telephony Compliance &amp; Policy
                      </h4>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Mandatory anti-abuse, TCPA, and carrier rules for phone lines
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLegalModal(false)}
                    className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition"
                    aria-label="Close"
                  >
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
                  <div className="space-y-2.5">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                      <p className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                        <span className="text-red-500 font-bold">•</span> Prohibited Conduct &amp; TCPA Compliance
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                        Telemarketing scams, automated robocalls, caller ID spoofing, debt harassment, or any violation of the Telephone Consumer Protection Act (TCPA, 47 U.S.C. § 227) are strictly forbidden.
                      </p>
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <p className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                        <span className="text-amber-500 font-bold">•</span> Immediate Revocation Without Refund
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                        We operate zero tolerance. Any line associated with spam reports, carrier traceback investigations, harassment, or unauthorized outbound calling will be revoked immediately without notice and without refund.
                      </p>
                    </div>

                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                      <p className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                        <span className="text-blue-500 font-bold">•</span> Legal Indemnity &amp; Carrier Fines
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                        You legally agree to hold our company harmless and assume 100% financial liability for all carrier traceback fines ($500–$1,500+ per violation) or statutory regulatory penalties resulting from misuse.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 space-y-2 text-[11px] text-[var(--color-text-muted)]">
                    <p className="font-semibold text-[var(--color-text)]">Regulatory Addendum:</p>
                    <p><strong>1. Permitted Purpose:</strong> Phone lines are assigned exclusively for legitimate inbound reception and appointment scheduling for your verified business.</p>
                    <p><strong>2. Carrier Traceback:</strong> Telecommunications carriers actively traceback spam. Upstream carrier reports result in immediate permanent disconnection.</p>
                    <p><strong>3. Hold Harmless:</strong> You agree to defend and indemnify the company against any legal fees, carrier fines, or government penalties arising from your number activity.</p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] p-4 bg-[var(--color-raised)]">
                  <button
                    type="button"
                    onClick={() => setShowLegalModal(false)}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTermsAccepted(true);
                      setShowLegalModal(false);
                    }}
                    className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] shadow-sm"
                  >
                    I Agree &amp; Accept Terms
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function LinkPhoneSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <>
          <svg className="size-4 animate-spin text-current" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Linking...
        </>
      ) : (
        "Link phone number"
      )}
    </button>
  );
}

function BuyPhoneSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
    >
      {pending ? (
        <>
          <svg className="size-4 animate-spin text-current" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Purchasing number...
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Buy phone number
        </>
      )}
    </button>
  );
}


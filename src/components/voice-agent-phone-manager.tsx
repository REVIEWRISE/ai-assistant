"use client";

import { type ReactNode, useEffect, useState } from "react";
import type { RetellPhoneNumberStats } from "@/lib/retell-phone-analytics";
import type { OrgRetellPhoneNumber } from "@/lib/retell-phone-numbers";
import { toast } from "@/lib/toast";

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

  useEffect(() => {
    if (retellApiConfigured && !agentReady) {
      toast.warning("Save your voice agent first — phone numbers must be linked to an agent for inbound calls.");
    }
  }, [retellApiConfigured, agentReady]);

  return (
    <section className="space-y-4">
      {!retellApiConfigured ? (
        <div className="vr-app-alert vr-app-alert-warning">
          Phone service is not configured yet. Contact your administrator to enable buying and managing support
          numbers.
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
            <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed">Buy a new US or Canada support number or link an existing one below to start receiving calls.</p>
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

      {retellApiConfigured && agentReady ? (
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

          {mode === "buy" ? (
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="space-y-4 border-b border-[var(--color-border)] p-5 lg:border-b-0 lg:border-r lg:p-6" aria-disabled="true">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  What happens next
                </p>
                <ol className="space-y-3">
                  {[
                    {
                      step: "1",
                      title: "Number is reserved",
                      body: "We pick the next available US or Canada support number.",
                    },
                    {
                      step: "2",
                      title: "Agent is linked",
                      body: "Inbound calls route to your current voice agent right away.",
                    },
                    {
                      step: "3",
                      title: "Ready for callers",
                      body: "The line appears in your directory and can be set as primary.",
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

              <div className="relative flex flex-col gap-5 p-5 lg:p-6" aria-disabled="true">
                <div
                  className="pointer-events-none absolute inset-0 z-10 bg-[color-mix(in_srgb,var(--color-surface)_45%,transparent)]"
                  aria-hidden
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Area code</span>
                    <input
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 font-mono text-sm text-[var(--color-text-muted)] opacity-70"
                      placeholder="Any"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text)]">Nickname</span>
                    <input
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 text-sm text-[var(--color-text-muted)] opacity-70"
                      placeholder="e.g. Front desk"
                    />
                  </label>
                </div>

                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Self-serve purchasing is not available yet. You can still manage existing lines above.
                </p>

                <div className="mt-auto flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--color-text-muted)]">We’ll notify you when buying goes live.</p>
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    Coming soon
                  </button>
                </div>
              </div>
            </div>
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
                      body: "Provide the Twilio/Retell phone number you already own.",
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

                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Make sure this number is configured in your Twilio/Retell account to route correctly.
                </p>

                <div className="mt-auto flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--color-text-muted)]">This will set this number as primary.</p>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
                  >
                    Link phone number
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      ) : null}
    </section>
  );
}


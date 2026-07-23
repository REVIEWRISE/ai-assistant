"use client";

import { useState, type ReactNode } from "react";
import type { RetellPhoneNumberStats } from "@/lib/retell-phone-analytics";
import type { OrgRetellPhoneNumber } from "@/lib/retell-phone-numbers";

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
  onLink,
  onAssign,
  onSetPrimary,
  onRefresh,
}: {
  organizationId: string;
  retellAgentId: string;
  retellApiConfigured: boolean;
  phones: OrgRetellPhoneNumber[];
  phoneStats: RetellPhoneNumberStats[];
  onBuy: (formData: FormData) => void | Promise<void>;
  onLink: (formData: FormData) => void | Promise<void>;
  onAssign: (formData: FormData) => void | Promise<void>;
  onSetPrimary: (formData: FormData) => void | Promise<void>;
  onRefresh: (formData: FormData) => void | Promise<void>;
}) {
  const [areaCode, setAreaCode] = useState("");
  const [buyNickname, setBuyNickname] = useState("");
  const [linkNumber, setLinkNumber] = useState("");
  const [linkNickname, setLinkNickname] = useState("");

  const statsByNumber = new Map(phoneStats.map((stat) => [stat.phoneNumber, stat]));
  const agentReady = Boolean(retellAgentId.trim());
  const callsReceived = phoneStats.reduce((sum, stat) => sum + stat.callsReceived, 0);
  const bookings = phoneStats.reduce((sum, stat) => sum + stat.bookingsCount, 0);
  const linkedLines = phones.filter((phone) => phone.retellAgentId === retellAgentId).length;

  return (
    <section className="space-y-4">
      {!retellApiConfigured ? (
        <div className="vr-app-alert vr-app-alert-warning">
          Phone service is not configured yet. Contact your administrator to enable buying and managing support
          numbers.
        </div>
      ) : !agentReady ? (
        <div className="vr-app-alert vr-app-alert-warning">
          Save your voice agent first — phone numbers must be linked to an agent for inbound calls.
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
        eyebrow="Line directory"
        title="Active phone lines"
        description="Each number routes inbound calls to a voice agent. Activity covers the last 30 days."
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
            <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed">Buy a new US or Canada support number, or link one already available on your voice account.</p>
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
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <PhonePanel
            eyebrow="New line"
            title="Buy a phone number"
            description="Get a new US or Canada support line and assign it automatically."
          >
            <form action={onBuy} className="space-y-4">
              <input type="hidden" name="organization_id" value={organizationId} />
              <input type="hidden" name="retell_agent_id" value={retellAgentId} />
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--color-text)]">Preferred area code (optional)</span>
                <input
                  name="area_code"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                  placeholder="415"
                  inputMode="numeric"
                  maxLength={3}
                />
                <p className="text-xs text-[var(--color-text-muted)]">
                  Enter 3 digits only (e.g. 415). Leave blank for any available number. Do not enter a full phone
                  number here.
                </p>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--color-text)]">Nickname (optional)</span>
                <input
                  name="nickname"
                  value={buyNickname}
                  onChange={(e) => setBuyNickname(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                  placeholder="Front desk"
                />
              </label>
              <div className="flex justify-end border-t border-[var(--color-border-muted)] pt-4">
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-h)]"
                >
                  Buy phone number
                </button>
              </div>
            </form>
          </PhonePanel>

          <PhonePanel eyebrow="Existing line" title="Link a phone number" description="Connect a support number already available on your voice account.">
            <form action={onLink} className="space-y-4">
              <input type="hidden" name="organization_id" value={organizationId} />
              <input type="hidden" name="retell_agent_id" value={retellAgentId} />
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--color-text)]">Full phone number</span>
                <input
                  name="phone_number"
                  value={linkNumber}
                  onChange={(e) => setLinkNumber(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                  placeholder="+15551234567"
                  type="tel"
                />
                <p className="text-xs text-[var(--color-text-muted)]">
                  Enter the complete number with country code (e.g. +15551234567). This is not an area code — use the
                  form on the left only when buying a new number.
                </p>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--color-text)]">Nickname (optional)</span>
                <input
                  name="nickname"
                  value={linkNickname}
                  onChange={(e) => setLinkNickname(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                  placeholder="Support line"
                />
              </label>
              <div className="flex justify-end border-t border-[var(--color-border-muted)] pt-4">
                <button
                  type="submit"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-raised)]"
                >
                  Link number
                </button>
              </div>
            </form>
          </PhonePanel>
        </div>
      ) : null}
    </section>
  );
}

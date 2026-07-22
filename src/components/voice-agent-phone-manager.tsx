"use client";

import { useState } from "react";
import { Panel } from "@/components/ui";
import type { RetellPhoneNumberStats } from "@/lib/retell-phone-analytics";
import type { OrgRetellPhoneNumber } from "@/lib/retell-phone-numbers";

function formatLineLabel(phone: OrgRetellPhoneNumber | RetellPhoneNumberStats): string {
  if (phone.nickname?.trim()) return phone.nickname.trim();
  if (phone.phoneNumberPretty?.trim()) return phone.phoneNumberPretty.trim();
  return phone.phoneNumber;
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

      <Panel
        title="Phone lines"
        subtitle="Each number routes inbound calls to a voice agent. Stats cover the last 30 days."
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
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text-muted)]">
            <p className="font-semibold text-[var(--color-text)]">No phone lines yet</p>
            <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed">Buy a new US or Canada support number, or link one already available on your voice account.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
            {phones.map((phone) => {
              const stat = statsByNumber.get(phone.phoneNumber);
              const linkedToCurrentAgent = phone.retellAgentId === retellAgentId;
              return (
                <div key={phone.id} className="flex flex-wrap items-center gap-4 px-3.5 py-3">
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
      </Panel>

      {retellApiConfigured && agentReady ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Buy a number"
            subtitle="Get a new US or Canada support line. A number is assigned automatically."
          >
            <form action={onBuy} className="space-y-3">
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
              <button
                type="submit"
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-h)]"
              >
                Buy phone number
              </button>
            </form>
          </Panel>

          <Panel title="Link existing number" subtitle="Connect a support number already on your account">
            <form action={onLink} className="space-y-3">
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
              <button
                type="submit"
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface)]"
              >
                Link number
              </button>
            </form>
          </Panel>
        </div>
      ) : null}
    </section>
  );
}

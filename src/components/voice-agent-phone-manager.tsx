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
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Phone service is not configured yet. Contact your administrator to enable buying and managing support
          numbers.
        </div>
      ) : null}

      {!agentReady ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Save your voice agent first — phone numbers must be linked to an agent for inbound calls.
        </div>
      ) : null}

      <Panel
        title="Your phone lines"
        subtitle="Each number routes inbound calls to a voice agent. Stats cover the last 30 days."
      >
        {phones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
            <p className="font-semibold text-[var(--color-text)]">No phone numbers yet</p>
            <p className="mt-1">Buy a new US or Canada support number, or link one you already own.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  <th className="px-3 py-2 font-semibold">Line</th>
                  <th className="px-3 py-2 font-semibold">Agent</th>
                  <th className="px-3 py-2 font-semibold">Received</th>
                  <th className="px-3 py-2 font-semibold">Processed</th>
                  <th className="px-3 py-2 font-semibold">Booked</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {phones.map((phone) => {
                  const stat = statsByNumber.get(phone.phoneNumber);
                  return (
                    <tr key={phone.id} className="border-b border-[var(--color-border-muted)]">
                      <td className="px-3 py-3 align-top">
                        <p className="font-semibold text-[var(--color-text)]">{formatLineLabel(phone)}</p>
                        <p className="mt-0.5 font-mono text-xs text-[var(--color-text-muted)]">{phone.phoneNumber}</p>
                        {phone.isPrimary ? (
                          <span className="mt-1 inline-block rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                            Primary
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-top font-mono text-xs text-[var(--color-text-muted)]">
                        {phone.retellAgentId || "—"}
                      </td>
                      <td className="px-3 py-3 align-top">{stat?.callsReceived ?? 0}</td>
                      <td className="px-3 py-3 align-top">{stat?.callsProcessed ?? 0}</td>
                      <td className="px-3 py-3 align-top">{stat?.bookingsCount ?? 0}</td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          {!phone.isPrimary ? (
                            <form action={onSetPrimary}>
                              <input type="hidden" name="organization_id" value={organizationId} />
                              <input type="hidden" name="phone_number" value={phone.phoneNumber} />
                              <input type="hidden" name="retell_agent_id" value={retellAgentId} />
                              <button
                                type="submit"
                                className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                              >
                                Set primary
                              </button>
                            </form>
                          ) : null}
                          {phone.retellAgentId !== retellAgentId ? (
                            <form action={onAssign}>
                              <input type="hidden" name="organization_id" value={organizationId} />
                              <input type="hidden" name="phone_number" value={phone.phoneNumber} />
                              <input type="hidden" name="retell_agent_id" value={retellAgentId} />
                              <button
                                type="submit"
                                className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                              >
                                Link to current agent
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {retellApiConfigured && agentReady ? (
          <form action={onRefresh} className="mt-4 flex justify-end">
            <input type="hidden" name="organization_id" value={organizationId} />
            <input type="hidden" name="retell_agent_id" value={retellAgentId} />
            <button
              type="submit"
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            >
              Refresh numbers
            </button>
          </form>
        ) : null}
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

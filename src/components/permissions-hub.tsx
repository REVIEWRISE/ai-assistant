"use client";

import { useState } from "react";
import { PermissionsManager } from "@/components/permissions-manager";
import { RolePermissionsManager } from "@/components/role-permissions-manager";

type PermissionsHubProps = {
  roleCount: number;
  memberCount: number;
  roleSection: React.ComponentProps<typeof RolePermissionsManager>;
  memberSection: React.ComponentProps<typeof PermissionsManager>;
};

type TabKey = "role" | "user";

const tabs: Array<{ key: TabKey; label: string; countKey: "roleCount" | "memberCount" }> = [
  { key: "role", label: "Role defaults", countKey: "roleCount" },
  { key: "user", label: "User overrides", countKey: "memberCount" },
];

export function PermissionsHub({
  roleCount,
  memberCount,
  roleSection,
  memberSection,
}: PermissionsHubProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("role");
  const counts = { roleCount, memberCount };

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--color-border)] px-4 py-4 lg:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          Policy
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">Menu permissions</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Role defaults apply broadly; user overrides take priority inside one organization.
        </p>
      </div>

      <div className="space-y-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 lg:px-5">
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text)]">Role defaults</span> set
          baseline access.{" "}
          <span className="font-semibold text-[var(--color-text)]">User overrides</span> replace
          the baseline for one member in one workspace.
        </p>

        <div
          className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
          role="tablist"
          aria-label="Permission rule type"
        >
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            const count = counts[tab.countKey];
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--color-bg)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    active
                      ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
                      : "bg-[var(--color-raised)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 lg:p-5">
        {activeTab === "role" ? (
          <RolePermissionsManager {...roleSection} embedded />
        ) : (
          <PermissionsManager {...memberSection} embedded />
        )}
      </div>
    </section>
  );
}

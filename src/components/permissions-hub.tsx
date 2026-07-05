"use client";

import { useState } from "react";
import { Panel } from "@/components/ui";
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
    <Panel
      title="Menu Permissions"
      subtitle="Role defaults apply everywhere; user overrides take priority in a specific organization"
    >
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        <p>
          <span className="font-semibold text-[var(--color-text)]">Role defaults</span> set baseline
          access from a user&apos;s role.{" "}
          <span className="font-semibold text-[var(--color-text)]">User overrides</span> replace those
          defaults for one member inside one organization.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            const count = counts[tab.countKey];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                    : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    active
                      ? "bg-[color-mix(in_srgb,var(--color-primary-fg)_18%,transparent)] text-[var(--color-primary-fg)]"
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

      <div className="mt-4">
        {activeTab === "role" ? (
          <RolePermissionsManager {...roleSection} embedded />
        ) : (
          <PermissionsManager {...memberSection} embedded />
        )}
      </div>
    </Panel>
  );
}

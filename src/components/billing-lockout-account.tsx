"use client";

import { useState } from "react";
import { CustomSelect } from "@/components/custom-select";

type OrganizationOption = {
  id: string;
  name: string;
};

export function BillingLockoutAccount({
  organizations,
  activeOrganizationId,
}: {
  organizations: OrganizationOption[];
  activeOrganizationId: string;
}) {
  const [switching, setSwitching] = useState(false);
  const hasOtherWorkspaces = organizations.length > 1;

  async function switchOrganization(organizationId: string) {
    if (!organizationId || organizationId === activeOrganizationId || switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/me/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) {
        setSwitching(false);
        return;
      }
      window.location.assign("/billing/expired");
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div className="space-y-3">
      {hasOtherWorkspaces ? (
        <div className="space-y-1.5">
          <p className="text-xs text-[var(--color-text-subtle)]">Switch workspace</p>
          <CustomSelect
            aria-label="Switch workspace"
            value={activeOrganizationId}
            disabled={switching}
            className="mt-0"
            options={organizations.map((org) => ({ value: org.id, label: org.name }))}
            onChange={(organizationId) => {
              void switchOrganization(organizationId);
            }}
          />
        </div>
      ) : null}
      <form action="/logout" method="POST">
        <button
          type="submit"
          className="text-xs font-semibold text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useWorkspaceSwitcher } from "@/components/workspace-switcher-context";
import type { DashboardWorkspaceChoice } from "@/lib/dashboard-data";

/** Past this many workspaces the list gets a search box and stops growing. */
const VISIBLE_LIMIT = 9;

const STATUS_CLASS: Record<string, string> = {
  Active: "vr-app-status-success",
  Trialing: "border border-transparent bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]",
  Expired: "vr-app-status-danger",
  "Needs plan": "vr-app-status-warning",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/** Shown in place of the module cards until a specific workspace is active. */
export function DashboardWorkspacePrompt({ workspaces }: { workspaces: DashboardWorkspaceChoice[] }) {
  const { switching, onSwitch } = useWorkspaceSwitcher();
  const [query, setQuery] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const showSearch = workspaces.length > VISIBLE_LIMIT;
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? workspaces.filter((workspace) => workspace.name.toLowerCase().includes(normalizedQuery))
    : workspaces;
  const visible = matches.slice(0, VISIBLE_LIMIT);

  return (
    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)] lg:p-6 [[data-theme=dark]_&]:border-[var(--color-border-hover)]">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
            Choose a workspace to see its activity
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
            Bookings, reviews, and calls are tracked per workspace.
          </p>
        </div>
        {workspaces.length > 0 ? (
          <Link
            href="/appointments/organization"
            className="shrink-0 py-1 text-sm font-semibold text-[var(--color-primary-h)] underline-offset-4 hover:underline"
          >
            Manage workspaces
          </Link>
        ) : null}
      </div>

      {showSearch ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspaces…"
          aria-label="Search workspaces"
          className="mt-4 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] sm:max-w-sm"
        />
      ) : null}

      {workspaces.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border-hover)] p-6 text-center">
          <p className="text-sm font-semibold text-[var(--color-text)]">No workspaces yet</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Create one to start tracking activity.</p>
          <Link
            href="/appointments/organization"
            className="mt-4 inline-flex rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-fill-h)]"
          >
            Create a workspace
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-5 text-sm text-[var(--color-text-muted)]">No workspaces match “{query.trim()}”.</p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((workspace) => {
            const opening = switching && openingId === workspace.id;
            return (
              <li key={workspace.id}>
                <button
                  type="button"
                  disabled={switching}
                  aria-busy={opening}
                  onClick={() => {
                    setOpeningId(workspace.id);
                    onSwitch(workspace.id);
                  }}
                  className="group flex h-full w-full items-center gap-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-left transition hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-wait disabled:opacity-60 [[data-theme=dark]_&]:border-[var(--color-border-hover)] [[data-theme=dark]_&]:bg-[var(--color-raised)]"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-fg)]" aria-hidden>
                    {initials(workspace.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--color-text)] [overflow-wrap:anywhere]">{workspace.name}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[workspace.status] ?? "vr-app-status-muted"}`}>
                        {workspace.status}
                      </span>
                      {workspace.planLabel ? (
                        <span className="text-xs text-[var(--color-text-muted)]">{workspace.planLabel}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-[var(--color-primary-h)]">
                    {opening ? (
                      "Opening…"
                    ) : (
                      <span className="inline-block transition-transform group-hover:translate-x-0.5" aria-hidden>
                        →
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {matches.length > VISIBLE_LIMIT ? (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Showing {VISIBLE_LIMIT} of {matches.length}. Search to find the rest.
        </p>
      ) : null}
    </section>
  );
}

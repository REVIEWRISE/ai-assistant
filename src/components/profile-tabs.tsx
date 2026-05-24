"use client";

import { useState } from "react";
import { Panel } from "@/components/ui";

type TabKey = "profile" | "security";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "profile", label: "Profile" },
  { key: "security", label: "Security" },
];

const fieldClass =
  "mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:bg-[var(--color-bg)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]";

const fieldReadOnlyClass =
  "mt-1 w-full cursor-not-allowed rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] px-3 py-2 text-sm text-[var(--color-text-muted)] outline-none";

type ProfileTabsProps = {
  fullName: string;
  email: string;
  roleName: string;
  onUpdateProfile: (formData: FormData) => void | Promise<void>;
  onUpdatePassword: (formData: FormData) => void | Promise<void>;
};

export function ProfileTabs({
  fullName,
  email,
  roleName,
  onUpdateProfile,
  onUpdatePassword,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" ? (
        <Panel title="Profile Details" subtitle="Basic account information">
          <form action={onUpdateProfile} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-[var(--color-text)]">
              Full name
              <input type="text" name="full_name" defaultValue={fullName} className={fieldClass} />
            </label>
            <label className="text-sm text-[var(--color-text)]">
              Work email
              <input type="email" name="email" defaultValue={email} className={fieldClass} />
            </label>
            <label className="text-sm text-[var(--color-text)] sm:col-span-2">
              Role
              <input
                type="text"
                defaultValue={roleName}
                readOnly
                aria-readonly="true"
                className={fieldReadOnlyClass}
              />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="w-full rounded-xl vr-btn-primary px-3 py-2 text-sm font-semibold">
                Update Profile
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {activeTab === "security" ? (
        <div className="space-y-4">
          <Panel title="Security" subtitle="Account access controls">
            <form action={onUpdatePassword} className="space-y-3 text-sm text-[var(--color-text)]">
              <label className="block">
                Current password
                <div className="relative mt-1">
                  <input
                    type={showCurrent ? "text" : "password"}
                    name="current_password"
                    placeholder="Enter current password"
                    className={`${fieldClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                  >
                    {showCurrent ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9.3 3.4 10.9 8-0.5 1.4-1.3 2.7-2.3 3.8" />
                        <path d="M6.2 6.2C4 7.7 2.4 9.7 1.1 12c1.9 4.6 6.2 8 10.9 8 1.6 0 3.2-0.4 4.6-1" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1.1 12C3 7.4 7.3 4 12 4s9 3.4 10.9 8c-1.9 4.6-6.2 8-10.9 8s-9-3.4-10.9-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
              <label className="block">
                New password
                <div className="relative mt-1">
                  <input
                    type={showNew ? "text" : "password"}
                    name="new_password"
                    placeholder="Enter new password"
                    className={`${fieldClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((prev) => !prev)}
                    aria-label={showNew ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                  >
                    {showNew ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9.3 3.4 10.9 8-0.5 1.4-1.3 2.7-2.3 3.8" />
                        <path d="M6.2 6.2C4 7.7 2.4 9.7 1.1 12c1.9 4.6 6.2 8 10.9 8 1.6 0 3.2-0.4 4.6-1" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1.1 12C3 7.4 7.3 4 12 4s9 3.4 10.9 8c-1.9 4.6-6.2 8-10.9 8s-9-3.4-10.9-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
              <label className="block">
                Confirm new password
                <div className="relative mt-1">
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirm_password"
                    placeholder="Re-enter new password"
                    className={`${fieldClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                  >
                    {showConfirm ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9.3 3.4 10.9 8-0.5 1.4-1.3 2.7-2.3 3.8" />
                        <path d="M6.2 6.2C4 7.7 2.4 9.7 1.1 12c1.9 4.6 6.2 8 10.9 8 1.6 0 3.2-0.4 4.6-1" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1.1 12C3 7.4 7.3 4 12 4s9 3.4 10.9 8c-1.9 4.6-6.2 8-10.9 8s-9-3.4-10.9-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
              <button type="submit" className="w-full rounded-xl vr-btn-primary px-3 py-2 text-sm font-semibold">
                Update Password
              </button>
            </form>
          </Panel>
        </div>
      ) : null}
    </section>
  );
}

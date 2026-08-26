"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type TabKey = "profile" | "security";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "profile", label: "Personal information" },
  { key: "security", label: "Password & security" },
];

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]";

const fieldReadOnlyClass =
  "mt-1.5 w-full cursor-not-allowed rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] px-3 py-2.5 text-sm text-[var(--color-text-muted)] outline-none";

type ProfileTabsProps = {
  initials: string;
  fullName: string;
  email: string;
  roleName: string;
  organizationName: string;
  organizationCount: number;
  emailVerified: boolean;
  hasPassword: boolean;
  onUpdateProfile: (formData: FormData) => void | Promise<void>;
  onUpdatePassword: (formData: FormData) => void | Promise<void>;
};

function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-muted)] py-3 last:border-b-0">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="max-w-[65%] truncate text-right text-xs font-semibold text-[var(--color-text)]">
        {value}
      </span>
    </div>
  );
}

export function ProfileTabs({
  initials,
  fullName,
  email,
  roleName,
  organizationName,
  organizationCount,
  emailVerified,
  hasPassword,
  onUpdateProfile,
  onUpdatePassword,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <section
      id="profile-settings"
      className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between lg:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Preferences
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Account settings</h2>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
              {activeTab === "profile" ? "Profile" : "Security"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Switch between personal details and password security for this account.
          </p>
        </div>

        <div
          className="inline-flex max-w-full shrink-0 gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1"
          role="tablist"
          aria-label="Profile settings"
        >
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`profile-panel-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--color-surface)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 lg:p-5">
        {activeTab === "profile" ? (
          <div
            id="profile-panel-profile"
            role="tabpanel"
            className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]"
          >
            <form
              action={onUpdateProfile}
              className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]"
            >
              <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
                <h3 className="text-base font-semibold text-[var(--color-text)]">
                  Personal information
                </h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Update the name and email shown across your workspace.
                </p>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <label className="text-xs font-semibold text-[var(--color-text)]">
                  Full name
                  <input
                    type="text"
                    name="full_name"
                    defaultValue={fullName}
                    autoComplete="name"
                    required
                    className={fieldClass}
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--color-text)]">
                  Work email
                  <input
                    type="email"
                    name="email"
                    defaultValue={email}
                    autoComplete="email"
                    required
                    className={fieldClass}
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--color-text)] sm:col-span-2">
                  Account role
                  <input
                    type="text"
                    defaultValue={roleName}
                    readOnly
                    aria-readonly="true"
                    className={fieldReadOnlyClass}
                  />
                  <span className="mt-1.5 block text-[10px] font-normal leading-relaxed text-[var(--color-text-muted)]">
                    Roles are managed by an administrator through Access Control.
                  </span>
                </label>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-5">
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  Changes apply to your account immediately.
                </p>
                <SubmitButton>Save profile</SubmitButton>
              </div>
            </form>

            <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-sm font-bold text-[var(--color-primary-h)]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {fullName}
                  </p>
                  <p className="truncate text-[11px] text-[var(--color-text-muted)]">{email}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-[var(--color-border)]">
                <DetailRow label="Role" value={roleName} />
                <DetailRow label="Workspace" value={organizationName} />
                <DetailRow
                  label="Memberships"
                  value={`${organizationCount} ${organizationCount === 1 ? "workspace" : "workspaces"}`}
                />
                <DetailRow
                  label="Email"
                  value={emailVerified ? "Verified" : "Pending verification"}
                />
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === "security" ? (
          <div
            id="profile-panel-security"
            role="tabpanel"
            className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]"
          >
            <form
              action={onUpdatePassword}
              className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]"
            >
              <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
                <h3 className="text-base font-semibold text-[var(--color-text)]">
                  {hasPassword ? "Change password" : "Set a password"}
                </h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {hasPassword
                    ? "Confirm your current password before setting a new one."
                    : "You signed in with Google. Optionally set a password to also sign in with email."}
                </p>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                {hasPassword ? (
                <label className="text-xs font-semibold text-[var(--color-text)] sm:col-span-2">
                  Current password
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      name="current_password"
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      required
                      className={`${fieldClass} pr-16`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((prev) => !prev)}
                      aria-label={showCurrent ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--color-primary-h)] transition hover:bg-[var(--color-primary-soft)]"
                    >
                      {showCurrent ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                ) : null}
                <label className="text-xs font-semibold text-[var(--color-text)]">
                  New password
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      name="new_password"
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      minLength={12}
                      required
                      className={`${fieldClass} pr-16`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((prev) => !prev)}
                      aria-label={showNew ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--color-primary-h)] transition hover:bg-[var(--color-primary-soft)]"
                    >
                      {showNew ? "Hide" : "Show"}
                    </button>
                  </div>
                  <span className="mt-1.5 block font-normal text-[var(--color-text-muted)]">
                    At least 12 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.
                  </span>
                </label>
                <label className="text-xs font-semibold text-[var(--color-text)]">
                  Confirm new password
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      name="confirm_password"
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      required
                      className={`${fieldClass} pr-16`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--color-primary-h)] transition hover:bg-[var(--color-primary-soft)]"
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-5">
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  You’ll use the new password on your next sign-in.
                </p>
                <SubmitButton>Update password</SubmitButton>
              </div>
            </form>

            <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-h)]">
                Password guidance
              </p>
              <h3 className="mt-2 text-sm font-semibold text-[var(--color-text)]">
                Keep your account protected
              </h3>
              <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                <li className="flex gap-2">
                  <span
                    className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                    aria-hidden
                  />
                  Use a password you don’t use on another service.
                </li>
                <li className="flex gap-2">
                  <span
                    className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                    aria-hidden
                  />
                  Combine several words, numbers, and symbols.
                </li>
                <li className="flex gap-2">
                  <span
                    className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]"
                    aria-hidden
                  />
                  Never share your password with workspace members.
                </li>
              </ul>
              <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Signed in as
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text)]">
                  {email}
                </p>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
}

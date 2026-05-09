"use client";

import { useState } from "react";
import { Panel } from "@/components/ui";

type TabKey = "profile" | "security";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "profile", label: "Profile" },
  { key: "security", label: "Security" },
];

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
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
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
            <label className="text-sm text-slate-700">
              Full name
              <input
                type="text"
                name="full_name"
                defaultValue={fullName}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-amber-300 transition focus:bg-white focus:ring"
              />
            </label>
            <label className="text-sm text-slate-700">
              Work email
              <input
                type="email"
                name="email"
                defaultValue={email}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none ring-amber-300 transition focus:bg-white focus:ring"
              />
            </label>
            <label className="text-sm text-slate-700 sm:col-span-2">
              Role
              <input
                type="text"
                defaultValue={roleName}
                readOnly
                aria-readonly="true"
                className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 outline-none"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Update Profile
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {activeTab === "security" ? (
        <div className="space-y-4">
          <Panel title="Security" subtitle="Account access controls">
            <form action={onUpdatePassword} className="space-y-3 text-sm text-slate-700">
              <label className="block">
                Current password
                <div className="relative mt-1">
                  <input
                    type={showCurrent ? "text" : "password"}
                    name="current_password"
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 pr-10 text-sm outline-none ring-amber-300 transition focus:bg-white focus:ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:text-slate-900"
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
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 pr-10 text-sm outline-none ring-amber-300 transition focus:bg-white focus:ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((prev) => !prev)}
                    aria-label={showNew ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:text-slate-900"
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
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 pr-10 text-sm outline-none ring-amber-300 transition focus:bg-white focus:ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:text-slate-900"
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
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Update Password
              </button>
            </form>
          </Panel>
        </div>
      ) : null}

    </section>
  );
}

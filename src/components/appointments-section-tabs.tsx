"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, Fragment, useContext, type ReactNode } from "react";
import { APPOINTMENT_SECTION_TABS, type AppointmentSectionTab } from "@/lib/appointment-section-tabs";

const AllowedTabsContext = createContext<string[] | null>(null);

/** Provided by `appointments/layout.tsx` with the tab keys this user may open. */
export function AppointmentsSectionTabsProvider({
  allowedKeys,
  children,
}: {
  allowedKeys: string[];
  children: ReactNode;
}) {
  return <AllowedTabsContext.Provider value={allowedKeys}>{children}</AllowedTabsContext.Provider>;
}

function isTabActive(tab: AppointmentSectionTab, pathname: string, overviewTab: string): boolean {
  if (pathname !== tab.path && !pathname.startsWith(`${tab.path}/`)) return false;
  return tab.overviewTab ? tab.overviewTab === overviewTab : true;
}

/** One tab bar for the whole Appointment Agent area — same look as Reviews and Voice tabs. */
export function AppointmentsSectionTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allowedKeys = useContext(AllowedTabsContext);
  const overviewTab = searchParams.get("tab") ?? "booked";
  const tabs = allowedKeys
    ? APPOINTMENT_SECTION_TABS.filter((tab) => allowedKeys.includes(tab.key))
    : APPOINTMENT_SECTION_TABS;

  if (tabs.length < 2) return null;

  return (
    <nav
      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
      aria-label="Appointment Agent sections"
    >
      {tabs.map((tab, index) => {
        const active = isTabActive(tab, pathname, overviewTab);
        const startsGroup = index > 0 && tabs[index - 1].group !== tab.group;
        return (
          <Fragment key={tab.key}>
            {startsGroup ? (
              <span className="mx-1 h-5 w-px shrink-0 bg-[var(--color-border)]" aria-hidden />
            ) : null}
            <Link
              href={tab.href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-[var(--color-bg)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
              }`}
            >
              {tab.label}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}

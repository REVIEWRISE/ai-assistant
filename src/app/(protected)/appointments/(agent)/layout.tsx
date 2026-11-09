import type { ReactNode } from "react";
import { AppointmentAgentHero } from "@/components/appointment-agent-hero";
import { AppointmentsSectionTabs, AppointmentsSectionTabsProvider } from "@/components/appointments-section-tabs";
import { getAllowedMenuPathsForUser } from "@/lib/allowed-menu-paths";
import { APPOINTMENT_SECTION_TABS } from "@/lib/appointment-section-tabs";
import { requireSession } from "@/lib/auth-session";
import { isHrefAllowedForNav } from "@/lib/nav-access";

/** Appointment Agent shell: one hero and one tab bar shared by every tab, like Reviews and Voice. */
export default async function AppointmentsLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const allowed = await getAllowedMenuPathsForUser(session.userId, session.activeOrganizationId);
  const allowedKeys = APPOINTMENT_SECTION_TABS.filter((tab) => isHrefAllowedForNav(tab.path, allowed)).map(
    (tab) => tab.key,
  );

  return (
    <AppointmentsSectionTabsProvider allowedKeys={allowedKeys}>
      <div className="mx-auto max-w-[92rem] space-y-5">
        {session.activeOrganizationId ? (
          <AppointmentAgentHero userId={session.userId} organizationId={session.activeOrganizationId} />
        ) : null}
        <AppointmentsSectionTabs />
        {children}
      </div>
    </AppointmentsSectionTabsProvider>
  );
}

import { redirect } from "next/navigation";
import { getAllowedMenuPathsForUser } from "@/lib/allowed-menu-paths";
import { APPOINTMENT_SECTION_TABS } from "@/lib/appointment-section-tabs";
import { requireSession } from "@/lib/auth-session";
import { isHrefAllowedForNav } from "@/lib/nav-access";

/** The Appointment Agent is tab-based: the sidebar entry always opens the first tab this user can open. */
export default async function AppointmentsPage() {
  const session = await requireSession();
  const allowed = await getAllowedMenuPathsForUser(session.userId, session.activeOrganizationId);
  const first = APPOINTMENT_SECTION_TABS.find((tab) => isHrefAllowedForNav(tab.path, allowed));
  redirect(first?.href ?? "/dashboard");
}

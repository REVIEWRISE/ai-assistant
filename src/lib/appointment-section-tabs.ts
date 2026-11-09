export type AppointmentSectionTab = {
  key: string;
  label: string;
  /** Route (and menu-permission path) the tab lives on. */
  path: string;
  href: string;
  /** Operate = day-to-day work; configure = one-time setup. Rendered as two groups. */
  group: "operate" | "configure";
  /** For tabs inside /appointments/overview: the `?tab=` value. */
  overviewTab?: "integrations" | "booked" | "analytics";
};

export const APPOINTMENT_SECTION_TABS: AppointmentSectionTab[] = [
  { key: "booked", label: "Bookings", path: "/appointments/overview", href: "/appointments/overview?tab=booked", group: "operate", overviewTab: "booked" },
  { key: "analytics", label: "Performance", path: "/appointments/overview", href: "/appointments/overview?tab=analytics", group: "operate", overviewTab: "analytics" },
  { key: "integrations", label: "Integrations", path: "/appointments/overview", href: "/appointments/overview?tab=integrations", group: "operate", overviewTab: "integrations" },
  { key: "knowledge-base", label: "Knowledge base", path: "/appointments/knowledge-base", href: "/appointments/knowledge-base", group: "configure" },
  { key: "chatbot", label: "Chatbot", path: "/appointments/chatbot", href: "/appointments/chatbot", group: "configure" },
];

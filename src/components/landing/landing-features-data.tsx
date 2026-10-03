import type { ReactNode } from "react";
import { IconCalendar, IconLeads, IconReviews } from "@/components/landing/landing-icons";

export type LandingFeature = {
  title: string;
  desc: string;
  icon: ReactNode;
  tag: string;
  badge: string;
  previewType: "reviews" | "calendar" | "leads" | "guardrails";
  highlights: string[];
};

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: "Autonomous Review & Reputation Agent",
    desc: "Drafts hyper-personalized replies on Google and Yelp matching your brand voice, with smart escalation rules for sensitive feedback.",
    icon: <IconReviews />,
    tag: "Reputation Intelligence",
    badge: "5x Faster Responses",
    previewType: "reviews",
    highlights: [
      "Custom brand voice & tone matching",
      "Instant sentiment & star-rating classification",
      "Automatic escalation for low reviews & critical keywords",
      "Multi-channel inbox with 1-click publishing",
    ],
  },
  {
    title: "Zero-Conflict Smart Booking & Scheduling",
    desc: "Connects directly to your Google, Outlook, and Calendly calendars. Books qualified clients without double-booking or manual email back-and-forth.",
    icon: <IconCalendar />,
    tag: "Scheduling Autopilot",
    badge: "0 Double Bookings",
    previewType: "calendar",
    highlights: [
      "Bi-directional calendar synchronization",
      "Timezone-aware conflict detection",
      "Automated SMS/Email confirmations & reminders",
      "Intelligent staff routing based on service type",
    ],
  },
  {
    title: "24/7 High-Intent Lead Capture & Pipeline",
    desc: "Captures visitors from website forms and social channels, qualifies buyer intent in seconds, and converts questions into scheduled appointments.",
    icon: <IconLeads />,
    tag: "Conversion Engine",
    badge: "100% Inbound Coverage",
    previewType: "leads",
    highlights: [
      "Sub-minute initial response SLA",
      "Automated qualification & budget scoring",
      "Seamless CRM & webhook data dispatch",
      "Automated follow-up sequences for warm prospects",
    ],
  },
];

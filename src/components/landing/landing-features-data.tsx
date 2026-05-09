import type { ReactNode } from "react";
import { IconCalendar, IconLeads, IconReviews } from "@/components/landing/landing-icons";

export type LandingFeature = {
  title: string;
  desc: string;
  icon: ReactNode;
  className: string;
  label: string;
  highlights: string[];
};

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: "Review Response Agent",
    desc: "Auto-drafts high-quality responses in your exact tone, with escalation rules for sensitive feedback.",
    icon: <IconReviews />,
    className: "",
    label: "Reputation",
    highlights: ["Voice & tone matching", "Escalation on sensitive topics", "Multi-channel inbox"],
  },
  {
    title: "Scheduling & appointments",
    desc: "Syncs calendar providers, prevents double-bookings, and routes edge cases to your team instantly.",
    icon: <IconCalendar />,
    className: "",
    label: "Scheduling",
    highlights: ["Real-time calendar sync", "Double-booking guardrails", "Staff handoff when needed"],
  },
  {
    title: "Lead Capture Agent",
    desc: "Captures web and social inquiries, qualifies intent, and turns prospects into confirmed appointments.",
    icon: <IconLeads />,
    className: "md:col-span-2 lg:col-span-1",
    label: "Pipeline",
    highlights: ["Intent qualification", "Instant follow-up drafts", "Booking-ready handoff"],
  },
];

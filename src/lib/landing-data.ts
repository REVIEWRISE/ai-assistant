export const LANDING_INTEGRATIONS = [
  "Google Business Profile",
  "Yelp",
  "Facebook Reviews",
  "Google Calendar",
  "Outlook Calendar",
  "Calendly",
] as const;

export const LANDING_TRUSTED_BY = [
  "Habesha Food",
  "Liya Cookies",
  "Nazaret Market",
] as const;

export const LANDING_FAQ = [
  {
    q: "Do we need to replace our existing booking stack?",
    paragraphs: [
      "No—it is built to sit alongside what you already use. Connect your calendars and booking tools so customers keep scheduling the same way while your team gets automation, guardrails, and one place to see what is happening.",
      "That means you can roll out agents location by location, keep your existing POS or scheduling stack, and only change tools when you are ready—not because our product forced a migration.",
    ],
  },
  {
    q: "Can we review responses before posting?",
    paragraphs: [
      "Yes. You stay in control of what goes live. You can turn on approval for sensitive situations—like low star ratings, certain keywords, or specific channels—while letting routine replies go out automatically.",
      "Managers get a clear queue, context from the original review, and suggested drafts in your tone. Nothing posts until your rules say it can, and you can tighten or relax those rules over time.",
    ],
  },
  {
    q: "How quickly can we launch?",
    paragraphs: [
      "Most teams get a first version running quickly: connect your channels, set brand and escalation rules, and you are already covering reviews, appointments, and leads from one workspace. Many locations finish initial setup and policy configuration in well under an hour.",
      "Going deeper—more locations, stricter approval paths, or custom handoffs—can follow in phases. We help you start with a tight scope so you see value fast, then expand without redoing the foundation.",
    ],
  },
] as const;

export const LANDING_TESTIMONIALS = [
  {
    quote:
      "Our inbox used to pile up after busy weekends—now review replies and catering questions get answered the same day. Regulars definitely notice.",
    name: "Helen T.",
    role: "Owner, Habesha Food",
  },
  {
    quote:
      "Pre-order and pickup messages finally stay in one place. We respond faster during holiday rushes without living on our phones.",
    name: "Liya A.",
    role: "Founder, Liya Cookies",
  },
  {
    quote:
      "Shoppers ask about hours and specials all day—the agent handles the routine questions so our team can stay on the floor.",
    name: "Samuel K.",
    role: "Manager, Nazaret Market",
  },
] as const;

export type LandingPlan = {
  title: string;
  price: string;
  period: string;
  items: string[];
  featured?: boolean;
};

export const LANDING_PLANS: LandingPlan[] = [
  {
    title: "Starter",
    price: "$49",
    period: "/mo",
    items: [
      "Review reply + appointment workflows",
      "1 location",
      "Google Calendar & Outlook sync",
      "Brand tone + basic playbooks",
      "Dashboard: response time & bookings",
      "Email support",
    ],
  },
  {
    title: "Growth",
    price: "$99",
    period: "/mo",
    items: [
      "Everything in Starter",
      "Lead capture agent + qualification",
      "Team roles & location permissions",
      "Approval queues for sensitive replies",
      "Escalation rules & coverage alerts",
      "Shared inbox across channels",
      "Chat + email support",
    ],
    featured: true,
  },
  {
    title: "Multi-location",
    price: "$199",
    period: "/mo",
    items: [
      "Unlimited locations",
      "Roll-up & per-location analytics",
      "Cross-location policies & templates",
      "Priority support & faster onboarding",
      "Bulk updates across locations",
      "Export-ready reporting",
      "Optional API & webhooks",
    ],
  },
];

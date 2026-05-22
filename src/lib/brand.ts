export const BRAND_NAME = "VyntRise";
export const PRODUCT_NAME = "VyntRise Agent";
export const CONTACT_EMAIL = "hello@vyntrise.com";
export const CONTACT_PHONE = "+1 (571) 484-3141";
export const CONTACT_PHONE_TEL = "+15714843141";
export const MAIN_SITE_URL = "https://vyntrise.com";

export type MainNavLink = {
  label: string;
  href: string;
  external?: boolean;
  badge?: string;
};

export const MAIN_NAV_SERVICES = [
  { label: "AI Search & Reputation", href: `${MAIN_SITE_URL}/services/ai-search` },
  { label: "Intelligent Automation", href: `${MAIN_SITE_URL}/services/intelligent-automation` },
  { label: "Custom Software", href: `${MAIN_SITE_URL}/services/custom-software` },
  { label: "Data & Analytics", href: `${MAIN_SITE_URL}/services/data-analytics` },
  { label: "Digital Marketing", href: `${MAIN_SITE_URL}/services/digital-marketing` },
] as const;

export const MAIN_NAV_RESOURCES = [
  { label: "Blog", href: `${MAIN_SITE_URL}/blog` },
  { label: "About", href: `${MAIN_SITE_URL}/about` },
  { label: "Contact", href: `${MAIN_SITE_URL}/contact` },
] as const;

export const MAIN_NAV_LINKS: MainNavLink[] = [
  { label: "Work", href: `${MAIN_SITE_URL}/work` },
  { label: "About", href: `${MAIN_SITE_URL}/about` },
  {
    label: "SEO Analyzer",
    href: "https://seo-analyzer.vyntrise.com/",
    external: true,
    badge: "FREE",
  },
];
